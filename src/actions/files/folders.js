"use server";

import { invalidateFolderCaches } from "@/lib/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import { logDataCreate, logDataDelete, logDataUpdate } from "@/utils/audit";
import {
  canAccessScopedResource,
  normalizeIdArray,
  requireAnagraficaAccess,
  requireAnagraficaFileAccess,
  requireAnagraficaFolderAccess,
} from "@/utils/resource-guards";
import { requireUser } from "@/utils/server-auth";

const adminDb = admin.firestore();

// Maximum folder depth to prevent deeply nested structures
const MAX_FOLDER_DEPTH = 5;

/**
 * Get folder tree for an anagrafica
 * Returns all folders organized by hierarchy
 *
 * @param {string} anagraficaId - Anagrafica ID
 * @returns {Promise<Object>} Folder tree
 */
export async function getFolderTree(anagraficaId, structureId = null) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. VERIFY ACCESS TO ANAGRAFICA
    const { isSuperAdmin } = await requireAnagraficaAccess({
      userUid,
      anagraficaId,
      structureId,
    });

    // 3. GET ALL FOLDERS
    const snapshot = await adminDb
      .collection("folders")
      .where("anagraficaId", "==", anagraficaId)
      .where("deleted", "==", false)
      .orderBy("depth", "asc")
      .orderBy("nome", "asc")
      .get();

    const folders = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt:
          doc.data().createdAt?.toDate?.()?.toISOString() ||
          doc.data().createdAt,
        updatedAt:
          doc.data().updatedAt?.toDate?.()?.toISOString() ||
          doc.data().updatedAt,
      }))
      .filter((folder) =>
        canAccessScopedResource({
          resourceData: folder,
          structureId,
          isSuperAdmin,
        }),
      );

    // Organize into tree structure
    const rootFolders = folders.filter((f) => f.parentFolderId === null);
    const folderMap = new Map(
      folders.map((f) => [f.id, { ...f, children: [] }]),
    );

    // Build parent-child relationships
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
      folders: folders, // Flat list
      rootFolders: rootFolders.map((f) => folderMap.get(f.id)), // Tree structure
      count: folders.length,
    };
  } catch (error) {
    console.error("[GET_FOLDER_TREE_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Get folder contents (files + subfolders)
 *
 * @param {Object} params
 * @param {string} params.folderId - Folder ID (null for root)
 * @param {string} params.anagraficaId - Anagrafica ID (required when folderId is null)
 * @param {boolean} params.includeSubfolders - Include subfolders in results
 * @returns {Promise<Object>} Folder contents
 */
export async function getFolderContents({
  folderId,
  anagraficaId = null,
  structureId = null,
  includeSubfolders = true,
}) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    let folderData = null;
    let targetAnagraficaId = anagraficaId;
    let isSuperAdmin = false;

    // 2. HANDLE ROOT VS SPECIFIC FOLDER
    if (folderId === null) {
      // ROOT DIRECTORY
      if (!anagraficaId) {
        throw new Error("anagraficaId is required for root directory");
      }
      // Verify access to anagrafica
      const access = await requireAnagraficaAccess({
        userUid,
        anagraficaId,
        structureId,
      });
      isSuperAdmin = access.isSuperAdmin;
    } else {
      // SPECIFIC FOLDER
      const access = await requireAnagraficaFolderAccess({
        userUid,
        folderId,
        structureId,
      });
      folderData = access.data;
      targetAnagraficaId = folderData.anagraficaId;
      isSuperAdmin = access.isSuperAdmin;
    }

    // 3. GET SUBFOLDERS
    let subfolders = [];
    if (includeSubfolders) {
      const subfoldersSnapshot = await adminDb
        .collection("folders")
        .where("anagraficaId", "==", targetAnagraficaId)
        .where("parentFolderId", "==", folderId)
        .where("deleted", "==", false)
        .orderBy("nome", "asc")
        .get();

      subfolders = subfoldersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.()?.toISOString() ||
            doc.data().createdAt,
          updatedAt:
            doc.data().updatedAt?.toDate?.()?.toISOString() ||
            doc.data().updatedAt,
        }))
        .filter((folder) =>
          canAccessScopedResource({
            resourceData: folder,
            structureId,
            isSuperAdmin,
          }),
        );
    }

    // 4. GET FILES IN THIS FOLDER/ROOT
    const filesSnapshot = await adminDb
      .collection("files")
      .where("anagraficaId", "==", targetAnagraficaId)
      .where("folderId", "==", folderId)
      .where("deleted", "==", false)
      .orderBy("createdAt", "desc")
      .get();

    const files = filesSnapshot.docs
      .map((doc) => ({
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
          doc.data().createdAt?.toDate?.()?.toISOString() ||
          doc.data().createdAt,
        updatedAt:
          doc.data().updatedAt?.toDate?.()?.toISOString() ||
          doc.data().updatedAt,
        migratedAt:
          doc.data().migratedAt?.toDate?.()?.toISOString() ||
          doc.data().migratedAt ||
          null,
        deletedAt:
          doc.data().deletedAt?.toDate?.()?.toISOString() ||
          doc.data().deletedAt ||
          null,
        lastAccessedAt:
          doc.data().lastAccessedAt?.toDate?.()?.toISOString() ||
          doc.data().lastAccessedAt ||
          null,
      }))
      .filter((file) =>
        canAccessScopedResource({
          resourceData: file,
          structureId,
          isSuperAdmin,
        }),
      );

    // 5. BUILD BREADCRUMBS
    const breadcrumbs = [];

    if (folderId === null) {
      // Root has no breadcrumbs (or just a "Root" entry)
      breadcrumbs.push({
        id: null,
        nome: "Root",
        path: "/",
      });
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
            .collection("folders")
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
      counts: {
        subfolders: subfolders.length,
        files: files.length,
      },
    };
  } catch (error) {
    console.error("[GET_FOLDER_CONTENTS_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Internal function to create a folder
 */
export async function createFolderInternal({
  anagraficaId,
  nome,
  parentFolderId = null,
  structureId,
  userUid,
  userEmail,
}) {
  // 3. VALIDATE FOLDER NAME
  if (!nome || nome.trim().length === 0) {
    throw new Error("Folder name is required");
  }

  if (nome.length > 100) {
    throw new Error("Folder name must be 100 characters or less");
  }

  // 4. GET PARENT FOLDER (if specified)
  let depth = 0;
  let path = `/${nome}`;
  let parentPath = "";

  if (parentFolderId) {
    const { data: parentData } = await requireAnagraficaFolderAccess({
      userUid,
      folderId: parentFolderId,
      structureId,
    });

    // Verify parent belongs to same anagrafica
    if (parentData.anagraficaId !== anagraficaId) {
      throw new Error("Parent folder belongs to different anagrafica");
    }

    depth = parentData.depth + 1;
    parentPath = parentData.path;
    path = `${parentPath}/${nome}`;

    // Check max depth
    if (depth > MAX_FOLDER_DEPTH) {
      throw new Error(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`);
    }
  }

  // Check permissions inheritance for the new folder
  let allowedStructures = [];
  if (anagraficaId) {
    const anagraficaDoc = await adminDb
      .collection("anagrafica")
      .doc(anagraficaId)
      .get();
    if (anagraficaDoc.exists) {
      const data = anagraficaDoc.data() || {};
      allowedStructures = [
        ...new Set([
          ...normalizeIdArray(data.canBeAccessedBy),
          ...normalizeIdArray(data.structureIds),
        ]),
      ];
    }
  }

  // 5. CREATE FOLDER
  const folderData = {
    nome: nome.trim(),

    // Hierarchy
    anagraficaId,
    parentFolderId,
    path,
    depth,

    // Metadata
    isDefaultCategory: false,
    category: null,

    // Access Control
    structureIds: structureId ? [structureId] : allowedStructures,

    // Audit
    createdAt: new Date(),
    createdBy: userUid,
    createdByEmail: userEmail,
    updatedAt: new Date(),

    // Soft Delete
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  };

  const folderRef = await adminDb.collection("folders").add(folderData);

  // 6. AUDIT LOG
  await logDataCreate({
    actorUid: userUid,
    resourceType: "folder",
    resourceId: folderRef.id,
    structureId,
    details: {
      anagraficaId,
      folderName: nome,
      parentFolderId,
      depth,
    },
  });

  // 7. INVALIDATE CACHE
  const affectedFolders = parentFolderId ? [parentFolderId] : [];
  invalidateFolderCaches(anagraficaId, affectedFolders);

  return {
    success: true,
    folder: {
      id: folderRef.id,
      ...folderData,
    },
  };
}

/**
 * Create a new folder
 *
 * @param {Object} params
 * @param {string} params.anagraficaId - Anagrafica ID
 * @param {string} params.nome - Folder name
 * @param {string} params.parentFolderId - Parent folder ID (null for root)
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Created folder
 */
export async function createFolder({
  anagraficaId,
  nome,
  parentFolderId = null,
  structureId,
}) {
  try {
    // 1. AUTHENTICATION
    const { userUid, headers } = await requireUser();
    const userEmail = headers.get("x-user-email");

    // 2. VERIFY ACCESS
    await requireAnagraficaAccess({ userUid, anagraficaId, structureId });

    return await createFolderInternal({
      anagraficaId,
      nome,
      parentFolderId,
      structureId,
      userUid,
      userEmail,
    });
  } catch (error) {
    console.error("[CREATE_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Rename a folder (updates path for all children recursively)
 *
 * @param {Object} params
 * @param {string} params.folderId - Folder ID
 * @param {string} params.newName - New folder name
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Success status
 */
export async function renameFolder({ folderId, newName, structureId }) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. VALIDATE NAME
    if (!newName || newName.trim().length === 0) {
      throw new Error("Folder name is required");
    }

    if (newName.length > 100) {
      throw new Error("Folder name must be 100 characters or less");
    }

    // 3. GET FOLDER AND VERIFY ACCESS
    const { data: folderData, isSuperAdmin } =
      await requireAnagraficaFolderAccess({
        userUid,
        folderId,
        structureId,
      });

    // 5. CHECK IF DEFAULT CATEGORY FOLDER (cannot rename)
    if (folderData.isDefaultCategory) {
      throw new Error("Cannot rename default category folders");
    }

    // 6. UPDATE FOLDER AND ALL CHILDREN PATHS
    const oldPath = folderData.path;
    const oldName = folderData.nome;

    // Calculate new path
    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName.trim();
    const newPath = pathParts.join("/");

    // Get all descendant folders
    const descendantsSnapshot = await adminDb
      .collection("folders")
      .where("anagraficaId", "==", folderData.anagraficaId)
      .where("deleted", "==", false)
      .get();

    const descendantFolders = descendantsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((f) => f.path.startsWith(`${oldPath}/`));
    const descendants = descendantFolders.filter((f) =>
      canAccessScopedResource({
        resourceData: f,
        structureId,
        isSuperAdmin,
      }),
    );

    if (!isSuperAdmin && descendants.length !== descendantFolders.length) {
      throw new Error(
        "Cannot rename a folder that contains resources outside this structure",
      );
    }

    // Use batch to update
    const batch = adminDb.batch();
    const affectedFolderIds = [folderId];

    // Update main folder
    batch.update(adminDb.collection("folders").doc(folderId), {
      nome: newName.trim(),
      path: newPath,
      updatedAt: new Date(),
    });

    // Update all descendants
    descendants.forEach((descendant) => {
      const updatedPath = descendant.path.replace(oldPath, newPath);
      batch.update(adminDb.collection("folders").doc(descendant.id), {
        path: updatedPath,
        updatedAt: new Date(),
      });
      affectedFolderIds.push(descendant.id);
    });

    await batch.commit();

    // 7. AUDIT LOG
    await logDataUpdate({
      actorUid: userUid,
      resourceType: "folder",
      resourceId: folderId,
      structureId,
      changedFields: ["nome", "path"],
      details: {
        oldName,
        newName: newName.trim(),
        oldPath,
        newPath,
        affectedDescendants: descendants.length,
      },
    });

    // 8. INVALIDATE CACHE
    invalidateFolderCaches(folderData.anagraficaId, affectedFolderIds);

    return {
      success: true,
      message: "Folder renamed successfully",
      affectedCount: descendants.length + 1,
    };
  } catch (error) {
    console.error("[RENAME_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Delete a folder (soft delete)
 * Can cascade delete all contents if specified
 *
 * @param {Object} params
 * @param {string} params.folderId - Folder ID
 * @param {boolean} params.cascade - If true, delete all files and subfolders
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFolder({ folderId, cascade = false, structureId }) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. GET FOLDER AND VERIFY ACCESS
    const { data: folderData, isSuperAdmin } =
      await requireAnagraficaFolderAccess({
        userUid,
        folderId,
        structureId,
      });

    // 4. CHECK IF DEFAULT CATEGORY FOLDER (cannot delete)
    if (folderData.isDefaultCategory) {
      throw new Error("Cannot delete default category folders");
    }

    // 5. CHECK IF FOLDER IS EMPTY (unless cascade)
    const subfoldersSnapshot = await adminDb
      .collection("folders")
      .where("parentFolderId", "==", folderId)
      .where("deleted", "==", false)
      .get();

    const filesSnapshot = await adminDb
      .collection("files")
      .where("folderId", "==", folderId)
      .where("deleted", "==", false)
      .get();

    const directSubfolders = subfoldersSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((folder) =>
        canAccessScopedResource({
          resourceData: folder,
          structureId,
          isSuperAdmin,
        }),
      );

    const directFiles = filesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((file) =>
        canAccessScopedResource({
          resourceData: file,
          structureId,
          isSuperAdmin,
        }),
      );

    if (
      !isSuperAdmin &&
      (directSubfolders.length !== subfoldersSnapshot.docs.length ||
        directFiles.length !== filesSnapshot.docs.length)
    ) {
      throw new Error(
        "Cannot delete a folder that contains resources outside this structure",
      );
    }

    const hasContents = directSubfolders.length > 0 || directFiles.length > 0;

    if (hasContents && !cascade) {
      throw new Error(
        "Folder is not empty. Use cascade option to delete all contents.",
      );
    }

    let deletedCount = 0;
    const affectedFolderIds = [folderId];

    if (cascade && hasContents) {
      // 6. CASCADE DELETE: Get all descendants and files
      const allSubfoldersSnapshot = await adminDb
        .collection("folders")
        .where("anagraficaId", "==", folderData.anagraficaId)
        .where("deleted", "==", false)
        .get();

      const descendantFolders = allSubfoldersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f) => f.path.startsWith(`${folderData.path}/`));

      const descendants = descendantFolders.filter((f) =>
        canAccessScopedResource({
          resourceData: f,
          structureId,
          isSuperAdmin,
        }),
      );

      const allFilesSnapshot = await adminDb
        .collection("files")
        .where("anagraficaId", "==", folderData.anagraficaId)
        .where("deleted", "==", false)
        .get();

      const descendantFolderIds = new Set(descendantFolders.map((d) => d.id));
      const matchedFiles = allFilesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f) => {
          // Delete files in this folder or any descendant folder
          return f.folderId === folderId || descendantFolderIds.has(f.folderId);
        });

      const filesToDelete = matchedFiles.filter((f) =>
        canAccessScopedResource({
          resourceData: f,
          structureId,
          isSuperAdmin,
        }),
      );

      if (
        !isSuperAdmin &&
        (descendants.length !== descendantFolders.length ||
          filesToDelete.length !== matchedFiles.length)
      ) {
        throw new Error(
          "Cannot delete a folder that contains resources outside this structure",
        );
      }

      // Use batches (max 500 operations per batch)
      const allOperations = [
        ...descendants.map((d) => ({ type: "folder", id: d.id })),
        ...filesToDelete.map((f) => ({ type: "file", id: f.id })),
        { type: "folder", id: folderId },
      ];

      const batchSize = 500;
      for (let i = 0; i < allOperations.length; i += batchSize) {
        const batch = adminDb.batch();
        const batchOps = allOperations.slice(i, i + batchSize);

        batchOps.forEach((op) => {
          const ref = adminDb
            .collection(op.type === "folder" ? "folders" : "files")
            .doc(op.id);
          batch.update(ref, {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userUid,
            updatedAt: new Date(),
          });
        });

        await batch.commit();
        deletedCount += batchOps.length;
      }

      affectedFolderIds.push(...descendants.map((d) => d.id));
    } else {
      // 7. SIMPLE DELETE: Just delete the empty folder
      await adminDb.collection("folders").doc(folderId).update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userUid,
        updatedAt: new Date(),
      });
      deletedCount = 1;
    }

    // 8. AUDIT LOG
    await logDataDelete({
      actorUid: userUid,
      resourceType: "folder",
      resourceId: folderId,
      softDelete: true,
      details: {
        folderName: folderData.nome,
        cascade,
        deletedCount,
      },
    });

    // 9. INVALIDATE CACHE
    invalidateFolderCaches(folderData.anagraficaId, affectedFolderIds);

    return {
      success: true,
      message: "Folder deleted successfully",
      deletedCount,
    };
  } catch (error) {
    console.error("[DELETE_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Move folder to a new parent (updates paths for all children)
 *
 * @param {Object} params
 * @param {string} params.folderId - Folder ID to move
 * @param {string} params.newParentFolderId - New parent folder ID (null = root)
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Success status
 */
export async function moveFolder({ folderId, newParentFolderId, structureId }) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. GET FOLDER AND VERIFY ACCESS
    const { data: folderData, isSuperAdmin } =
      await requireAnagraficaFolderAccess({
        userUid,
        folderId,
        structureId,
      });

    // 4. CHECK IF DEFAULT CATEGORY FOLDER (cannot move)
    if (folderData.isDefaultCategory) {
      throw new Error("Cannot move default category folders");
    }

    // 5. VALIDATE NEW PARENT
    let newDepth = 0;
    let newParentPath = "";
    let newPath = `/${folderData.nome}`;

    if (newParentFolderId) {
      const { data: newParentData } = await requireAnagraficaFolderAccess({
        userUid,
        folderId: newParentFolderId,
        structureId,
      });

      // Verify parent belongs to same anagrafica
      if (newParentData.anagraficaId !== folderData.anagraficaId) {
        throw new Error("Cannot move folder to different anagrafica");
      }

      // Prevent circular reference (moving into own descendant)
      if (newParentData.path.startsWith(folderData.path)) {
        throw new Error("Cannot move folder into its own descendant");
      }

      newDepth = newParentData.depth + 1;
      newParentPath = newParentData.path;
      newPath = `${newParentPath}/${folderData.nome}`;

      // Check if this would exceed max depth (considering folder's descendants)
      const descendantsSnapshot = await adminDb
        .collection("folders")
        .where("anagraficaId", "==", folderData.anagraficaId)
        .where("deleted", "==", false)
        .get();

      const descendantFolders = descendantsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f) => f.path.startsWith(`${folderData.path}/`));

      const descendants = descendantFolders.filter((f) =>
        canAccessScopedResource({
          resourceData: f,
          structureId,
          isSuperAdmin,
        }),
      );

      if (!isSuperAdmin && descendants.length !== descendantFolders.length) {
        throw new Error(
          "Cannot move a folder that contains resources outside this structure",
        );
      }

      const maxDescendantDepth = descendants.reduce(
        (max, d) => Math.max(max, d.depth),
        folderData.depth,
      );
      const depthIncrease = newDepth - folderData.depth;
      const newMaxDepth = maxDescendantDepth + depthIncrease;

      if (newMaxDepth > MAX_FOLDER_DEPTH) {
        throw new Error(
          `Moving this folder would exceed maximum depth of ${MAX_FOLDER_DEPTH}`,
        );
      }
    }

    // 6. CHECK IF ALREADY AT TARGET LOCATION
    if (folderData.parentFolderId === newParentFolderId) {
      return {
        success: true,
        message: "Folder is already at target location",
      };
    }

    // 7. UPDATE FOLDER AND ALL DESCENDANTS
    const oldPath = folderData.path;
    const oldParentFolderId = folderData.parentFolderId;

    // Get all descendants
    const descendantsSnapshot = await adminDb
      .collection("folders")
      .where("anagraficaId", "==", folderData.anagraficaId)
      .where("deleted", "==", false)
      .get();

    const descendantFolders = descendantsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((f) => f.path.startsWith(`${oldPath}/`));

    const descendants = descendantFolders.filter((f) =>
      canAccessScopedResource({
        resourceData: f,
        structureId,
        isSuperAdmin,
      }),
    );

    if (!isSuperAdmin && descendants.length !== descendantFolders.length) {
      throw new Error(
        "Cannot move a folder that contains resources outside this structure",
      );
    }

    // Use batch to update
    const batch = adminDb.batch();
    const affectedFolderIds = [folderId];
    if (oldParentFolderId) affectedFolderIds.push(oldParentFolderId);
    if (newParentFolderId) affectedFolderIds.push(newParentFolderId);

    // Update main folder
    batch.update(adminDb.collection("folders").doc(folderId), {
      parentFolderId: newParentFolderId,
      path: newPath,
      depth: newDepth,
      updatedAt: new Date(),
    });

    // Update all descendants
    const depthDiff = newDepth - folderData.depth;
    descendants.forEach((descendant) => {
      const updatedPath = descendant.path.replace(oldPath, newPath);
      const updatedDepth = descendant.depth + depthDiff;

      batch.update(adminDb.collection("folders").doc(descendant.id), {
        path: updatedPath,
        depth: updatedDepth,
        updatedAt: new Date(),
      });
      affectedFolderIds.push(descendant.id);
    });

    await batch.commit();

    // 8. AUDIT LOG
    await logDataUpdate({
      actorUid: userUid,
      resourceType: "folder",
      resourceId: folderId,
      structureId,
      changedFields: ["parentFolderId", "path", "depth"],
      details: {
        folderName: folderData.nome,
        oldPath,
        newPath,
        oldParentFolderId,
        newParentFolderId,
        affectedDescendants: descendants.length,
      },
    });

    // 9. INVALIDATE CACHE
    invalidateFolderCaches(folderData.anagraficaId, affectedFolderIds);

    return {
      success: true,
      message: "Folder moved successfully",
      affectedCount: descendants.length + 1,
    };
  } catch (error) {
    console.error("[MOVE_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Move a file to a different folder
 *
 * @param {Object} params
 * @param {string} params.fileId - File ID
 * @param {string} params.targetFolderId - Target folder ID
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Success status
 */
export async function moveFileToFolder({
  fileId,
  targetFolderId,
  structureId,
}) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    const { data: fileData, isSuperAdmin } = await requireAnagraficaFileAccess({
      userUid,
      fileId,
      structureId,
      writable: true,
    });

    // 3. GET TARGET FOLDER (if not root)
    let targetFolderPath = "/"; // Default to root
    if (targetFolderId) {
      const targetFolderDoc = await adminDb
        .collection("folders")
        .doc(targetFolderId)
        .get();

      if (!targetFolderDoc.exists) {
        throw new Error("Target folder not found");
      }

      const targetFolderData = targetFolderDoc.data();

      if (targetFolderData.deleted) {
        throw new Error("Target folder not found");
      }

      // VERIFY FOLDER BELONGS TO SAME ANAGRAFICA
      if (targetFolderData.anagraficaId !== fileData.anagraficaId) {
        throw new Error("Cannot move file to folder in different anagrafica");
      }

      if (
        !canAccessScopedResource({
          resourceData: targetFolderData,
          structureId,
          isSuperAdmin,
        })
      ) {
        throw new Error("Target folder does not belong to this structure");
      }

      targetFolderPath = targetFolderData.path;
    }

    // 5. CHECK IF ALREADY IN TARGET FOLDER
    if (fileData.folderId === targetFolderId) {
      return {
        success: true,
        message: "File is already in target folder",
      };
    }

    const oldFolderId = fileData.folderId;

    // 7. UPDATE FILE
    await adminDb.collection("files").doc(fileId).update({
      folderId: targetFolderId,
      updatedAt: new Date(),
    });

    // 8. AUDIT LOG
    await logDataUpdate({
      actorUid: userUid,
      resourceType: "file",
      resourceId: fileId,
      structureId,
      changedFields: ["folderId"],
      details: {
        fileName: fileData.nome,
        oldFolderId,
        targetFolderId,
        targetFolderPath,
      },
    });

    // 9. INVALIDATE CACHE
    invalidateFolderCaches(fileData.anagraficaId, [
      oldFolderId,
      targetFolderId,
    ]);

    return {
      success: true,
      message: "File moved successfully",
    };
  } catch (error) {
    console.error("[MOVE_FILE_TO_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}

/**
 * Move multiple files to a folder (batch operation)
 *
 * @param {Object} params
 * @param {string[]} params.fileIds - Array of file IDs
 * @param {string} params.targetFolderId - Target folder ID
 * @param {string} params.structureId - Structure performing action
 * @returns {Promise<Object>} Batch operation result
 */
export async function moveFilesToFolder({
  fileIds,
  targetFolderId,
  structureId,
}) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. VALIDATE INPUT
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new Error("No files specified");
    }

    if (fileIds.length > 500) {
      throw new Error("Cannot move more than 500 files at once");
    }

    // 3. GET TARGET FOLDER (if not root) and verify access
    let targetFolderData = null;
    let anagraficaId = null;

    if (targetFolderId) {
      const { data } = await requireAnagraficaFolderAccess({
        userUid,
        folderId: targetFolderId,
        structureId,
      });
      targetFolderData = data;
      anagraficaId = targetFolderData.anagraficaId;
    } else {
      // Moving to root - need to get anagrafica from first file
      const { data: firstFileData } = await requireAnagraficaFileAccess({
        userUid,
        fileId: fileIds[0],
        structureId,
        writable: true,
      });
      anagraficaId = firstFileData.anagraficaId;
    }

    const { isSuperAdmin } = await requireAnagraficaAccess({
      userUid,
      anagraficaId,
      structureId,
    });

    if (
      targetFolderData &&
      !canAccessScopedResource({
        resourceData: targetFolderData,
        structureId,
        isSuperAdmin,
      })
    ) {
      throw new Error("Target folder does not belong to this structure");
    }

    // 5. GET ALL FILES AND VALIDATE
    const files = [];
    const affectedFolderIds = new Set(targetFolderId ? [targetFolderId] : []);

    for (const fileId of fileIds) {
      const { data: fileData } = await requireAnagraficaFileAccess({
        userUid,
        fileId,
        structureId,
        writable: true,
      });

      // Verify file belongs to same anagrafica
      if (fileData.anagraficaId !== anagraficaId) {
        console.warn(
          `Skipping file ${fileId}: belongs to different anagrafica`,
        );
        continue;
      }

      files.push({ id: fileId, ...fileData });
      if (fileData.folderId) {
        affectedFolderIds.add(fileData.folderId);
      }
    }

    if (files.length === 0) {
      throw new Error("No valid files to move");
    }

    // 6. UPDATE FILES IN BATCH
    const batch = adminDb.batch();

    files.forEach((file) => {
      if (file.folderId !== targetFolderId) {
        batch.update(adminDb.collection("files").doc(file.id), {
          folderId: targetFolderId,
          updatedAt: new Date(),
        });
      }
    });

    await batch.commit();

    // 7. AUDIT LOG
    await logDataUpdate({
      actorUid: userUid,
      resourceType: "files",
      resourceId: anagraficaId,
      structureId,
      changedFields: ["folderId"],
      details: {
        action: "batch_move_files",
        fileCount: files.length,
        targetFolderId,
        targetFolderPath: targetFolderData?.path || "/",
      },
    });

    // 8. INVALIDATE CACHE
    invalidateFolderCaches(anagraficaId, Array.from(affectedFolderIds));

    return {
      success: true,
      message: `Moved ${files.length} files successfully`,
      movedCount: files.length,
      skippedCount: fileIds.length - files.length,
    };
  } catch (error) {
    console.error("[MOVE_FILES_TO_FOLDER_ERROR]:", error);
    return {
      error: true,
      message: error.message,
    };
  }
}
