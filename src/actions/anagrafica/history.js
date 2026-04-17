"use server";

import admin from "@/lib/firebase/firebaseAdmin";
import { logger } from "@/utils/logger";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();

async function getAuthorizedActiveAnagrafica(anagraficaId, userUid) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    throw new Error("Anagrafica not found");
  }

  const anagraficaData = anagraficaSnap.data();
  if (anagraficaData.deletedAt) {
    throw new Error("Anagrafica not found");
  }

  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  await verifyUserPermissions({
    userUid,
    allowedStructures,
  });

  return { anagraficaRef };
}

/**
 * Create a history entry for an anagrafica change
 * @param {Object} params - History entry parameters
 * @param {string} params.anagraficaId - The anagrafica document ID
 * @param {string} params.changeType - Type of change ('create', 'update', 'delete')
 * @param {string[]} params.changedGroups - Array of group names that changed
 * @param {Object} params.changes - Object with before/after for each changed group
 * @param {string} params.userUid - User who made the change
 * @param {string} params.userMail - Email of user who made the change
 * @param {string} params.structureId - Structure from which change was made
 * @returns {Promise<{success: boolean, historyId?: string, error?: string}>} Result of history creation
 */
export async function createHistoryEntry({
  anagraficaId,
  changeType,
  changedGroups,
  changes,
  userUid,
  userMail = null,
  structureId = null,
  structureDataId = null, // New param
}) {
  try {
    // Determine where to save history
    // If structureDataId is provided AND we have structure-only changes, we might want to save there.
    // However, for simplicity and ensuring we don't lose data, let's split the logic.

    let targetRef;

    if (structureDataId) {
      // If we are given a structureDataId, we assume this is a structure-specific update
      // OR we are splitting.
      // For this iteration, let's treat "anagraficaId" as the Resource ID.
      // If structureDataId is passed, we write to THAT document's history.
      targetRef = adminDb
        .collection("anagrafica_data")
        .doc(structureDataId)
        .collection("history");
    } else {
      // Default: Global Anagrafica History
      targetRef = adminDb
        .collection("anagrafica")
        .doc(anagraficaId)
        .collection("history");
    }

    const historyEntry = {
      anagraficaId, // Always include for cross-referencing
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: userMail,
      changedByStructure: structureId,
      changeType,
      changedGroups,
      changes,
    };

    // Add structureDataId if saving to structure history
    if (structureDataId) {
      historyEntry.structureDataId = structureDataId;
    }

    const docRef = await targetRef.add(historyEntry);

    logger.info("History entry created", {
      anagraficaId,
      structureDataId,
      changeType,
      changedGroups,
      userUid,
      historyId: docRef.id,
    });

    return { success: true, historyId: docRef.id };
  } catch (error) {
    // Log the error but don't break the main operation
    // Return failure status so callers can handle if needed
    logger.error("Failed to create history entry", error, {
      anagraficaId,
      changeType,
      changedGroups,
    });

    return {
      success: false,
      error: `History creation failed: ${error.message}`,
    };
  }
}

/**
 * Get history entries for an anagrafica record
 * Fetches from both global (anagrafica/{id}/history) and structure-specific
 * (anagrafica_data/{id}/history) collections and merges them.
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} structureId - Optional structure ID to filter structure-specific history
 * @param {number} limit - Maximum number of entries to return (default 50)
 * @param {string} startAfterTimestamp - ISO timestamp to start after for pagination
 * @returns {Promise<Object>} Object with entries array and pagination info
 */
export async function getAnagraficaHistory(
  anagraficaId,
  structureId = null,
  limit = 50,
  startAfterTimestamp = null,
) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this anagrafica
    const { anagraficaRef } = await getAuthorizedActiveAnagrafica(
      anagraficaId,
      userUid,
    );

    // Helper to parse history entry
    const parseEntry = (doc, source) => {
      const data = doc.data();
      const changedAt = data.changedAt?.toDate?.() || data.changedAt;
      return {
        id: doc.id,
        source, // 'global' or 'structure'
        ...JSON.parse(JSON.stringify(data)),
        changedAt: changedAt instanceof Date ? changedAt : new Date(changedAt),
      };
    };

    // 1. Fetch global history
    let globalQuery = anagraficaRef
      .collection("history")
      .orderBy("changedAt", "desc")
      .limit(limit + 1);

    if (startAfterTimestamp) {
      globalQuery = globalQuery.where(
        "changedAt",
        "<",
        new Date(startAfterTimestamp),
      );
    }

    const globalSnapshot = await globalQuery.get();
    const globalEntries = globalSnapshot.docs.map((doc) =>
      parseEntry(doc, "global"),
    );

    // 2. Fetch structure-specific history
    const structureEntries = [];

    // Find all anagrafica_data documents for this anagrafica
    const structureDataQuery = adminDb
      .collection("anagrafica_data")
      .where("anagraficaId", "==", anagraficaId);

    const structureDataSnap = await structureDataQuery.get();

    // Fetch history from each structure data document
    for (const structureDoc of structureDataSnap.docs) {
      // If structureId filter is provided, only fetch that structure's history
      if (structureId && structureDoc.data().structureId !== structureId) {
        continue;
      }

      let historyQuery = structureDoc.ref
        .collection("history")
        .orderBy("changedAt", "desc")
        .limit(limit + 1);

      if (startAfterTimestamp) {
        historyQuery = historyQuery.where(
          "changedAt",
          "<",
          new Date(startAfterTimestamp),
        );
      }

      const historySnap = await historyQuery.get();
      const entries = historySnap.docs.map((doc) => ({
        ...parseEntry(doc, "structure"),
        structureDataId: structureDoc.id,
        structureId: structureDoc.data().structureId,
      }));

      structureEntries.push(...entries);
    }

    // 3. Merge and sort all entries by changedAt descending
    const allEntries = [...globalEntries, ...structureEntries].sort(
      (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
    );

    // 4. Apply limit and check for more
    const hasMore = allEntries.length > limit;
    const entries = allEntries.slice(0, limit);

    // Convert dates to ISO strings for JSON serialization
    const serializedEntries = entries.map((e) => ({
      ...e,
      changedAt: e.changedAt.toISOString(),
    }));

    return JSON.stringify({
      entries: serializedEntries,
      hasMore,
      lastTimestamp:
        entries.length > 0
          ? entries[entries.length - 1].changedAt.toISOString()
          : null,
    });
  } catch (error) {
    logger.error("Error fetching anagrafica history", error, { anagraficaId });
    throw error;
  }
}

/**
 * Get a single history entry with full details
 * Searches in both global and structure-specific history collections.
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} historyId - The history entry ID
 * @param {string} structureDataId - Optional structure data ID if known (for direct lookup)
 * @returns {Promise<Object>} The history entry
 */
export async function getHistoryEntry(
  anagraficaId,
  historyId,
  structureDataId = null,
) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this anagrafica
    const { anagraficaRef } = await getAuthorizedActiveAnagrafica(
      anagraficaId,
      userUid,
    );

    let historySnap = null;
    let source = "global";

    // If structureDataId is provided, look directly in structure history
    if (structureDataId) {
      const structureHistoryRef = adminDb
        .collection("anagrafica_data")
        .doc(structureDataId)
        .collection("history")
        .doc(historyId);
      historySnap = await structureHistoryRef.get();
      source = "structure";
    }

    // If not found or structureDataId not provided, try global history
    if (!historySnap || !historySnap.exists) {
      const globalHistoryRef = anagraficaRef
        .collection("history")
        .doc(historyId);
      historySnap = await globalHistoryRef.get();
      source = "global";
    }

    // If still not found, search all structure data history collections
    if (!historySnap.exists) {
      const structureDataQuery = adminDb
        .collection("anagrafica_data")
        .where("anagraficaId", "==", anagraficaId);
      const structureDataSnap = await structureDataQuery.get();

      for (const structureDoc of structureDataSnap.docs) {
        const historyRef = structureDoc.ref
          .collection("history")
          .doc(historyId);
        const snap = await historyRef.get();
        if (snap.exists) {
          historySnap = snap;
          source = "structure";
          break;
        }
      }
    }

    if (!historySnap || !historySnap.exists) {
      throw new Error("History entry not found");
    }

    const data = historySnap.data();
    const changedAt = data.changedAt?.toDate?.() || data.changedAt;

    return JSON.stringify({
      id: historySnap.id,
      source,
      ...JSON.parse(JSON.stringify(data)),
      changedAt:
        changedAt instanceof Date ? changedAt.toISOString() : changedAt,
    });
  } catch (error) {
    logger.error("Error fetching history entry", error, {
      anagraficaId,
      historyId,
    });
    throw error;
  }
}
