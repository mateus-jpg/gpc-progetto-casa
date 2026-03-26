'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { logDataCreate, logFileAccess, logDataDelete } from '@/utils/audit';
import { invalidateStructureFilesCache } from '@/lib/cache';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

function validateFile(file, maxSizeMB = 10) {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (!file || !file.name) throw new Error('Invalid file');
  if (file.size > maxSize) throw new Error(`File size exceeds ${maxSizeMB}MB limit`);

  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
  ];

  if (!allowedTypes.includes(file.type)) throw new Error(`File type ${file.type} not allowed`);
  return true;
}

function generateStructureFilePath(structureId, filename) {
  const ext = path.extname(filename);
  const uuid = uuidv4();
  const timestamp = Date.now();
  return `structure-files/${structureId}/${timestamp}_${uuid}${ext}`;
}

async function uploadToStorage(filePath, fileBuffer, contentType) {
  const bucket = adminStorage.bucket();
  const buffer = fileBuffer instanceof ArrayBuffer ? Buffer.from(fileBuffer) : fileBuffer;
  await bucket.file(filePath).save(buffer, {
    metadata: { contentType, uploadedAt: new Date().toISOString() },
  });
  return filePath;
}

/**
 * Upload file(s) to a structure
 *
 * @param {Object} params
 * @param {string} params.structureId - Required: Structure ID
 * @param {Array} params.files - Array of file objects {name, type, size, buffer, displayName?}
 * @param {string} params.folderId - Target folder ID (null = auto-create or root)
 * @param {string[]} params.tags - Optional custom tags
 * @param {string} params.expirationDate - Optional expiration date ISO string
 */
export async function uploadStructureFiles({
  structureId,
  files,
  folderId = null,
  tags = [],
  expirationDate = null,
}) {
  try {
    const { userUid, headers } = await requireUser();
    const userEmail = headers.get('x-user-email');
    await verifyUserPermissions({ userUid, structureId });

    // Resolve target folder
    let targetFolderId = folderId;

    if (!targetFolderId) {
      // Find or create a default "Documenti" root folder
      const folderQuery = await adminDb.collection('structureFolders')
        .where('structureId', '==', structureId)
        .where('nome', '==', 'Documenti')
        .where('deleted', '==', false)
        .limit(1)
        .get();

      if (!folderQuery.empty) {
        targetFolderId = folderQuery.docs[0].id;
      } else {
        const newFolder = await adminDb.collection('structureFolders').add({
          nome: 'Documenti',
          structureId,
          parentFolderId: null,
          path: '/Documenti',
          depth: 0,
          isDefaultCategory: true,
          category: null,
          createdAt: new Date(),
          createdBy: userUid,
          createdByEmail: userEmail,
          updatedAt: new Date(),
          deleted: false,
          deletedAt: null,
          deletedBy: null,
        });
        targetFolderId = newFolder.id;
      }
    } else {
      // Verify folder belongs to this structure
      const folderDoc = await adminDb.collection('structureFolders').doc(targetFolderId).get();
      if (!folderDoc.exists || folderDoc.data().deleted) throw new Error('Target folder not found');
      if (folderDoc.data().structureId !== structureId) throw new Error('Folder does not belong to this structure');
    }

    if (!files || !Array.isArray(files) || files.length === 0) throw new Error('No files provided');

    const uploadedFiles = [];

    for (const file of files) {
      try {
        validateFile(file);
        const filePath = generateStructureFilePath(structureId, file.name);
        await uploadToStorage(filePath, file.buffer, file.type);

        const fileData = {
          nome: file.displayName || file.name,
          nomeOriginale: file.name,
          tipo: file.type,
          dimensione: file.size,
          path: filePath,
          structureId,
          folderId: targetFolderId,
          tags: tags || [],
          dataDocumento: file.documentDate ? new Date(file.documentDate) : null,
          dataCreazione: new Date(),
          dataScadenza: file.expirationDate ? new Date(file.expirationDate) : expirationDate ? new Date(expirationDate) : null,
          uploadedBy: userUid,
          uploadedByEmail: userEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          deletedAt: null,
          deletedBy: null,
          lastAccessedAt: null,
          accessCount: 0,
        };

        const docRef = await adminDb.collection('structureFiles').add(fileData);

        await logDataCreate({
          actorUid: userUid,
          resourceType: 'structureFile',
          resourceId: docRef.id,
          structureId,
          details: { fileName: file.name, fileSize: file.size },
        });

        uploadedFiles.push({ id: docRef.id, ...fileData });
      } catch (fileErr) {
        console.error(`[STRUCTURE_FILE_UPLOAD_ERROR] ${file.name}:`, fileErr);
        uploadedFiles.push({ name: file.name, error: true, message: fileErr.message });
      }
    }

    invalidateStructureFilesCache(structureId);

    return {
      success: true,
      files: uploadedFiles,
      uploadedCount: uploadedFiles.filter(f => !f.error).length,
      errorCount: uploadedFiles.filter(f => f.error).length,
    };
  } catch (err) {
    console.error('[UPLOAD_STRUCTURE_FILES_ERROR]:', err);
    return { error: true, message: err.message };
  }
}

/**
 * Get a signed download URL for a structure file
 * @param {string} fileId - File document ID
 */
export async function getStructureFileUrl(fileId) {
  try {
    const { userUid } = await requireUser();

    const fileDoc = await adminDb.collection('structureFiles').doc(fileId).get();
    if (!fileDoc.exists) throw new Error('File not found');
    const fileData = fileDoc.data();
    if (fileData.deleted) throw new Error('File not found');

    await verifyUserPermissions({ userUid, structureId: fileData.structureId });

    const bucket = adminStorage.bucket();
    const originalName = fileData.nomeOriginale || fileData.nome;
    const [url] = await bucket.file(fileData.path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 3600000,
      responseDisposition: `attachment; filename="${originalName}"`,
    });

    await adminDb.collection('structureFiles').doc(fileId).update({
      lastAccessedAt: new Date(),
      accessCount: admin.firestore.FieldValue.increment(1),
    });

    await logFileAccess({
      actorUid: userUid,
      resourceId: fileData.structureId,
      filePath: fileData.path,
      details: { fileId, fileName: fileData.nome },
    });

    return {
      success: true,
      url,
      file: {
        id: fileDoc.id,
        nome: fileData.nome,
        nomeOriginale: fileData.nomeOriginale,
        tipo: fileData.tipo,
        dimensione: fileData.dimensione,
      },
    };
  } catch (err) {
    console.error('[GET_STRUCTURE_FILE_URL_ERROR]:', err);
    return { error: true, message: err.message };
  }
}

/**
 * Soft delete a structure file
 * @param {string} fileId - File document ID
 */
export async function deleteStructureFile(fileId) {
  try {
    const { userUid } = await requireUser();

    const fileDoc = await adminDb.collection('structureFiles').doc(fileId).get();
    if (!fileDoc.exists) throw new Error('File not found');
    const fileData = fileDoc.data();
    if (fileData.deleted) throw new Error('File already deleted');

    await verifyUserPermissions({ userUid, structureId: fileData.structureId });

    await adminDb.collection('structureFiles').doc(fileId).update({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userUid,
      updatedAt: new Date(),
    });

    invalidateStructureFilesCache(fileData.structureId);

    await logDataDelete({
      actorUid: userUid,
      resourceType: 'structureFile',
      resourceId: fileId,
      softDelete: true,
      details: { fileName: fileData.nome, structureId: fileData.structureId },
    });

    return { success: true, message: 'File deleted successfully' };
  } catch (err) {
    console.error('[DELETE_STRUCTURE_FILE_ERROR]:', err);
    return { error: true, message: err.message };
  }
}
