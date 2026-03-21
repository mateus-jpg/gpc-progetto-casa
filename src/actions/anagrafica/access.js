'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import path from 'path';
import { stripHtml } from '@/utils/htmlSanitizer';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES, validateFileSignature } from '@/utils/fileValidation';
import { CACHE_TAGS, REVALIDATE, invalidateAccessiCache, invalidateFilesCache } from '@/lib/cache';
import { logDataCreate, logDataAccess, logFileAccess, logDataUpdate } from '@/utils/audit';
import { createFolderInternal } from '@/actions/files/folders';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/** @private */
async function findOrCreateFolder(anagraficaId, folderName, structureId, userUid) {
  try {
    const folderQuery = await adminDb.collection('folders')
      .where('anagraficaId', '==', anagraficaId)
      .where('nome', '==', folderName)
      .where('deleted', '==', false)
      .limit(1)
      .get();
    if (!folderQuery.empty) {
      return { id: folderQuery.docs[0].id, ...folderQuery.docs[0].data() };
    }
    const newFolderResult = await createFolderInternal({
      anagraficaId, nome: folderName, parentFolderId: null,
      structureId, userUid, userEmail: null
    });
    return newFolderResult.success ? newFolderResult.folder : null;
  } catch (err) {
    console.error('Error finding/creating folder:', err);
    return null;
  }
}

/** @private */
async function uploadFileItem({ fileItem, anagraficaId, accessId, index, targetFolder, targetFolderId, structureId, userUid, structureIds }) {
  let buffer;
  let originalName = fileItem.originalName || fileItem.name;
  let mimeType = fileItem.type;
  let size = fileItem.size;

  if (fileItem.base64) {
    const matches = fileItem.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(fileItem.base64, 'base64');
    }
  } else if (fileItem.file && typeof fileItem.file.arrayBuffer === 'function') {
    const arrayBuffer = await fileItem.file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    originalName = fileItem.file.name;
    mimeType = fileItem.file.type;
    size = fileItem.file.size;
  } else if (typeof fileItem.arrayBuffer === 'function') {
    const arrayBuffer = await fileItem.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    originalName = fileItem.name;
    mimeType = fileItem.type;
    size = fileItem.size;
  }

  if (!buffer) return null;

  if (buffer.length > FILE_SIZE_LIMIT) throw new Error(`File ${originalName} exceeds size limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Error(`File type ${mimeType} is not allowed`);
  if (!validateFileSignature(buffer, mimeType)) throw new Error(`File ${originalName} content does not match claimed type ${mimeType}`);

  const fileExt = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
  const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${randomUUID()}${fileExt}`;

  const fileRef = adminStorage.bucket().file(storagePath);
  await fileRef.save(buffer, { contentType: mimeType, resumable: false });

  const fileMetadata = {
    nome: fileItem.name || originalName,
    nomeOriginale: originalName,
    tipo: mimeType,
    dimensione: size,
    path: storagePath,
    dataCreazione: fileItem.creationDate ? new Date(fileItem.creationDate).toISOString() : new Date().toISOString(),
    dataScadenza: fileItem.expirationDate ? new Date(fileItem.expirationDate).toISOString() : null,
  };

  if (targetFolderId) {
    const fileDocRef = adminDb.collection('files').doc();
    await fileDocRef.set({
      nome: fileMetadata.nome,
      nomeOriginale: fileMetadata.nomeOriginale,
      tipo: fileMetadata.tipo,
      dimensione: fileMetadata.dimensione,
      path: fileMetadata.path,
      anagraficaId,
      folderId: targetFolderId,
      accessoId: accessId,
      category: targetFolder?.category || null,
      tags: [],
      dataDocumento: fileItem.creationDate ? new Date(fileItem.creationDate) : new Date(),
      dataCreazione: new Date(),
      dataScadenza: fileItem.expirationDate ? new Date(fileItem.expirationDate) : null,
      structureIds: structureIds || [],
      uploadedByStructure: structureId,
      uploadedBy: userUid,
      uploadedByEmail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      lastAccessedAt: null,
      accessCount: 0
    });
  }

  return fileMetadata;
}

export async function createAccessInternal({ anagraficaId, services, structureId, userUid, structureIds }) {
  const accessRef = adminDb.collection('accessi').doc();
  const accessId = accessRef.id;

  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const targetFolder = await findOrCreateFolder(anagraficaId, svc.tipoAccesso || 'Documenti', structureId, userUid);
    const targetFolderId = targetFolder?.id || null;
    const uploadedFiles = [];

    for (const fileItem of (svc.files || [])) {
      const fileMeta = await uploadFileItem({ fileItem, anagraficaId, accessId, index, targetFolder, targetFolderId, structureId, userUid, structureIds });
      if (fileMeta) uploadedFiles.push(fileMeta);
    }

    let reminderId = null;
    if (svc.reminderDate) {
      const reminderRef = adminDb.collection('reminders').doc();
      reminderId = reminderRef.id;

      await reminderRef.set({
        anagraficaId,
        structureId,
        accessId,
        serviceType: svc.tipoAccesso,
        date: svc.reminderDate,
        note: svc.note || '',
        createdBy: userUid,
        createdAt: new Date().toISOString(),
        status: 'pending',
        linkedToAccess: true
      });
    }

    return {
      tipoAccesso: svc.tipoAccesso || null,
      sottoCategorie: svc.sottoCategorie ?? null,
      altro: svc.altro ?? null,
      note: svc.note?.trim() || null,
      classificazione: svc.classificazione ?? null,
      enteRiferimento: svc.enteRiferimento ?? null,
      files: uploadedFiles || [],
      reminderDate: svc.reminderDate ?? null,
      reminderId: reminderId ?? null,
    };
  }));

  const accessData = {
    anagraficaId,
    services: processedServices,
    createdByStructure: structureId,
    createdBy: userUid,
    createdAt: new Date().toISOString(),
    structureIds,
  };

  await accessRef.set(accessData);

  // Write history entry for creation (graceful failure — does not break main flow)
  try {
    await adminDb.collection('accessi').doc(accessId).collection('history').add({
      anagraficaId,
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: null,
      changedByStructure: structureId,
      changeType: 'create',
      changedGroups: ['services'],
      changes: {
        services: { before: null, after: processedServices }
      }
    });
  } catch (histErr) {
    console.error('Failed to write accesso history (create):', histErr);
  }

  // Invalidate caches after creating new access
  invalidateAccessiCache(anagraficaId);
  invalidateFilesCache(anagraficaId);

  return { accessId, accessData };
}

export async function createAccessAction(payload) {
  const { userUid } = await requireUser();

  const {
    anagraficaId,
    services = [],
    structureId,
  } = payload;

  if (!anagraficaId || services.length === 0) throw new Error('Missing required fields');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Check if User has access to Anagrafica
  await verifyUserPermissions({ userUid, allowedStructures });

  // Additional check: The structureId used for creation must be one of the allowed structures
  if (structureId && !allowedStructures.includes(structureId)) {
    throw new Error('Forbidden: structureId not allowed for this anagrafica');
  }

  const { accessId, accessData } = await createAccessInternal({
    anagraficaId,
    services,
    structureId,
    userUid,
    structureIds: allowedStructures,
  });

  // Audit log: access record creation
  await logDataCreate({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    structureId,
    details: {
      anagraficaId,
      servicesCount: services.length,
      serviceTypes: services.map(s => s.tipoAccesso).filter(Boolean)
    }
  });

  return { success: true, accessId, accessData };
}

/**
 * Internal function to fetch accessi from database
 * Used by cached wrapper
 */
async function fetchAccessiFromDb(anagraficaId) {
  const snap = await adminDb
    .collection('accessi')
    .where('anagraficaId', '==', anagraficaId)
    .orderBy('createdAt', 'desc')
    .get();

  const accessi = [];
  snap.forEach(doc => {
    const data = doc.data();

    if (data.services && Array.isArray(data.services)) {
      accessi.push({
        id: doc.id,
        ...data,
        services: data.services.map(s => ({
          ...s,
          sanitizedNote: stripHtml(s.note || '')
        }))
      });
    } else {
      // Compatibility with old structure
      accessi.push({
        id: doc.id,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        createdByEmail: data.createdByEmail,
        services: [{
          tipoAccesso: data.tipoAccesso,
          sottoCategorie: data.sottoCategorie,
          altro: data.altro,
          note: data.note,
          sanitizedNote: stripHtml(data.note || ''),
          classificazione: data.classificazione,
          enteRiferimento: data.enteRiferimento,
          files: data.files
        }]
      });
    }
  });

  return accessi;
}

/**
 * Get access records for an anagrafica with caching
 * Permission check runs fresh on every call (not cached)
 */
export async function getAccessAction(anagraficaId) {
  const { userUid } = await requireUser();
  if (!anagraficaId) throw new Error('Missing anagraficaId');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Permission check is NOT cached - always runs fresh for security
  await verifyUserPermissions({ userUid, allowedStructures });

  // Get cached accessi data
  const getCachedAccessi = unstable_cache(
    async () => fetchAccessiFromDb(anagraficaId),
    [`accessi`, anagraficaId],
    {
      tags: [CACHE_TAGS.accessi(anagraficaId)],
      revalidate: REVALIDATE.accessi,
    }
  );

  const accessi = await getCachedAccessi();

  // Audit log: access records read
  await logDataAccess({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: anagraficaId,
    details: {
      accessCount: accessi.length
    }
  });

  return {
    success: true,
    count: accessi.length,
    accessi,
  };
}

export async function getAccessFileUrl({ anagraficaId, filePath }) {
  const { userUid } = await requireUser();

  if (!anagraficaId || !filePath) throw new Error('Missing parameters');

  // Security: Validate anagraficaId format (should be alphanumeric Firebase ID)
  if (!/^[a-zA-Z0-9]+$/.test(anagraficaId)) {
    throw new Error('Invalid anagraficaId format');
  }

  // Security: Normalize path to prevent path traversal attacks (../ sequences)
  const normalizedPath = path.posix.normalize(filePath);
  const expectedPrefix = `files/${anagraficaId}/`;

  // Security: Check that normalized path starts with expected prefix
  // and doesn't contain dangerous sequences after normalization
  if (!normalizedPath.startsWith(expectedPrefix) || normalizedPath.includes('..')) {
    throw new Error('Invalid file path for this anagrafica');
  }

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Check permissions
  await verifyUserPermissions({ userUid, allowedStructures });

  // Generate Signed URL
  // Valid for 1 hour
  // Security: Use the normalized path to prevent path traversal
  const [url] = await adminStorage
    .bucket()
    .file(normalizedPath)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

  // Audit log: file access
  await logFileAccess({
    actorUid: userUid,
    resourceId: anagraficaId,
    filePath: normalizedPath
  });

  return { success: true, url };
}

/**
 * Get a single accesso record by ID.
 * Verifies the calling user has permission via the parent anagrafica.
 */
export async function getAccessByIdAction(accessId, anagraficaId) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId) throw new Error('Missing parameters');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  await verifyUserPermissions({ userUid, allowedStructures });

  const accessSnap = await adminDb.collection('accessi').doc(accessId).get();
  if (!accessSnap.exists) throw new Error('Accesso not found');

  const data = accessSnap.data();
  if (data.anagraficaId !== anagraficaId) throw new Error('Access record does not belong to this anagrafica');

  await logDataAccess({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    details: { anagraficaId }
  });

  return JSON.stringify({ success: true, accesso: { id: accessSnap.id, ...data } });
}

/**
 * Update an existing accesso record.
 * Handles uploading new files, soft-deleting removed files, and writing history.
 */
export async function updateAccessAction({ accessId, anagraficaId, services, structureId }) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId || !services) throw new Error('Missing required fields');

  // Permission check via parent anagrafica
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  // Load current doc for before-snapshot
  const accessRef = adminDb.collection('accessi').doc(accessId);
  const accessSnap = await accessRef.get();
  if (!accessSnap.exists) throw new Error('Accesso not found');

  const currentData = accessSnap.data();
  if (currentData.anagraficaId !== anagraficaId) throw new Error('Access record does not belong to this anagrafica');

  const beforeServices = currentData.services || [];
  const existingStructureIds = currentData.structureIds || allowedStructures;

  // Soft-delete files marked for removal from the files collection
  const allDeletedPaths = services.flatMap(svc => svc.deletedFilePaths || []);
  for (const filePath of allDeletedPaths) {
    const filesQuery = await adminDb.collection('files')
      .where('path', '==', filePath)
      .where('anagraficaId', '==', anagraficaId)
      .limit(1)
      .get();
    if (!filesQuery.empty) {
      await filesQuery.docs[0].ref.update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userUid
      });
    }
  }

  // Process each service: keep existing files, upload new files
  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const targetFolder = await findOrCreateFolder(anagraficaId, svc.tipoAccesso || 'Documenti', structureId, userUid);
    const targetFolderId = targetFolder?.id || null;

    const keptFiles = (svc.existingFiles || []).filter(
      f => !(svc.deletedFilePaths || []).includes(f.path)
    );

    const newlyUploadedFiles = [];
    for (const fileItem of (svc.files || [])) {
      const fileMeta = await uploadFileItem({ fileItem, anagraficaId, accessId, index, targetFolder, targetFolderId, structureId, userUid, structureIds: existingStructureIds });
      if (fileMeta) newlyUploadedFiles.push(fileMeta);
    }

    return {
      tipoAccesso: svc.tipoAccesso || null,
      sottoCategorie: svc.sottoCategorie ?? null,
      altro: svc.altro ?? null,
      note: svc.note?.trim() || null,
      classificazione: svc.classificazione ?? null,
      enteRiferimento: svc.enteRiferimento ?? null,
      files: [...keptFiles, ...newlyUploadedFiles],
      reminderDate: svc.reminderDate ?? null,
      reminderId: svc.reminderId ?? null,
    };
  }));

  // Persist the update
  await accessRef.update({
    services: processedServices,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
    updatedByStructure: structureId,
  });

  // Write history entry (graceful failure)
  try {
    await accessRef.collection('history').add({
      anagraficaId,
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: null,
      changedByStructure: structureId,
      changeType: 'update',
      changedGroups: ['services'],
      changes: {
        services: { before: beforeServices, after: processedServices }
      }
    });
  } catch (histErr) {
    console.error('Failed to write accesso history (update):', histErr);
  }

  invalidateAccessiCache(anagraficaId);
  invalidateFilesCache(anagraficaId);

  await logDataUpdate({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    structureId,
    changedFields: ['services'],
    details: { anagraficaId }
  });

  return { success: true, accessId };
}

/**
 * Get history entries for a single accesso record.
 */
export async function getAccessHistoryAction(accessId, anagraficaId) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId) throw new Error('Missing parameters');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  const historySnap = await adminDb
    .collection('accessi')
    .doc(accessId)
    .collection('history')
    .orderBy('changedAt', 'desc')
    .limit(50)
    .get();

  const entries = historySnap.docs.map(doc => {
    const data = doc.data();
    const changedAt = data.changedAt?.toDate?.() || new Date(data.changedAt);
    return {
      id: doc.id,
      ...JSON.parse(JSON.stringify(data)),
      changedAt: changedAt instanceof Date ? changedAt.toISOString() : changedAt
    };
  });

  return JSON.stringify({ success: true, entries });
}
