import admin from "@/lib/firebase/firebaseAdmin";
import { serializeFirestoreData } from "@/lib/utils";
import { verifyUserPermissions } from "@/utils/server-auth";

const db = admin.firestore();

export function normalizeIdArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((id) => typeof id === "string" && id))];
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  return [];
}

export function getResourceStructureIds(resourceData = {}) {
  const structureIds = normalizeIdArray(resourceData.structureIds);
  if (structureIds.length > 0) return structureIds;

  return normalizeIdArray(
    resourceData.uploadedByStructure || resourceData.structureId,
  );
}

export function canAccessScopedResource({
  resourceData = {},
  structureId,
  isSuperAdmin = false,
}) {
  if (isSuperAdmin) return true;
  if (!structureId) return true;

  const resourceStructureIds = getResourceStructureIds(resourceData);
  if (resourceStructureIds.length === 0) return true;

  return resourceStructureIds.includes(structureId);
}

export async function requireAnagraficaAccess({
  userUid,
  anagraficaId,
  structureId = null,
}) {
  if (!userUid) {
    throw new Error("Unauthorized: missing user");
  }

  if (!anagraficaId) {
    throw new Error("anagraficaId is required");
  }

  const anagraficaDoc = await db
    .collection("anagrafica")
    .doc(anagraficaId)
    .get();

  if (!anagraficaDoc.exists) {
    throw new Error("Anagrafica not found");
  }

  const anagraficaData = anagraficaDoc.data() || {};

  if (anagraficaData.deleted || anagraficaData.deletedAt) {
    throw new Error("Anagrafica not found");
  }

  const allowedStructures = [
    ...new Set([
      ...normalizeIdArray(anagraficaData.canBeAccessedBy),
      ...normalizeIdArray(anagraficaData.structureIds),
    ]),
  ];

  const permission = await verifyUserPermissions({
    userUid,
    allowedStructures,
  });

  if (structureId) {
    await verifyUserPermissions({ userUid, structureId });

    if (!permission.isSuperAdmin && !allowedStructures.includes(structureId)) {
      throw new Error("Forbidden: structureId not allowed for this anagrafica");
    }
  }

  return {
    anagrafica: serializeFirestoreData({
      id: anagraficaDoc.id,
      ...anagraficaData,
    }),
    allowedStructures,
    isSuperAdmin: permission.isSuperAdmin,
  };
}

export async function requireScopedDocument({
  collectionName,
  documentId,
  structureId,
  anagraficaId = null,
  userUid = null,
}) {
  if (!collectionName || !documentId) {
    throw new Error("Resource identifier is required");
  }

  const documentRef = db.collection(collectionName).doc(documentId);
  const documentSnap = await documentRef.get();

  if (!documentSnap.exists) {
    throw new Error("Resource not found");
  }

  const documentData = documentSnap.data() || {};

  if (documentData.deleted || documentData.deletedAt) {
    throw new Error("Resource not found");
  }

  if (structureId && documentData.structureId !== structureId) {
    throw new Error("Forbidden: resource belongs to another structure");
  }

  if (anagraficaId && documentData.anagraficaId !== anagraficaId) {
    throw new Error("Forbidden: resource belongs to another anagrafica");
  }

  if (userUid && structureId) {
    await verifyUserPermissions({ userUid, structureId });
  }

  return {
    ref: documentRef,
    data: documentData,
    snapshot: documentSnap,
  };
}

export async function requireAnagraficaFileAccess({
  userUid,
  fileId,
  structureId = null,
  writable = false,
}) {
  if (!fileId) {
    throw new Error("fileId is required");
  }

  const fileRef = db.collection("files").doc(fileId);
  const fileSnap = await fileRef.get();

  if (!fileSnap.exists) {
    throw new Error("File not found");
  }

  const fileData = fileSnap.data() || {};

  if (fileData.deleted || fileData.deletedAt) {
    throw new Error("File not found");
  }

  const access = await requireAnagraficaAccess({
    userUid,
    anagraficaId: fileData.anagraficaId,
    structureId,
  });

  if (
    !canAccessScopedResource({
      resourceData: fileData,
      structureId,
      isSuperAdmin: access.isSuperAdmin,
    })
  ) {
    throw new Error("Forbidden: file belongs to another structure");
  }

  if (
    writable &&
    structureId &&
    !access.isSuperAdmin &&
    fileData.uploadedByStructure &&
    fileData.uploadedByStructure !== structureId
  ) {
    throw new Error("Forbidden: file can only be modified by its structure");
  }

  return {
    ref: fileRef,
    data: fileData,
    snapshot: fileSnap,
    ...access,
  };
}

export async function requireAnagraficaFolderAccess({
  userUid,
  folderId,
  structureId = null,
}) {
  if (!folderId) {
    throw new Error("folderId is required");
  }

  const folderRef = db.collection("folders").doc(folderId);
  const folderSnap = await folderRef.get();

  if (!folderSnap.exists) {
    throw new Error("Folder not found");
  }

  const folderData = folderSnap.data() || {};

  if (folderData.deleted || folderData.deletedAt) {
    throw new Error("Folder not found");
  }

  const access = await requireAnagraficaAccess({
    userUid,
    anagraficaId: folderData.anagraficaId,
    structureId,
  });

  if (
    !canAccessScopedResource({
      resourceData: folderData,
      structureId,
      isSuperAdmin: access.isSuperAdmin,
    })
  ) {
    throw new Error("Forbidden: folder belongs to another structure");
  }

  return {
    ref: folderRef,
    data: folderData,
    snapshot: folderSnap,
    ...access,
  };
}
