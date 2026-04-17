"use server";

import { invalidateAnagraficaCaches } from "@/lib/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import { serializeFirestoreData } from "@/lib/utils";
import {
  getOutgoingSharedFields,
  normalizeSharedFields,
  removeSharedDataGrantsForStructure,
  sanitizeSharedDataGrants,
} from "@/utils/anagraficaSharing";
import { logDataDelete, logResourceModification } from "@/utils/audit";
import { logger } from "@/utils/logger";
import {
  requireUser,
  verifyStructureAdmin,
  verifyUserPermissions,
} from "@/utils/server-auth";

const adminDb = admin.firestore();

function getSharedDataGrants(anagraficaData = {}) {
  return sanitizeSharedDataGrants(anagraficaData.sharedDataGrants || []);
}

function splitIntoChunks(items = [], batchSize = 30) {
  const chunks = [];

  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }

  return chunks;
}

/**
 * Soft delete anagrafica — admin-only.
 * Adds verifyStructureAdmin guard on top of the existing internal function.
 * Includes transaction guard to reject if record became shared after dialog opened.
 *
 * @param {string} anagraficaId
 * @param {string} structureId - The admin's current structure
 */
export async function deleteAnagraficaAsAdmin(anagraficaId, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });

    const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);

    const allowedStructures = await adminDb.runTransaction(
      async (transaction) => {
        const snap = await transaction.get(anagraficaRef);

        if (!snap.exists) {
          const e = new Error("Anagrafica non trovata");
          e.code = "NOT_FOUND";
          throw e;
        }

        const data = snap.data();

        if (data.deletedAt) {
          const e = new Error("Scheda già eliminata");
          e.code = "ALREADY_DELETED";
          throw e;
        }

        const canBeAccessedBy = data.canBeAccessedBy || [];

        if (!canBeAccessedBy.includes(structureId)) {
          const e = new Error("Struttura non associata a questa scheda");
          e.code = "FORBIDDEN";
          throw e;
        }

        if (canBeAccessedBy.length > 1) {
          const e = new Error(
            'La scheda è ora condivisa con altre strutture. Ricarica la pagina e usa "Rimuovi dalla struttura".',
          );
          e.code = "SHARED_RECORD";
          throw e;
        }

        transaction.update(anagraficaRef, {
          deletedAt: new Date(),
          deletedBy: userUid,
          deleted: true,
        });

        return canBeAccessedBy;
      },
    );

    invalidateAnagraficaCaches(anagraficaId, allowedStructures);

    await logDataDelete({
      actorUid: userUid,
      resourceType: "anagrafica",
      resourceId: anagraficaId,
      softDelete: true,
      details: { structureId },
    });

    return { success: true, message: "Scheda eliminata con successo" };
  } catch (err) {
    console.error("[DELETE_ANAGRAFICA_AS_ADMIN]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Remove the current structure from a shared anagrafica.
 * Admin-only. Record stays accessible to other structures.
 * Also removes structureId from `structureIds` (kept in sync with canBeAccessedBy).
 * Cleans up anagrafica_data document for this structure.
 *
 * @param {string} anagraficaId
 * @param {string} structureId - Structure to remove
 */
export async function removeStructureFromAnagrafica(anagraficaId, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });

    const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);

    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(anagraficaRef);

      if (!snap.exists) {
        const e = new Error("Anagrafica non trovata");
        e.code = "NOT_FOUND";
        throw e;
      }

      const data = snap.data();

      if (data.deletedAt) {
        const e = new Error("Anagrafica non trovata");
        e.code = "NOT_FOUND";
        throw e;
      }
      const canBeAccessedBy = data.canBeAccessedBy || [];

      if (!canBeAccessedBy.includes(structureId)) {
        throw new Error("Struttura non associata a questa scheda");
      }

      if (canBeAccessedBy.length === 1) {
        const e = new Error(
          "Sei l'unica struttura associata. Usa elimina definitiva.",
        );
        e.code = "LAST_STRUCTURE";
        throw e;
      }

      const updatedCanBeAccessedBy = canBeAccessedBy.filter(
        (id) => id !== structureId,
      );
      const updatedStructureIds = (data.structureIds || []).filter(
        (id) => id !== structureId,
      );
      const updatedSharedDataGrants = removeSharedDataGrantsForStructure(
        data.sharedDataGrants || [],
        structureId,
      );

      transaction.update(anagraficaRef, {
        canBeAccessedBy: updatedCanBeAccessedBy,
        structureIds: updatedStructureIds,
        sharedDataGrants: updatedSharedDataGrants,
      });
    });

    try {
      const dataQuery = await adminDb
        .collection("anagrafica_data")
        .where("anagraficaId", "==", anagraficaId)
        .where("structureId", "==", structureId)
        .get();

      const deleteOperations = dataQuery.docs.map((doc) => doc.ref.delete());
      await Promise.all(deleteOperations);
    } catch (cleanupErr) {
      console.error("[REMOVE_STRUCTURE_CLEANUP_ERROR]:", cleanupErr);
    }

    invalidateAnagraficaCaches(anagraficaId, [structureId]);

    await logDataDelete({
      actorUid: userUid,
      resourceType: "anagrafica",
      resourceId: anagraficaId,
      softDelete: false,
      details: { action: "removed_from_structure", structureId },
    });

    return { success: true, message: "Struttura rimossa con successo" };
  } catch (err) {
    console.error("[REMOVE_STRUCTURE_FROM_ANAGRAFICA]:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Share an anagrafica with additional structures.
 * User must be in the target structure OR the target structure must be in the same project
 * as the current structure.
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} currentStructureId - The current structure ID (for project context)
 * @param {string[]} targetStructureIds - Array of structure IDs to share with or update
 * @param {string[]} sharedFields - Optional structure-owned fields to expose from the current structure
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function shareAnagraficaWithStructures(
  anagraficaId,
  currentStructureId,
  targetStructureIds,
  sharedFields = [],
) {
  try {
    const { userUid } = await requireUser();

    if (!currentStructureId) {
      return { success: false, error: "Current structure is required" };
    }

    if (!targetStructureIds || targetStructureIds.length === 0) {
      return { success: false, error: "No structures selected" };
    }

    const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      return { success: false, error: "Anagrafica not found" };
    }

    const anagraficaData = anagraficaSnap.data();
    const normalizedSharedFields = normalizeSharedFields(sharedFields);

    if (anagraficaData.deletedAt) {
      return { success: false, error: "Anagrafica not found" };
    }

    const allowedStructures = anagraficaData.canBeAccessedBy || [];
    await verifyUserPermissions({ userUid, allowedStructures });
    await verifyUserPermissions({ userUid, structureId: currentStructureId });
    await verifyStructureAdmin({ userUid, structureId: currentStructureId });

    if (!allowedStructures.includes(currentStructureId)) {
      return {
        success: false,
        error: "Current structure does not have access to this anagrafica",
      };
    }

    const existingSharedDataGrants = getSharedDataGrants(anagraficaData);
    const existingOutgoingGrantMap = new Map(
      existingSharedDataGrants
        .filter((grant) => grant.sourceStructureId === currentStructureId)
        .map((grant) => [grant.targetStructureId, grant.sharedFields]),
    );

    const operatorDoc = await adminDb.collection("operators").doc(userUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const userStructureIds = operatorData.structureIds || [];
    const isSuperAdmin = operatorData.role === "admin";

    let currentProjectId = null;
    if (currentStructureId) {
      const currentStructureDoc = await adminDb
        .collection("structures")
        .doc(currentStructureId)
        .get();
      if (currentStructureDoc.exists) {
        currentProjectId = currentStructureDoc.data().projectId;
      }
    }

    const manageableStructureIds = [];
    const newStructureIds = [];
    for (const structureId of targetStructureIds) {
      if (!structureId || structureId === currentStructureId) {
        continue;
      }

      if (allowedStructures.includes(structureId)) {
        manageableStructureIds.push(structureId);
        continue;
      }

      const targetStructureDoc = await adminDb
        .collection("structures")
        .doc(structureId)
        .get();
      if (!targetStructureDoc.exists) {
        continue;
      }

      const targetStructureData = targetStructureDoc.data();
      const userIsInTargetStructure = userStructureIds.includes(structureId);
      const sameProject =
        currentProjectId && targetStructureData.projectId === currentProjectId;

      if (isSuperAdmin || userIsInTargetStructure || sameProject) {
        manageableStructureIds.push(structureId);
        newStructureIds.push(structureId);
      }
    }

    const uniqueManageableStructureIds = [...new Set(manageableStructureIds)];
    const uniqueNewStructureIds = [...new Set(newStructureIds)];

    if (uniqueManageableStructureIds.length === 0) {
      return {
        success: false,
        error:
          "No valid structures to share with. You can only share with structures you belong to or structures in the same project.",
      };
    }

    const newCanBeAccessedBy = [
      ...new Set([...allowedStructures, ...uniqueNewStructureIds]),
    ];
    const updatedSharedDataGrants = (() => {
      const baseWithoutManagedTargets = existingSharedDataGrants.filter(
        (grant) =>
          !(
            grant.sourceStructureId === currentStructureId &&
            uniqueManageableStructureIds.includes(grant.targetStructureId)
          ),
      );

      if (normalizedSharedFields.length === 0) {
        return baseWithoutManagedTargets;
      }

      return sanitizeSharedDataGrants([
        ...baseWithoutManagedTargets,
        ...uniqueManageableStructureIds.map((targetStructureId) => {
          const previousGrant = existingSharedDataGrants.find(
            (grant) =>
              grant.sourceStructureId === currentStructureId &&
              grant.targetStructureId === targetStructureId,
          );

          return {
            sourceStructureId: currentStructureId,
            targetStructureId,
            sharedFields: normalizedSharedFields,
            createdAt: previousGrant?.createdAt || new Date(),
            createdBy: previousGrant?.createdBy || userUid,
            updatedAt: new Date(),
            updatedBy: userUid,
          };
        }),
      ]);
    })();

    const grantSummary = uniqueManageableStructureIds.reduce(
      (summary, targetStructureId) => {
        const previousFields =
          existingOutgoingGrantMap.get(targetStructureId) || [];
        const previousKey = JSON.stringify(previousFields);
        const nextKey = JSON.stringify(normalizedSharedFields);

        if (normalizedSharedFields.length === 0 && previousFields.length > 0) {
          summary.clearedCount += 1;
        } else if (
          normalizedSharedFields.length > 0 &&
          previousKey !== nextKey
        ) {
          summary.policyUpdatedCount += 1;
        }

        return summary;
      },
      { policyUpdatedCount: 0, clearedCount: 0 },
    );

    await anagraficaRef.update({
      canBeAccessedBy: newCanBeAccessedBy,
      structureIds: newCanBeAccessedBy,
      sharedDataGrants: updatedSharedDataGrants,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logResourceModification({
      actorUid: userUid,
      resourceType: "anagrafica",
      resourceId: anagraficaId,
      action: "share",
      details: {
        addedStructures: uniqueNewStructureIds,
        totalStructures: newCanBeAccessedBy.length,
        sharedFields: normalizedSharedFields,
        policyUpdatedCount: grantSummary.policyUpdatedCount,
        clearedCount: grantSummary.clearedCount,
      },
    });

    invalidateAnagraficaCaches(anagraficaId, newCanBeAccessedBy);

    logger.info("Shared anagrafica with structures", {
      anagraficaId,
      addedStructures: uniqueNewStructureIds,
      sharedFields: normalizedSharedFields,
      actorUid: userUid,
    });

    return {
      success: true,
      addedCount: uniqueNewStructureIds.length,
      policyUpdatedCount: grantSummary.policyUpdatedCount,
      clearedCount: grantSummary.clearedCount,
      sharedFields: normalizedSharedFields,
    };
  } catch (error) {
    logger.error("Error sharing anagrafica", error, { anagraficaId });
    return { success: false, error: error.message };
  }
}

/**
 * Get structures available for sharing an anagrafica.
 * Returns structures the user is in OR structures in the same project.
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} currentStructureId - The current structure ID (for project context)
 * @returns {Promise<{success: boolean, structures?: Array, error?: string}>}
 */
export async function getAvailableStructuresForSharing(
  anagraficaId,
  currentStructureId,
) {
  try {
    const { userUid } = await requireUser();

    if (!currentStructureId) {
      return { success: false, error: "Current structure is required" };
    }

    const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      return { success: false, error: "Anagrafica not found" };
    }

    const anagraficaData = anagraficaSnap.data();
    const currentlySharedWith = anagraficaData.canBeAccessedBy || [];
    const sharedDataGrants = getSharedDataGrants(anagraficaData);

    await verifyUserPermissions({
      userUid,
      allowedStructures: currentlySharedWith,
    });
    await verifyUserPermissions({ userUid, structureId: currentStructureId });
    await verifyStructureAdmin({ userUid, structureId: currentStructureId });

    if (!currentlySharedWith.includes(currentStructureId)) {
      return {
        success: false,
        error: "Current structure does not have access to this anagrafica",
      };
    }

    const operatorDoc = await adminDb.collection("operators").doc(userUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const userStructureIds = operatorData.structureIds || [];

    let currentProjectId = null;
    let projectStructureIds = [];

    if (currentStructureId) {
      const currentStructureDoc = await adminDb
        .collection("structures")
        .doc(currentStructureId)
        .get();
      if (currentStructureDoc.exists) {
        currentProjectId = currentStructureDoc.data().projectId;

        if (currentProjectId) {
          const projectStructuresSnap = await adminDb
            .collection("structures")
            .where("projectId", "==", currentProjectId)
            .get();

          projectStructureIds = projectStructuresSnap.docs.map((doc) => doc.id);
        }
      }
    }

    const manageableStructureIds = [
      ...new Set([
        ...userStructureIds,
        ...projectStructureIds,
        ...currentlySharedWith.filter((id) => id !== currentStructureId),
      ]),
    ].filter((id) => id && id !== currentStructureId);

    if (manageableStructureIds.length === 0) {
      return { success: true, structures: [] };
    }

    const structures = [];

    for (const batch of splitIntoChunks(manageableStructureIds, 30)) {
      const batchSnap = await adminDb
        .collection("structures")
        .where("__name__", "in", batch)
        .get();

      for (const doc of batchSnap.docs) {
        const data = doc.data();
        const sharedFields = getOutgoingSharedFields(
          sharedDataGrants,
          currentStructureId,
          doc.id,
        );
        structures.push({
          id: doc.id,
          name: data.name,
          city: data.city || "",
          projectId: data.projectId || null,
          isUserStructure: userStructureIds.includes(doc.id),
          isSameProject: projectStructureIds.includes(doc.id),
          isCurrentlyShared: currentlySharedWith.includes(doc.id),
          sharedFields,
        });
      }
    }

    structures.sort((a, b) => {
      if (a.isCurrentlyShared && !b.isCurrentlyShared) return -1;
      if (!a.isCurrentlyShared && b.isCurrentlyShared) return 1;
      if (a.isUserStructure && !b.isUserStructure) return -1;
      if (!a.isUserStructure && b.isUserStructure) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, structures: serializeFirestoreData(structures) };
  } catch (error) {
    logger.error("Error getting available structures for sharing", error, {
      anagraficaId,
    });
    return { success: false, error: error.message };
  }
}
