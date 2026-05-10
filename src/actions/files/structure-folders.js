"use server";

import { invalidateStructureFolderCaches } from "@/lib/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import { logDataCreate, logDataDelete, logDataUpdate } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();
const MAX_FOLDER_DEPTH = 5;

/**
 * Get folder tree for a structure
 * @param {string} structureId - Structure ID
 */
export async function getStructureFolderTree(structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyUserPermissions({ userUid, structureId });

    const snapshot = await adminDb
      .collection("structureFolders")
      .where("structureId", "==", structureId)
      .where("deleted", "==", false)
      .orderBy("depth", "asc")
      .orderBy("nome", "asc")
      .get();

    const folders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));

    const rootFolders = folders.filter((f) => f.parentFolderId === null);
    const folderMap = new Map(
      folders.map((f) => [f.id, { ...f, children: [] }]),
    );

    folders.forEach((folder) => {
      if (folder.parentFolderId) {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(folderMap.get(folder.id));
        }
      }
    });

    return {
      success: true,
      folders,
      rootFolders: rootFolders.map((f) => folderMap.get(f.id)),
      count: folders.length,
    };
  } catch (err) {
    console.error("[GET_STRUCTURE_FOLDER_TREE_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Get contents of a specific structure folder
 * @param {Object} params
 * @param {string|null} params.folderId - Folder ID (null for root)
 * @param {string} params.structureId - Structure ID (required for root)
 */
export async function getStructureFolderContents({
  folderId,
  structureId = null,
}) {
  try {
    const { userUid } = await requireUser();

    let folderData = null;
    let targetStructureId = structureId;

    if (folderId === null) {
      if (!structureId)
        throw new Error("structureId is required for root directory");
      await verifyUserPermissions({ userUid, structureId });
    } else {
      const folderDoc = await adminDb
        .collection("structureFolders")
        .doc(folderId)
        .get();
      if (!folderDoc.exists) throw new Error("Folder not found");
      folderData = folderDoc.data();
      if (folderData.deleted) throw new Error("Folder not found");
      targetStructureId = folderData.structureId;
      await verifyUserPermissions({ userUid, structureId: targetStructureId });
    }

    // Subfolders
    const subfoldersSnapshot = await adminDb
      .collection("structureFolders")
      .where("structureId", "==", targetStructureId)
      .where("parentFolderId", "==", folderId)
      .where("deleted", "==", false)
      .orderBy("nome", "asc")
      .get();

    const subfolders = subfoldersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));

    // Files
    const filesSnapshot = await adminDb
      .collection("structureFiles")
      .where("structureId", "==", targetStructureId)
      .where("folderId", "==", folderId)
      .where("deleted", "==", false)
      .orderBy("createdAt", "desc")
      .get();

    const files = filesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dataDocumento:
        doc.data().dataDocumento?.toDate?.()?.toISOString() ||
        doc.data().dataDocumento,
      dataCreazione:
        doc.data().dataCreazione?.toDate?.()?.toISOString() ||
        doc.data().dataCreazione,
      dataScadenza:
        doc.data().dataScadenza?.toDate?.()?.toISOString() ||
        doc.data().dataScadenza,
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      deletedAt:
        doc.data().deletedAt?.toDate?.()?.toISOString() ||
        doc.data().deletedAt ||
        null,
      lastAccessedAt:
        doc.data().lastAccessedAt?.toDate?.()?.toISOString() ||
        doc.data().lastAccessedAt ||
        null,
    }));

    // Breadcrumbs
    const breadcrumbs = [];
    if (folderId === null) {
      breadcrumbs.push({ id: null, nome: "Root", path: "/" });
    } else {
      let currentFolder = { id: folderId, ...folderData };
      while (currentFolder) {
        breadcrumbs.unshift({
          id: currentFolder.id,
          nome: currentFolder.nome,
          path: currentFolder.path,
        });
        if (currentFolder.parentFolderId) {
          const parentDoc = await adminDb
            .collection("structureFolders")
            .doc(currentFolder.parentFolderId)
            .get();
          if (parentDoc.exists) {
            currentFolder = { id: parentDoc.id, ...parentDoc.data() };
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    return {
      success: true,
      folder: folderData
        ? {
            id: folderId,
            ...folderData,
            createdAt:
              folderData.createdAt?.toDate?.()?.toISOString() ||
              folderData.createdAt,
            updatedAt:
              folderData.updatedAt?.toDate?.()?.toISOString() ||
              folderData.updatedAt,
          }
        : null,
      subfolders,
      files,
      breadcrumbs,
      counts: { subfolders: subfolders.length, files: files.length },
    };
  } catch (err) {
    console.error("[GET_STRUCTURE_FOLDER_CONTENTS_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Create a new folder for a structure
 */
export async function createStructureFolder({
  structureId,
  nome,
  parentFolderId = null,
}) {
  try {
    const { userUid, headers } = await requireUser();
    const userEmail = headers.get("x-user-email");
    await verifyUserPermissions({ userUid, structureId });

    if (!nome || nome.trim().length === 0)
      throw new Error("Folder name is required");
    if (nome.length > 100)
      throw new Error("Folder name must be 100 characters or less");

    let depth = 0;
    let path = `/${nome.trim()}`;

    if (parentFolderId) {
      const parentDoc = await adminDb
        .collection("structureFolders")
        .doc(parentFolderId)
        .get();
      if (!parentDoc.exists || parentDoc.data().deleted)
        throw new Error("Parent folder not found");
      const parentData = parentDoc.data();
      if (parentData.structureId !== structureId)
        throw new Error("Parent folder belongs to different structure");
      depth = parentData.depth + 1;
      path = `${parentData.path}/${nome.trim()}`;
      if (depth > MAX_FOLDER_DEPTH)
        throw new Error(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`);
    }

    const folderData = {
      nome: nome.trim(),
      structureId,
      parentFolderId,
      path,
      depth,
      isDefaultCategory: false,
      category: null,
      createdAt: new Date(),
      createdBy: userUid,
      createdByEmail: userEmail,
      updatedAt: new Date(),
      deleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    const folderRef = await adminDb
      .collection("structureFolders")
      .add(folderData);

    await logDataCreate({
      actorUid: userUid,
      resourceType: "structureFolder",
      resourceId: folderRef.id,
      structureId,
      details: { folderName: nome, parentFolderId, depth },
    });

    invalidateStructureFolderCaches(
      structureId,
      parentFolderId ? [parentFolderId] : [],
    );

    return { success: true, folder: { id: folderRef.id, ...folderData } };
  } catch (err) {
    console.error("[CREATE_STRUCTURE_FOLDER_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Rename a structure folder (updates paths for all children)
 */
export async function renameStructureFolder({
  folderId,
  newName,
  structureId,
}) {
  try {
    const { userUid } = await requireUser();
    if (!newName || newName.trim().length === 0)
      throw new Error("Folder name is required");
    if (newName.length > 100)
      throw new Error("Folder name must be 100 characters or less");

    const folderDoc = await adminDb
      .collection("structureFolders")
      .doc(folderId)
      .get();
    if (!folderDoc.exists) throw new Error("Folder not found");
    const folderData = folderDoc.data();
    if (folderData.deleted) throw new Error("Folder not found");
    if (structureId && folderData.structureId !== structureId) {
      throw new Error("Folder belongs to a different structure");
    }

    await verifyUserPermissions({
      userUid,
      structureId: folderData.structureId,
    });
    if (folderData.isDefaultCategory)
      throw new Error("Cannot rename default category folders");

    const oldPath = folderData.path;
    const oldName = folderData.nome;
    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName.trim();
    const newPath = pathParts.join("/");

    const descendantsSnapshot = await adminDb
      .collection("structureFolders")
      .where("structureId", "==", folderData.structureId)
      .where("deleted", "==", false)
      .get();

    const descendants = descendantsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((f) => f.path.startsWith(`${oldPath}/`));

    const batch = adminDb.batch();
    const affectedFolderIds = [folderId];

    batch.update(adminDb.collection("structureFolders").doc(folderId), {
      nome: newName.trim(),
      path: newPath,
      updatedAt: new Date(),
    });

    descendants.forEach((desc) => {
      batch.update(adminDb.collection("structureFolders").doc(desc.id), {
        path: desc.path.replace(oldPath, newPath),
        updatedAt: new Date(),
      });
      affectedFolderIds.push(desc.id);
    });

    await batch.commit();

    await logDataUpdate({
      actorUid: userUid,
      resourceType: "structureFolder",
      resourceId: folderId,
      structureId: folderData.structureId,
      changedFields: ["nome", "path"],
      details: { oldName, newName: newName.trim(), oldPath, newPath },
    });

    invalidateStructureFolderCaches(folderData.structureId, affectedFolderIds);

    return { success: true, message: "Folder renamed successfully" };
  } catch (err) {
    console.error("[RENAME_STRUCTURE_FOLDER_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Delete a structure folder (soft delete, with optional cascade)
 */
export async function deleteStructureFolder({
  folderId,
  cascade = false,
  structureId,
}) {
  try {
    const { userUid } = await requireUser();

    const folderDoc = await adminDb
      .collection("structureFolders")
      .doc(folderId)
      .get();
    if (!folderDoc.exists) throw new Error("Folder not found");
    const folderData = folderDoc.data();
    if (folderData.deleted) throw new Error("Folder already deleted");
    if (structureId && folderData.structureId !== structureId) {
      throw new Error("Folder belongs to a different structure");
    }

    await verifyUserPermissions({
      userUid,
      structureId: folderData.structureId,
    });
    if (folderData.isDefaultCategory)
      throw new Error("Cannot delete default category folders");

    const subfoldersSnap = await adminDb
      .collection("structureFolders")
      .where("parentFolderId", "==", folderId)
      .where("deleted", "==", false)
      .limit(1)
      .get();
    const filesSnap = await adminDb
      .collection("structureFiles")
      .where("folderId", "==", folderId)
      .where("deleted", "==", false)
      .limit(1)
      .get();
    const hasContents = !subfoldersSnap.empty || !filesSnap.empty;

    if (hasContents && !cascade) {
      throw new Error(
        "Folder is not empty. Use cascade option to delete all contents.",
      );
    }

    let deletedCount = 0;
    const affectedFolderIds = [folderId];

    if (cascade && hasContents) {
      const allSubsSnap = await adminDb
        .collection("structureFolders")
        .where("structureId", "==", folderData.structureId)
        .where("deleted", "==", false)
        .get();
      const descendants = allSubsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f) => f.path.startsWith(`${folderData.path}/`));

      const allFilesSnap = await adminDb
        .collection("structureFiles")
        .where("structureId", "==", folderData.structureId)
        .where("deleted", "==", false)
        .get();
      const filesToDelete = allFilesSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (f) =>
            f.folderId === folderId ||
            descendants.some((d) => d.id === f.folderId),
        );

      const allOps = [
        ...descendants.map((d) => ({ type: "structureFolders", id: d.id })),
        ...filesToDelete.map((f) => ({ type: "structureFiles", id: f.id })),
        { type: "structureFolders", id: folderId },
      ];

      for (let i = 0; i < allOps.length; i += 500) {
        const batch = adminDb.batch();
        allOps.slice(i, i + 500).forEach((op) => {
          batch.update(adminDb.collection(op.type).doc(op.id), {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userUid,
            updatedAt: new Date(),
          });
        });
        await batch.commit();
        deletedCount += Math.min(500, allOps.length - i);
      }

      affectedFolderIds.push(...descendants.map((d) => d.id));
    } else {
      await adminDb.collection("structureFolders").doc(folderId).update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userUid,
        updatedAt: new Date(),
      });
      deletedCount = 1;
    }

    await logDataDelete({
      actorUid: userUid,
      resourceType: "structureFolder",
      resourceId: folderId,
      softDelete: true,
      details: { folderName: folderData.nome, cascade, deletedCount },
    });

    invalidateStructureFolderCaches(folderData.structureId, affectedFolderIds);

    return {
      success: true,
      message: "Folder deleted successfully",
      deletedCount,
    };
  } catch (err) {
    console.error("[DELETE_STRUCTURE_FOLDER_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Move a structure folder to a new parent
 */
export async function moveStructureFolder({
  folderId,
  newParentFolderId,
  structureId,
}) {
  try {
    const { userUid } = await requireUser();

    const folderDoc = await adminDb
      .collection("structureFolders")
      .doc(folderId)
      .get();
    if (!folderDoc.exists) throw new Error("Folder not found");
    const folderData = folderDoc.data();
    if (folderData.deleted) throw new Error("Folder not found");
    if (structureId && folderData.structureId !== structureId) {
      throw new Error("Folder belongs to a different structure");
    }

    await verifyUserPermissions({
      userUid,
      structureId: folderData.structureId,
    });
    if (folderData.isDefaultCategory)
      throw new Error("Cannot move default category folders");

    let newDepth = 0;
    let newPath = `/${folderData.nome}`;

    if (newParentFolderId) {
      const parentDoc = await adminDb
        .collection("structureFolders")
        .doc(newParentFolderId)
        .get();
      if (!parentDoc.exists || parentDoc.data().deleted)
        throw new Error("Target parent folder not found");
      const parentData = parentDoc.data();
      if (parentData.structureId !== folderData.structureId)
        throw new Error("Cannot move folder to different structure");
      if (parentData.path.startsWith(folderData.path))
        throw new Error("Cannot move folder into its own descendant");
      newDepth = parentData.depth + 1;
      newPath = `${parentData.path}/${folderData.nome}`;
    }

    if (folderData.parentFolderId === newParentFolderId) {
      return { success: true, message: "Folder is already at target location" };
    }

    const oldPath = folderData.path;

    const descendantsSnap = await adminDb
      .collection("structureFolders")
      .where("structureId", "==", folderData.structureId)
      .where("deleted", "==", false)
      .get();
    const descendants = descendantsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((f) => f.path.startsWith(`${oldPath}/`));

    const batch = adminDb.batch();
    const affectedFolderIds = [folderId];
    if (folderData.parentFolderId)
      affectedFolderIds.push(folderData.parentFolderId);
    if (newParentFolderId) affectedFolderIds.push(newParentFolderId);

    const depthDiff = newDepth - folderData.depth;
    batch.update(adminDb.collection("structureFolders").doc(folderId), {
      parentFolderId: newParentFolderId,
      path: newPath,
      depth: newDepth,
      updatedAt: new Date(),
    });

    descendants.forEach((desc) => {
      batch.update(adminDb.collection("structureFolders").doc(desc.id), {
        path: desc.path.replace(oldPath, newPath),
        depth: desc.depth + depthDiff,
        updatedAt: new Date(),
      });
      affectedFolderIds.push(desc.id);
    });

    await batch.commit();

    await logDataUpdate({
      actorUid: userUid,
      resourceType: "structureFolder",
      resourceId: folderId,
      structureId: folderData.structureId,
      changedFields: ["parentFolderId", "path", "depth"],
      details: { oldPath, newPath, newParentFolderId },
    });

    invalidateStructureFolderCaches(folderData.structureId, affectedFolderIds);

    return { success: true, message: "Folder moved successfully" };
  } catch (err) {
    console.error("[MOVE_STRUCTURE_FOLDER_ERROR]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Move a structure file to a different folder
 */
export async function moveStructureFileToFolder({
  fileId,
  targetFolderId,
  structureId,
}) {
  try {
    const { userUid } = await requireUser();

    const fileDoc = await adminDb
      .collection("structureFiles")
      .doc(fileId)
      .get();
    if (!fileDoc.exists) throw new Error("File not found");
    const fileData = fileDoc.data();
    if (fileData.deleted) throw new Error("File not found");
    if (structureId && fileData.structureId !== structureId) {
      throw new Error("File belongs to a different structure");
    }

    let targetFolderPath = "/";
    if (targetFolderId) {
      const targetDoc = await adminDb
        .collection("structureFolders")
        .doc(targetFolderId)
        .get();
      if (!targetDoc.exists || targetDoc.data().deleted)
        throw new Error("Target folder not found");
      if (targetDoc.data().structureId !== fileData.structureId) {
        throw new Error("Cannot move file to folder in different structure");
      }
      targetFolderPath = targetDoc.data().path;
    }

    await verifyUserPermissions({ userUid, structureId: fileData.structureId });

    if (fileData.folderId === targetFolderId) {
      return { success: true, message: "File is already in target folder" };
    }

    const oldFolderId = fileData.folderId;
    await adminDb.collection("structureFiles").doc(fileId).update({
      folderId: targetFolderId,
      updatedAt: new Date(),
    });

    await logDataUpdate({
      actorUid: userUid,
      resourceType: "structureFile",
      resourceId: fileId,
      structureId: fileData.structureId,
      changedFields: ["folderId"],
      details: {
        fileName: fileData.nome,
        oldFolderId,
        targetFolderId,
        targetFolderPath,
      },
    });

    invalidateStructureFolderCaches(
      fileData.structureId,
      [oldFolderId, targetFolderId].filter(Boolean),
    );

    return { success: true, message: "File moved successfully" };
  } catch (err) {
    console.error("[MOVE_STRUCTURE_FILE_ERROR]:", err);
    return { error: true, message: err.message };
  }
}
