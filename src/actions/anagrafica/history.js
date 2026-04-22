"use server";

import admin from "@/lib/firebase/firebaseAdmin";
import { stripHtml } from "@/utils/htmlSanitizer";
import { logger } from "@/utils/logger";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?._seconds) return new Date(value._seconds * 1000);
  if (value?.seconds) return new Date(value.seconds * 1000);
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toIsoString(value) {
  const date = normalizeDateValue(value);
  return date ? date.toISOString() : null;
}

function serializeObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function summarizeServices(services = []) {
  if (!Array.isArray(services) || services.length === 0) {
    return "Nessun servizio collegato";
  }

  const serviceTypes = services
    .map((service) => service?.tipoAccesso)
    .filter(Boolean);

  if (!serviceTypes.length) {
    return `${services.length} ${services.length === 1 ? "servizio" : "servizi"} registrati`;
  }

  const visibleTypes = serviceTypes.slice(0, 3).join(", ");
  const remaining = serviceTypes.length - 3;
  return remaining > 0 ? `${visibleTypes} +${remaining}` : visibleTypes;
}

function summarizeHistoryChange(data = {}) {
  const groups = data.changedGroups || [];
  if (groups.length) {
    return groups.join(", ");
  }

  const changes = data.changes || {};
  const changedGroups = Object.keys(changes);
  return changedGroups.length
    ? changedGroups.join(", ")
    : "Dettagli modifica disponibili";
}

function matchesStructureScope(data = {}, structureId = null) {
  if (!structureId) return true;

  if (
    data.structureId === structureId ||
    data.changedByStructure === structureId ||
    data.createdByStructure === structureId ||
    data.uploadedByStructure === structureId
  ) {
    return true;
  }

  const structureIds = data.structureIds || data.canBeAccessedBy || [];
  if (Array.isArray(structureIds) && structureIds.includes(structureId)) {
    return true;
  }

  return !data.structureId && !data.structureIds && !data.uploadedByStructure;
}

function buildHistoryActivity({ entry, id, source, kind, title, accessId }) {
  return {
    id,
    kind,
    occurredAt: toIsoString(entry.changedAt),
    title,
    description: summarizeHistoryChange(entry),
    actor: entry.changedByMail || entry.changedBy || null,
    structureId: entry.changedByStructure || null,
    changeType: entry.changeType || "update",
    changedGroups: entry.changedGroups || [],
    changes: serializeObject(entry.changes),
    source,
    accessId: accessId || null,
  };
}

function parseHistoryDoc(doc, source) {
  const data = doc.data();
  const changedAt = normalizeDateValue(data.changedAt);

  return {
    id: doc.id,
    source,
    ...serializeObject(data),
    changedAt,
  };
}

async function fetchAnagraficaHistoryEntries({
  anagraficaRef,
  anagraficaId,
  structureId = null,
  limit = 50,
}) {
  const globalSnapshot = await anagraficaRef
    .collection("history")
    .orderBy("changedAt", "desc")
    .limit(limit)
    .get();

  const globalEntries = globalSnapshot.docs.map((doc) =>
    parseHistoryDoc(doc, "global"),
  );

  const structureEntries = [];
  const structureDataSnap = await adminDb
    .collection("anagrafica_data")
    .where("anagraficaId", "==", anagraficaId)
    .get();

  for (const structureDoc of structureDataSnap.docs) {
    const structureData = structureDoc.data();
    if (structureId && structureData.structureId !== structureId) {
      continue;
    }

    const historySnap = await structureDoc.ref
      .collection("history")
      .orderBy("changedAt", "desc")
      .limit(limit)
      .get();

    const entries = historySnap.docs.map((doc) => ({
      ...parseHistoryDoc(doc, "structure"),
      structureDataId: structureDoc.id,
      structureId: structureData.structureId,
    }));

    structureEntries.push(...entries);
  }

  return [...globalEntries, ...structureEntries].filter(
    (entry) => entry.changedAt,
  );
}

function countActivities(activities = []) {
  const now = Date.now();
  return activities.reduce(
    (counts, activity) => {
      counts.total += 1;
      if (activity.kind.includes("history")) counts.changes += 1;
      if (activity.kind.startsWith("access")) counts.accesses += 1;
      if (activity.kind.startsWith("reminder")) counts.reminders += 1;
      if (activity.kind.startsWith("file")) counts.files += 1;

      const activityTime = normalizeDateValue(activity.occurredAt)?.getTime();
      if (
        activityTime &&
        activityTime >= now &&
        ["reminder_due", "file_expiry"].includes(activity.kind)
      ) {
        counts.upcoming += 1;
      }

      return counts;
    },
    {
      total: 0,
      changes: 0,
      accesses: 0,
      reminders: 0,
      files: 0,
      upcoming: 0,
    },
  );
}

async function getAuthorizedActiveAnagrafica(
  anagraficaId,
  userUid,
  structureId = null,
) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    throw new Error("Anagrafica not found");
  }

  const anagraficaData = anagraficaSnap.data();
  if (anagraficaData.deletedAt) {
    throw new Error("Anagrafica not found");
  }

  const allowedStructures =
    anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  await verifyUserPermissions({
    userUid,
    allowedStructures,
  });

  if (structureId) {
    await verifyUserPermissions({ userUid, structureId });

    if (!allowedStructures.includes(structureId)) {
      throw new Error("Forbidden: structureId not allowed for this anagrafica");
    }
  }

  return { anagraficaRef, anagraficaData, allowedStructures };
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
      structureId,
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
 * Get a unified operational timeline for an anagrafica record.
 * Merges anagrafica history, access events, reminders, and files.
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string|null} structureId - Optional structure scope
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<string>} JSON string with activities and counts
 */
export async function getAnagraficaActivityTimeline(
  anagraficaId,
  structureId = null,
  limit = 80,
) {
  try {
    const { userUid } = await requireUser();
    const normalizedLimit = Math.max(
      10,
      Math.min(Number.parseInt(limit, 10) || 80, 150),
    );

    const { anagraficaRef } = await getAuthorizedActiveAnagrafica(
      anagraficaId,
      userUid,
      structureId,
    );

    const [historyEntries, accessSnap, remindersSnap, filesSnap] =
      await Promise.all([
        fetchAnagraficaHistoryEntries({
          anagraficaRef,
          anagraficaId,
          structureId,
          limit: normalizedLimit,
        }),
        adminDb
          .collection("accessi")
          .where("anagraficaId", "==", anagraficaId)
          .get(),
        adminDb
          .collection("reminders")
          .where("anagraficaId", "==", anagraficaId)
          .get(),
        adminDb
          .collection("files")
          .where("anagraficaId", "==", anagraficaId)
          .get(),
      ]);

    const activities = [];

    historyEntries.forEach((entry) => {
      activities.push(
        buildHistoryActivity({
          entry,
          id: `anagrafica-history-${entry.source}-${entry.id}`,
          source: entry.source,
          kind: "anagrafica_history",
          title:
            entry.changeType === "create"
              ? "Scheda creata"
              : "Scheda aggiornata",
        }),
      );
    });

    const accessDocs = accessSnap.docs.filter((doc) =>
      matchesStructureScope(doc.data(), structureId),
    );

    const accessHistoryGroups = await Promise.all(
      accessDocs.slice(0, normalizedLimit).map(async (doc) => {
        const historySnap = await doc.ref
          .collection("history")
          .orderBy("changedAt", "desc")
          .limit(20)
          .get();

        return {
          accessId: doc.id,
          entries: historySnap.docs.map((historyDoc) =>
            parseHistoryDoc(historyDoc, "access"),
          ),
        };
      }),
    );

    accessDocs.forEach((doc) => {
      const data = doc.data();
      const services = Array.isArray(data.services) ? data.services : [];
      const createdAt = toIsoString(data.createdAt);

      if (createdAt) {
        activities.push({
          id: `access-created-${doc.id}`,
          kind: "access_created",
          occurredAt: createdAt,
          title: "Accesso registrato",
          description: summarizeServices(services),
          actor: data.createdByEmail || data.createdBy || null,
          structureId: data.createdByStructure || null,
          accessId: doc.id,
          serviceCount: services.length,
        });
      }
    });

    accessHistoryGroups.forEach(({ accessId, entries }) => {
      entries.forEach((entry) => {
        if (entry.changeType === "create") return;

        activities.push(
          buildHistoryActivity({
            entry,
            id: `access-history-${accessId}-${entry.id}`,
            source: "access",
            kind: "access_history",
            title:
              entry.changeType === "delete"
                ? "Accesso eliminato"
                : "Accesso aggiornato",
            accessId,
          }),
        );
      });
    });

    remindersSnap.docs
      .filter((doc) => matchesStructureScope(doc.data(), structureId))
      .forEach((doc) => {
        const data = doc.data();
        const occurredAt = toIsoString(data.date);
        if (!occurredAt) return;

        const description = [
          data.serviceType,
          data.enteRiferimento,
          stripHtml(data.note),
        ]
          .filter(Boolean)
          .join(" · ");

        activities.push({
          id: `reminder-${doc.id}`,
          kind: "reminder_due",
          occurredAt,
          title:
            data.status === "completed"
              ? "Promemoria completato"
              : "Promemoria in agenda",
          description: description || "Promemoria senza dettagli",
          actor: data.createdBy || null,
          structureId: data.structureId || null,
          accessId: data.accessId || null,
          reminderId: doc.id,
          status: data.status || "pending",
          linkedToAccess: data.linkedToAccess === true,
        });
      });

    const filePathSet = new Set();

    filesSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return (
          data.deleted !== true && matchesStructureScope(data, structureId)
        );
      })
      .forEach((doc) => {
        const data = doc.data();
        if (data.path) filePathSet.add(data.path);

        const fileName = data.nomeOriginale || data.nome || "Documento";
        const createdAt = toIsoString(data.createdAt || data.dataCreazione);
        const expiresAt = toIsoString(data.dataScadenza);

        if (createdAt) {
          activities.push({
            id: `file-uploaded-${doc.id}`,
            kind: "file_uploaded",
            occurredAt: createdAt,
            title: "Documento caricato",
            description: fileName,
            actor: data.uploadedByEmail || data.uploadedBy || null,
            structureId: data.uploadedByStructure || null,
            accessId: data.accessoId || null,
            fileId: doc.id,
            fileName,
          });
        }

        if (expiresAt) {
          activities.push({
            id: `file-expiry-${doc.id}`,
            kind: "file_expiry",
            occurredAt: expiresAt,
            title: "Scadenza documento",
            description: fileName,
            actor: null,
            structureId: data.uploadedByStructure || null,
            accessId: data.accessoId || null,
            fileId: doc.id,
            fileName,
          });
        }
      });

    accessDocs.forEach((doc) => {
      const accessData = doc.data();
      const services = Array.isArray(accessData.services)
        ? accessData.services
        : [];

      services.forEach((service, serviceIndex) => {
        (service.files || []).forEach((file, fileIndex) => {
          if (file.path && filePathSet.has(file.path)) return;

          const fileName = file.nomeOriginale || file.nome || "Documento";
          const createdAt = toIsoString(
            file.dataCreazione || accessData.createdAt,
          );
          const expiresAt = toIsoString(file.dataScadenza);
          const fallbackId = `${doc.id}-${serviceIndex}-${fileIndex}`;

          if (createdAt) {
            activities.push({
              id: `embedded-file-uploaded-${fallbackId}`,
              kind: "file_uploaded",
              occurredAt: createdAt,
              title: "Documento caricato",
              description: `${fileName} · ${service.tipoAccesso || "Accesso"}`,
              actor: accessData.createdByEmail || accessData.createdBy || null,
              structureId: accessData.createdByStructure || null,
              accessId: doc.id,
              fileName,
            });
          }

          if (expiresAt) {
            activities.push({
              id: `embedded-file-expiry-${fallbackId}`,
              kind: "file_expiry",
              occurredAt: expiresAt,
              title: "Scadenza documento",
              description: `${fileName} · ${service.tipoAccesso || "Accesso"}`,
              actor: null,
              structureId: accessData.createdByStructure || null,
              accessId: doc.id,
              fileName,
            });
          }
        });
      });
    });

    const now = Date.now();
    const sortedActivities = activities
      .filter((activity) => activity.occurredAt)
      .sort((a, b) => {
        const aTime = normalizeDateValue(a.occurredAt)?.getTime() || 0;
        const bTime = normalizeDateValue(b.occurredAt)?.getTime() || 0;
        const aUpcoming =
          aTime >= now && ["reminder_due", "file_expiry"].includes(a.kind);
        const bUpcoming =
          bTime >= now && ["reminder_due", "file_expiry"].includes(b.kind);

        if (aUpcoming && bUpcoming) {
          return aTime - bTime;
        }

        if (aUpcoming !== bUpcoming) {
          return aUpcoming ? -1 : 1;
        }

        return bTime - aTime;
      });

    return JSON.stringify({
      success: true,
      activities: sortedActivities.slice(0, normalizedLimit),
      counts: countActivities(sortedActivities),
    });
  } catch (error) {
    logger.error("Error fetching anagrafica activity timeline", error, {
      anagraficaId,
      structureId,
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      activities: [],
      counts: countActivities([]),
    });
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
