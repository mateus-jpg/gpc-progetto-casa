'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { getAnagraficaInternal } from '../anagrafica/anagrafica';
import { logDataCreate, logFileAccess, logDataDelete } from '@/utils/audit';
import { CACHE_TAGS, REVALIDATE, invalidateFilesCache } from '@/lib/cache';
import { createFolderInternal } from './folders';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/**
 * Validates file before upload
 */
function validateFile(file, maxSizeMB = 10) {
  const maxSize = maxSizeMB * 1024 * 1024;

  if (!file || !file.name) {
    throw new Error('Invalid file');
  }

  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Basic MIME type validation
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }

  return true;
}

/**
 * Generate secure storage path for file
 */
function generateFilePath(anagraficaId, filename, category = 'general') {
  const ext = path.extname(filename);
  const uuid = uuidv4();
  const timestamp = Date.now();

  return `files/${anagraficaId}/${category}/${timestamp}_${uuid}${ext}`;
}

/**
 * Upload file to storage
 * Internal function that handles the actual upload
 */
async function uploadToStorage(filePath, fileBuffer, contentType) {
  const bucket = adminStorage.bucket();

  // Convert ArrayBuffer to Node.js Buffer if needed
  const buffer = fileBuffer instanceof ArrayBuffer
    ? Buffer.from(fileBuffer)
    : fileBuffer;

  await bucket.file(filePath).save(buffer, {
    metadata: {
      contentType,
      uploadedAt: new Date().toISOString()
    }
  });

  return filePath;
}

/**
 * Create file document in Firestore
 * Internal function
 */
async function createFileDocument({
  anagraficaId,
  folderId,
  accessoId = null,
  filePath,
  originalName,
  displayName,
  mimeType,
  size,
  category = 'OTHER',
  tags = [],
  documentDate = null,
  expirationDate = null,
  structureIds,
  uploadedByStructure,
  userUid,
  userEmail
}) {
  const fileData = {
    // File Information
    nome: displayName || originalName,
    nomeOriginale: originalName,
    tipo: mimeType,
    dimensione: size,
    path: filePath,

    // Links
    anagraficaId,
    folderId,
    accessoId,
    category,
    tags: tags || [],

    // Dates
    dataDocumento: documentDate ? new Date(documentDate) : null,
    dataCreazione: new Date(),
    dataScadenza: expirationDate ? new Date(expirationDate) : null,

    // Access Control
    structureIds: structureIds || [],
    uploadedByStructure,

    // Metadata
    uploadedBy: userUid,
    uploadedByEmail: userEmail,
    createdAt: new Date(),
    updatedAt: new Date(),

    // Soft Delete
    deleted: false,
    deletedAt: null,
    deletedBy: null,

    // Access Tracking
    lastAccessedAt: null,
    accessCount: 0
  };

  const docRef = await adminDb.collection('files').add(fileData);

  return {
    id: docRef.id,
    ...fileData
  };
}

/**
 * Upload file(s) to an anagrafica record
 * Can be used independently or with accessi
 *
 * @param {Object} params
 * @param {string} params.anagraficaId - Required: Anagrafica ID
 * @param {Array} params.files - Array of file objects {name, type, size, buffer}
 * @param {string} params.folderId - Required: Target folder ID (NEW - preferred)
 * @param {string} params.accessoId - Optional: Link to specific accesso
 * @param {string} params.category - Optional: File category (DEPRECATED - for backward compatibility)
 * @param {string[]} params.tags - Optional: Custom tags
 * @param {string} params.expirationDate - Optional: Expiration date ISO string
 * @param {string} params.structureId - Structure uploading the file
 */
export async function uploadFiles({
  anagraficaId,
  files,
  folderId = null,
  accessoId = null,
  category = 'OTHER',
  tags = [],
  expirationDate = null,
  structureId
}) {
  try {
    // 1. AUTHENTICATION
    const { userUid, headers } = await requireUser();
    const userEmail = headers.get('x-user-email');

    // 2. VERIFY ACCESS TO ANAGRAFICA
    const anagraficaData = await getAnagraficaInternal(anagraficaId, userUid);
    const allowedStructures = anagraficaData.canBeAccessedBy || [];

    // Verify user has access through specified structure
    await verifyUserPermissions({
      userUid,
      structureId
    });

    // 3. RESOLVE TARGET FOLDER
    let targetFolderId = folderId;

    if (!targetFolderId) {
      // No folderId provided: find or create a folder by category name
      const folderName = category || 'Documenti';

      const folderQuery = await adminDb.collection('folders')
        .where('anagraficaId', '==', anagraficaId)
        .where('nome', '==', folderName)
        .where('deleted', '==', false)
        .limit(1)
        .get();

      if (!folderQuery.empty) {
        targetFolderId = folderQuery.docs[0].id;
      } else {
        const newFolderResult = await createFolderInternal({
          anagraficaId,
          nome: folderName,
          parentFolderId: null,
          structureId,
          userUid,
          userEmail
        });

        if (!newFolderResult.success) {
          throw new Error(`Failed to create folder: ${newFolderResult.message}`);
        }
        targetFolderId = newFolderResult.folder.id;
      }
    } else {
      // Verify folder exists and belongs to this anagrafica
      const folderDoc = await adminDb.collection('folders').doc(targetFolderId).get();

      if (!folderDoc.exists || folderDoc.data().deleted) {
        throw new Error('Target folder not found');
      }

      if (folderDoc.data().anagraficaId !== anagraficaId) {
        throw new Error('Folder does not belong to this anagrafica');
      }
    }

    // 4. VALIDATE FILES
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadedFiles = [];

    // 5. UPLOAD EACH FILE
    for (const file of files) {
      try {
        // Validate file
        validateFile(file);

        // Generate storage path
        const filePath = generateFilePath(anagraficaId, file.name, category);

        // Upload to storage
        await uploadToStorage(filePath, file.buffer, file.type);

        // Create Firestore document
        // Use per-file metadata if available, otherwise use global values
        const fileDoc = await createFileDocument({
          anagraficaId,
          folderId: targetFolderId,
          accessoId,
          filePath,
          originalName: file.name,
          displayName: file.displayName || file.name,
          mimeType: file.type,
          size: file.size,
          category,
          tags,
          documentDate: file.documentDate || null,
          expirationDate: file.expirationDate || expirationDate,
          structureIds: allowedStructures,
          uploadedByStructure: structureId,
          userUid,
          userEmail
        });

        // Audit log: file upload
        await logDataCreate({
          actorUid: userUid,
          resourceType: 'file',
          resourceId: fileDoc.id,
          structureId,
          details: {
            anagraficaId,
            accessoId,
            fileName: file.name,
            fileSize: file.size,
            category
          }
        });

        uploadedFiles.push(fileDoc);

      } catch (fileError) {
        console.error(`[FILE_UPLOAD_ERROR] ${file.name}:`, fileError);
        uploadedFiles.push({
          name: file.name,
          error: true,
          message: fileError.message
        });
      }
    }

    // 6. INVALIDATE CACHE
    invalidateFilesCache(anagraficaId);

    return {
      success: true,
      files: uploadedFiles,
      uploadedCount: uploadedFiles.filter(f => !f.error).length,
      errorCount: uploadedFiles.filter(f => f.error).length
    };

  } catch (error) {
    console.error('[UPLOAD_FILES_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Internal function to fetch files from database
 */
async function fetchFilesFromDb(anagraficaId, options = {}) {
  const { accessoId = null, folderId = null } = options;

  let query = adminDb.collection('files')
    .where('anagraficaId', '==', anagraficaId)
    .where('deleted', '==', false)
    .orderBy('createdAt', 'desc');

  // Optionally filter by accesso
  if (accessoId) {
    query = query.where('accessoId', '==', accessoId);
  }

  // Optionally filter by folder
  if (folderId) {
    query = query.where('folderId', '==', folderId);
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert Firestore timestamps to ISO strings
    dataDocumento: doc.data().dataDocumento?.toDate?.()?.toISOString() || doc.data().dataDocumento,
    dataCreazione: doc.data().dataCreazione?.toDate?.()?.toISOString() || doc.data().dataCreazione,
    dataScadenza: doc.data().dataScadenza?.toDate?.()?.toISOString() || doc.data().dataScadenza,
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    lastAccessedAt: doc.data().lastAccessedAt?.toDate?.()?.toISOString() || doc.data().lastAccessedAt
  }));
}

/**
 * Get files for an anagrafica (with optional filters)
 *
 * @param {string} anagraficaId - Anagrafica ID
 * @param {Object} options - Optional filters
 * @param {string} options.accessoId - Filter by accesso
 * @param {string} options.folderId - Filter by folder
 */
export async function getFiles(anagraficaId, options = {}) {
  try {
    // Support legacy signature: getFiles(anagraficaId, accessoId)
    if (typeof options === 'string') {
      options = { accessoId: options };
    }

    const { accessoId = null, folderId = null } = options;

    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. VERIFY ACCESS TO ANAGRAFICA
    await getAnagraficaInternal(anagraficaId, userUid);

    // 3. GET CACHED FILES
    const cacheKey = `${anagraficaId}-${accessoId || 'all'}-${folderId || 'all'}`;
    const getCachedFiles = unstable_cache(
      async () => fetchFilesFromDb(anagraficaId, options),
      ['files', cacheKey],
      {
        tags: [CACHE_TAGS.files(anagraficaId)],
        revalidate: REVALIDATE.files
      }
    );

    const files = await getCachedFiles();

    return {
      success: true,
      count: files.length,
      files
    };

  } catch (error) {
    console.error('[GET_FILES_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Get signed URL for file download
 *
 * @param {string} fileId - File document ID
 */
export async function getFileUrl(fileId) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. GET FILE DOCUMENT
    const fileDoc = await adminDb.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }

    const fileData = fileDoc.data();

    // Check soft delete
    if (fileData.deleted) {
      throw new Error('File not found');
    }

    // 3. VERIFY ACCESS TO ANAGRAFICA
    await getAnagraficaInternal(fileData.anagraficaId, userUid);

    // 4. GENERATE SIGNED URL
    const bucket = adminStorage.bucket();
    const originalName = fileData.nomeOriginale || fileData.nome;
    const [url] = await bucket.file(fileData.path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 3600000, // 1 hour
      responseDisposition: `attachment; filename="${originalName}"`
    });

    // 5. UPDATE ACCESS TRACKING
    await adminDb.collection('files').doc(fileId).update({
      lastAccessedAt: new Date(),
      accessCount: admin.firestore.FieldValue.increment(1)
    });

    // 6. AUDIT LOG
    await logFileAccess({
      actorUid: userUid,
      resourceId: fileData.anagraficaId,
      filePath: fileData.path,
      details: {
        fileId,
        fileName: fileData.nome,
        category: fileData.category
      }
    });

    return {
      success: true,
      url,
      file: {
        id: fileDoc.id,
        nome: fileData.nome,
        nomeOriginale: fileData.nomeOriginale,
        tipo: fileData.tipo,
        dimensione: fileData.dimensione
      }
    };

  } catch (error) {
    console.error('[GET_FILE_URL_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Soft delete a file
 *
 * @param {string} fileId - File document ID
 */
export async function deleteFile(fileId) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. GET FILE DOCUMENT
    const fileDoc = await adminDb.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }

    const fileData = fileDoc.data();

    // Check if already deleted
    if (fileData.deleted) {
      throw new Error('File already deleted');
    }

    // 3. VERIFY ACCESS TO ANAGRAFICA
    await getAnagraficaInternal(fileData.anagraficaId, userUid);

    // 4. SOFT DELETE
    await adminDb.collection('files').doc(fileId).update({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userUid,
      updatedAt: new Date()
    });

    // 5. INVALIDATE CACHE
    invalidateFilesCache(fileData.anagraficaId);

    // 6. AUDIT LOG
    await logDataDelete({
      actorUid: userUid,
      resourceType: 'file',
      resourceId: fileId,
      softDelete: true,
      details: {
        anagraficaId: fileData.anagraficaId,
        fileName: fileData.nome,
        category: fileData.category
      }
    });

    return {
      success: true,
      message: 'File eliminato con successo'
    };

  } catch (error) {
    console.error('[DELETE_FILE_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Update file metadata (name, tags, category, expiration)
 *
 * @param {string} fileId - File document ID
 * @param {Object} updates - Fields to update
 */
export async function updateFileMetadata(fileId, updates) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. GET FILE DOCUMENT
    const fileDoc = await adminDb.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }

    const fileData = fileDoc.data();

    // Check if deleted
    if (fileData.deleted) {
      throw new Error('File not found');
    }

    // 3. VERIFY ACCESS TO ANAGRAFICA
    await getAnagraficaInternal(fileData.anagraficaId, userUid);

    // 4. VALIDATE AND PREPARE UPDATES
    const allowedFields = ['nome', 'tags', 'category', 'dataScadenza'];
    const updateData = {};

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'dataScadenza' && updates[key]) {
          updateData[key] = new Date(updates[key]);
        } else {
          updateData[key] = updates[key];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    updateData.updatedAt = new Date();

    // 5. UPDATE DOCUMENT
    await adminDb.collection('files').doc(fileId).update(updateData);

    // 6. INVALIDATE CACHE
    invalidateFilesCache(fileData.anagraficaId);

    return {
      success: true,
      message: 'File metadata aggiornati con successo'
    };

  } catch (error) {
    console.error('[UPDATE_FILE_METADATA_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Get file statistics for an anagrafica
 */
export async function getFileStats(anagraficaId) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. VERIFY ACCESS
    await getAnagraficaInternal(anagraficaId, userUid);

    // 3. GET FILES
    const snapshot = await adminDb.collection('files')
      .where('anagraficaId', '==', anagraficaId)
      .where('deleted', '==', false)
      .get();

    const files = snapshot.docs.map(doc => doc.data());

    // 4. COMPUTE STATS
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.dimensione || 0), 0),
      byCategory: {},
      withExpiration: files.filter(f => f.dataScadenza).length,
      expired: files.filter(f => f.dataScadenza && new Date(f.dataScadenza) < new Date()).length
    };

    // Count by category
    files.forEach(file => {
      const cat = file.category || 'other';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('[GET_FILE_STATS_ERROR]:', error);
    return {
      error: true,
      message: error.message
    };
  }
}
