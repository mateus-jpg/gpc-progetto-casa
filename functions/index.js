const admin = require("firebase-admin");
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { getISOWeek, differenceInYears } = require("date-fns");

admin.initializeApp();
const db = admin.firestore();

async function authorizeAdminRequest(req) {
  const authHeader =
    req.get("authorization") || req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const maintenanceSecret = process.env.RECALCULATE_STATS_SECRET;
  if (maintenanceSecret && token === maintenanceSecret) {
    return { ok: true, actorUid: "maintenance-secret" };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    const operatorDoc = await db
      .collection("operators")
      .doc(decodedToken.uid)
      .get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : null;

    if (operatorData?.role !== "admin") {
      return { ok: false, status: 403, error: "Admin privileges required" };
    }

    return { ok: true, actorUid: decodedToken.uid };
  } catch (error) {
    console.error("Failed to authorize admin request:", error);
    return { ok: false, status: 401, error: "Invalid bearer token" };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getWeekId(date) {
  const week = getISOWeek(date);
  const year = date.getFullYear();
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getMonthId(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function getDailyId(date) {
  return date.toISOString().split("T")[0];
}

function normalizeDate(date) {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (date._seconds) return new Date(date._seconds * 1000);
  return new Date(date);
}

function calculateAgeRange(dataDiNascita) {
  if (!dataDiNascita) return null;
  const birthDate = normalizeDate(dataDiNascita);
  if (!birthDate || Number.isNaN(birthDate.getTime())) return null;

  const age = differenceInYears(new Date(), birthDate);
  if (age < 18) return "<18";
  if (age <= 20) return "18-20";
  if (age <= 30) return "21-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  return ">60";
}

/**
 * Helper to safely increment or decrement a counter in a map.
 */
function updateCategory(counterObj, key, amount = 1) {
  if (!key) return;
  const current = counterObj[key] || 0;
  const next = current + amount;
  counterObj[key] = next > 0 ? next : 0;
}

function processArrayCategory(counterObj, values, amount = 1) {
  if (!Array.isArray(values)) return;
  values.forEach((value) => {
    updateCategory(counterObj, value, amount);
  });
}

function normalizeRegistrationStatus(status) {
  return status === "draft_signature_pending" ? "Firma in attesa" : "Attiva";
}

const HISTORY_FIELD_LABELS = {
  "anagrafica.sesso": "Genere",
  "anagrafica.comuneDiDomicilio": "Comune di domicilio",
  "privacy.paperNoticeCollected": "Privacy raccolta",
  "privacy.paperNoticeSignedAt": "Firma privacy",
  "nucleoFamiliare.nucleoTipo": "Tipo nucleo",
  "nucleoFamiliare.nucleo": "Composizione nucleo",
  "nucleoFamiliare.figli": "Figli",
  "legaleAbitativa.situazioneLegale": "Situazione legale",
  "legaleAbitativa.situazioneAbitativa": "Situazione abitativa",
  "lavoroFormazione.situazioneLavorativa": "Situazione lavorativa",
  "lavoroFormazione.titoloDiStudioOrigine": "Studio origine",
  "lavoroFormazione.titoloDiStudioItalia": "Studio Italia",
  "lavoroFormazione.conoscenzaItaliano": "Livello italiano",
  "vulnerabilita.vulnerabilita": "Vulnerabilita",
  "vulnerabilita.intenzioneItalia": "Intenzione Italia",
  "referral.referral": "Referral",
  services: "Accessi e servizi",
};

const TRACKED_TRANSITION_FIELDS = [
  "nucleoFamiliare.nucleoTipo",
  "nucleoFamiliare.nucleo",
  "legaleAbitativa.situazioneLegale",
  "legaleAbitativa.situazioneAbitativa",
  "lavoroFormazione.situazioneLavorativa",
  "lavoroFormazione.conoscenzaItaliano",
  "vulnerabilita.intenzioneItalia",
  "referral.referral",
];

const HISTORY_METADATA_FIELDS = new Set([
  "anagraficaId",
  "structureId",
  "updatedAt",
  "updatedBy",
  "createdAt",
  "createdBy",
  "supersededAt",
  "supersededBy",
]);

function isPlainObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.toDate !== "function"
  );
}

function normalizeHistoryValue(value) {
  if (value === undefined || value === null || value === "") {
    return "Non compilato";
  }

  if (typeof value?.toDate === "function" || value?._seconds) {
    const dateValue = normalizeDate(value);
    return dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue.toISOString().split("T")[0]
      : "Non compilato";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "Nessuno";
    return value
      .map((item) => normalizeHistoryValue(item))
      .sort()
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function getNestedValue(value, path) {
  return path.reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, value);
}

function getHistoryFieldLabel(path) {
  if (HISTORY_FIELD_LABELS[path]) return HISTORY_FIELD_LABELS[path];
  const [, ...fieldParts] = path.split(".");
  return fieldParts.length > 0 ? fieldParts.join(" / ") : path;
}

function valuesDiffer(before, after) {
  return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
}

function collectChangedFieldPaths(before, after, prefix = "") {
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return valuesDiffer(before, after) && prefix ? [prefix] : [];
  }

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  const paths = [];

  keys.forEach((key) => {
    if (HISTORY_METADATA_FIELDS.has(key)) return;
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    paths.push(
      ...collectChangedFieldPaths(beforeValue, afterValue, nextPrefix),
    );
  });

  return paths;
}

function encodeTransitionKey(field, before, after) {
  return [field, before, after]
    .map((part) => encodeURIComponent(part))
    .join("::");
}

function extractHistorySignals(historyData = {}) {
  const groups = new Set(historyData.changedGroups || []);
  const fields = new Set();
  const transitions = [];
  const changes = historyData.changes || {};

  Object.entries(changes).forEach(([group, change]) => {
    groups.add(group);
    collectChangedFieldPaths(change?.before, change?.after, group).forEach(
      (path) => {
        fields.add(getHistoryFieldLabel(path));
      },
    );
  });

  TRACKED_TRANSITION_FIELDS.forEach((path) => {
    const [group, ...fieldPath] = path.split(".");
    const change = changes[group];
    if (!change) return;

    const beforeValue = getNestedValue(change.before, fieldPath);
    const afterValue = getNestedValue(change.after, fieldPath);
    if (!valuesDiffer(beforeValue, afterValue)) return;

    const fieldLabel = getHistoryFieldLabel(path);
    transitions.push({
      field: fieldLabel,
      before: normalizeHistoryValue(beforeValue),
      after: normalizeHistoryValue(afterValue),
    });
  });

  if (fields.size === 0 && groups.has("services")) {
    fields.add(HISTORY_FIELD_LABELS.services);
  }

  return {
    groups: [...groups].filter(Boolean),
    fields: [...fields].filter(Boolean),
    transitions,
  };
}

function applyHistoryStats(stats, historyData, amount = 1) {
  stats.totalHistoryEvents = Math.max(
    0,
    (stats.totalHistoryEvents || 0) + amount,
  );
  stats.byHistoryChangeType = { ...stats.byHistoryChangeType };
  stats.byHistoryGroup = { ...stats.byHistoryGroup };
  stats.byHistoryField = { ...stats.byHistoryField };
  stats.byStatusTransition = { ...stats.byStatusTransition };
  stats.byTransitionField = { ...stats.byTransitionField };

  updateCategory(stats.byHistoryChangeType, historyData.changeType, amount);

  const signals = extractHistorySignals(historyData);
  signals.groups.forEach((group) => {
    updateCategory(stats.byHistoryGroup, group, amount);
  });
  signals.fields.forEach((field) => {
    updateCategory(stats.byHistoryField, field, amount);
  });
  signals.transitions.forEach((transition) => {
    updateCategory(stats.byTransitionField, transition.field, amount);
    updateCategory(
      stats.byStatusTransition,
      encodeTransitionKey(
        transition.field,
        transition.before,
        transition.after,
      ),
      amount,
    );
  });

  const changedAt = normalizeDate(historyData.changedAt);
  const previousLast = normalizeDate(stats.lastHistoryEventAt);
  if (
    amount > 0 &&
    changedAt &&
    !Number.isNaN(changedAt.getTime()) &&
    (!previousLast || changedAt > previousLast)
  ) {
    stats.lastHistoryEventAt = admin.firestore.Timestamp.fromDate(changedAt);
  }
}

// ============================================================================
// STATS AGGREGATION LOGIC
// ============================================================================

/**
 * Updates personal stats from the global `anagrafica` document.
 * Fields: totalPersons, byGender, byAgeRange, byCittadinanza, byBirthPlace
 */
async function updatePersonalStats(docRef, anagraficaData, increment = true) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    const newStats = {
      totalPersons: Math.max(0, (statsData?.totalPersons || 0) + amount),
      byGender: { ...statsData?.byGender },
      byAgeRange: { ...statsData?.byAgeRange },
      byCittadinanza: { ...statsData?.byCittadinanza },
      byBirthPlace: { ...statsData?.byBirthPlace },
      byRegistrationStatus: { ...statsData?.byRegistrationStatus },
      updatedAt: admin.firestore.Timestamp.now(),
    };

    updateCategory(newStats.byGender, anagraficaData.anagrafica?.sesso, amount);
    updateCategory(
      newStats.byRegistrationStatus,
      normalizeRegistrationStatus(anagraficaData.registrationStatus),
      amount,
    );
    updateCategory(
      newStats.byAgeRange,
      calculateAgeRange(anagraficaData.anagrafica?.dataDiNascita),
      amount,
    );
    updateCategory(
      newStats.byBirthPlace,
      anagraficaData.anagrafica?.luogoDiNascita,
      amount,
    );
    processArrayCategory(
      newStats.byCittadinanza,
      anagraficaData.anagrafica?.cittadinanza,
      amount,
    );

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating personal stats:", error);
  }
}

/**
 * Updates structure-specific stats from an `anagrafica_data` document.
 * Fields: byFamilyType, byNucleoType, byChildrenCount, byLegalStatus,
 *         byHousingStatus, byJobStatus, byEducationOrigin, byEducationItaly,
 *         byItalianLevel, byVulnerability, byIntenzioneItalia, byReferral
 */
async function updateStructureSpecificStats(
  docRef,
  structureData,
  increment = true,
) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    const newStats = {
      byFamilyType: { ...statsData?.byFamilyType },
      byNucleoType: { ...statsData?.byNucleoType },
      byChildrenCount: { ...statsData?.byChildrenCount },
      byLegalStatus: { ...statsData?.byLegalStatus },
      byHousingStatus: { ...statsData?.byHousingStatus },
      byJobStatus: { ...statsData?.byJobStatus },
      byEducationOrigin: { ...statsData?.byEducationOrigin },
      byEducationItaly: { ...statsData?.byEducationItaly },
      byItalianLevel: { ...statsData?.byItalianLevel },
      byVulnerability: { ...statsData?.byVulnerability },
      byIntenzioneItalia: { ...statsData?.byIntenzioneItalia },
      byReferral: { ...statsData?.byReferral },
      updatedAt: admin.firestore.Timestamp.now(),
    };

    updateCategory(
      newStats.byFamilyType,
      structureData.nucleoFamiliare?.nucleoTipo,
      amount,
    );
    updateCategory(
      newStats.byNucleoType,
      structureData.nucleoFamiliare?.nucleo,
      amount,
    );

    const figli = structureData.nucleoFamiliare?.figli;
    if (figli !== undefined && figli !== null) {
      const figliCategory =
        figli === 0
          ? "0"
          : figli === 1
            ? "1"
            : figli === 2
              ? "2"
              : figli <= 4
                ? "3-4"
                : "5+";
      updateCategory(newStats.byChildrenCount, figliCategory, amount);
    }

    updateCategory(
      newStats.byLegalStatus,
      structureData.legaleAbitativa?.situazioneLegale,
      amount,
    );
    processArrayCategory(
      newStats.byHousingStatus,
      structureData.legaleAbitativa?.situazioneAbitativa,
      amount,
    );

    updateCategory(
      newStats.byJobStatus,
      structureData.lavoroFormazione?.situazioneLavorativa,
      amount,
    );
    updateCategory(
      newStats.byEducationOrigin,
      structureData.lavoroFormazione?.titoloDiStudioOrigine,
      amount,
    );
    updateCategory(
      newStats.byEducationItaly,
      structureData.lavoroFormazione?.titoloDiStudioItalia,
      amount,
    );
    updateCategory(
      newStats.byItalianLevel,
      structureData.lavoroFormazione?.conoscenzaItaliano,
      amount,
    );

    processArrayCategory(
      newStats.byVulnerability,
      structureData.vulnerabilita?.vulnerabilita,
      amount,
    );
    updateCategory(
      newStats.byIntenzioneItalia,
      structureData.vulnerabilita?.intenzioneItalia,
      amount,
    );
    updateCategory(
      newStats.byReferral,
      structureData.referral?.referral,
      amount,
    );

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating structure-specific stats:", error);
  }
}

async function updateAccessStats(docRef, data, increment = true) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    const newStats = {
      totalAccesses: Math.max(0, (statsData?.totalAccesses || 0) + amount),
      byAccessType: { ...statsData?.byAccessType },
      bySubcategory: { ...statsData?.bySubcategory },
      byClassification: { ...statsData?.byClassification },
      byReferralEntity: { ...statsData?.byReferralEntity },
      totalFiles: statsData?.totalFiles || 0,
      filesWithExpiration: statsData?.filesWithExpiration || 0,
      totalReminders: statsData?.totalReminders || 0,
      totalServices: statsData?.totalServices || 0,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const services = data.services || [];
    for (const service of services) {
      newStats.totalServices = Math.max(0, newStats.totalServices + amount);
      updateCategory(newStats.byAccessType, service.tipoAccesso, amount);
      processArrayCategory(
        newStats.bySubcategory,
        service.sottoCategorie,
        amount,
      );

      if (service.classificazione) {
        let classKey = service.classificazione;
        if (classKey.includes("Presa in carico")) classKey = "Presa in carico";
        else if (classKey.includes("Informativa")) classKey = "Informativa";
        else if (classKey.includes("Referral")) classKey = "Referral";
        updateCategory(newStats.byClassification, classKey, amount);
      }

      updateCategory(
        newStats.byReferralEntity,
        service.enteRiferimento,
        amount,
      );

      const filesCount = service.files?.length || 0;
      const filesWithExpiry = (service.files || []).filter(
        (f) => f.dataScadenza,
      ).length;

      if (increment) {
        newStats.totalFiles += filesCount;
        newStats.filesWithExpiration += filesWithExpiry;
      } else {
        newStats.totalFiles = Math.max(0, newStats.totalFiles - filesCount);
        newStats.filesWithExpiration = Math.max(
          0,
          newStats.filesWithExpiration - filesWithExpiry,
        );
      }

      if (service.reminderDate) {
        if (increment) newStats.totalReminders++;
        else newStats.totalReminders = Math.max(0, newStats.totalReminders - 1);
      }
    }

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating access stats:", error);
  }
}

async function updateHistoryStats(docRef, historyData, increment = true) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    const newStats = {
      ...statsData,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    applyHistoryStats(newStats, historyData, amount);

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating history stats:", error);
  }
}

async function updateReminderStats(
  docRef,
  reminderData,
  isNew,
  wasCompleted,
  isNowCompleted,
) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};

    const newStats = {
      totalRemindersCreated: statsData?.totalRemindersCreated || 0,
      activeReminders: statsData?.activeReminders || 0,
      completedReminders: statsData?.completedReminders || 0,
      remindersByServiceType: { ...statsData?.remindersByServiceType },
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (isNew) {
      newStats.totalRemindersCreated += 1;
      newStats.activeReminders += 1;
      updateCategory(
        newStats.remindersByServiceType,
        reminderData.serviceType,
        1,
      );
    }

    if (!wasCompleted && isNowCompleted) {
      newStats.activeReminders = Math.max(0, newStats.activeReminders - 1);
      newStats.completedReminders += 1;
    } else if (wasCompleted && !isNowCompleted) {
      newStats.activeReminders += 1;
      newStats.completedReminders = Math.max(
        0,
        newStats.completedReminders - 1,
      );
    }

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating reminder stats:", error);
  }
}

// ============================================================================
// TRIGGERS - ANAGRAFICA (global document - personal fields only)
// ============================================================================

exports.onAnagraficaCreate = onDocumentCreated(
  { document: "anagrafica/{personId}", region: "europe-west8" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (data.deletedAt) return;

    const structures = data.structureIds || data.canBeAccessedBy || [];
    const now = new Date();

    for (const structureId of structures) {
      await Promise.all([
        updatePersonalStats(
          db.collection("statistics").doc(structureId),
          data,
          true,
        ),
        updatePersonalStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("daily")
            .doc(getDailyId(now)),
          data,
          true,
        ),
        updatePersonalStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("weekly")
            .doc(getWeekId(now)),
          data,
          true,
        ),
        updatePersonalStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("monthly")
            .doc(getMonthId(now)),
          data,
          true,
        ),
      ]);
    }
  },
);

exports.onAnagraficaUpdate = onDocumentUpdated(
  { document: "anagrafica/{personId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    if (!beforeData || !afterData) return;

    const now = new Date();

    // 1. Handle Soft Delete
    if (!beforeData.deletedAt && afterData.deletedAt) {
      const structures =
        beforeData.structureIds || beforeData.canBeAccessedBy || [];
      for (const structureId of structures) {
        await Promise.all([
          updatePersonalStats(
            db.collection("statistics").doc(structureId),
            beforeData,
            false,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("daily")
              .doc(getDailyId(now)),
            beforeData,
            false,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("weekly")
              .doc(getWeekId(now)),
            beforeData,
            false,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("monthly")
              .doc(getMonthId(now)),
            beforeData,
            false,
          ),
        ]);
      }
      return;
    }

    // 2. Handle Restore
    if (beforeData.deletedAt && !afterData.deletedAt) {
      const structures =
        afterData.structureIds || afterData.canBeAccessedBy || [];
      for (const structureId of structures) {
        await Promise.all([
          updatePersonalStats(
            db.collection("statistics").doc(structureId),
            afterData,
            true,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("daily")
              .doc(getDailyId(now)),
            afterData,
            true,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("weekly")
              .doc(getWeekId(now)),
            afterData,
            true,
          ),
          updatePersonalStats(
            db
              .collection("statistics")
              .doc(structureId)
              .collection("monthly")
              .doc(getMonthId(now)),
            afterData,
            true,
          ),
        ]);
      }
      return;
    }

    // 3. Handle Structure Access Changes (sharing with new structure or removing)
    const beforeStructures = new Set(
      beforeData.structureIds || beforeData.canBeAccessedBy || [],
    );
    const afterStructures = new Set(
      afterData.structureIds || afterData.canBeAccessedBy || [],
    );

    // Structure removed: decrement personal stats
    for (const structureId of beforeStructures) {
      if (!afterStructures.has(structureId)) {
        await updatePersonalStats(
          db.collection("statistics").doc(structureId),
          beforeData,
          false,
        );
      }
    }
    // Structure added: increment personal stats
    for (const structureId of afterStructures) {
      if (!beforeStructures.has(structureId)) {
        await updatePersonalStats(
          db.collection("statistics").doc(structureId),
          afterData,
          true,
        );
      }
    }

    // 4. Handle personal data changes within same structures
    const personalChanged =
      JSON.stringify(beforeData.anagrafica) !==
      JSON.stringify(afterData.anagrafica);
    const registrationStatusChanged =
      normalizeRegistrationStatus(beforeData.registrationStatus) !==
      normalizeRegistrationStatus(afterData.registrationStatus);

    if (personalChanged) {
      for (const structureId of afterStructures) {
        if (beforeStructures.has(structureId)) {
          await updatePersonalStats(
            db.collection("statistics").doc(structureId),
            beforeData,
            false,
          );
          await updatePersonalStats(
            db.collection("statistics").doc(structureId),
            afterData,
            true,
          );
        }
      }
    }

    if (!personalChanged && registrationStatusChanged) {
      for (const structureId of afterStructures) {
        if (beforeStructures.has(structureId)) {
          await updatePersonalStats(
            db.collection("statistics").doc(structureId),
            beforeData,
            false,
          );
          await updatePersonalStats(
            db.collection("statistics").doc(structureId),
            afterData,
            true,
          );
        }
      }
    }
  },
);

// ============================================================================
// TRIGGERS - ANAGRAFICA_DATA (structure-specific fields)
// ============================================================================

exports.onAnagraficaDataCreate = onDocumentCreated(
  { document: "anagrafica_data/{dataId}", region: "europe-west8" },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.structureId) return;

    const structureId = data.structureId;
    const now = new Date();

    await Promise.all([
      updateStructureSpecificStats(
        db.collection("statistics").doc(structureId),
        data,
        true,
      ),
      updateStructureSpecificStats(
        db
          .collection("statistics")
          .doc(structureId)
          .collection("daily")
          .doc(getDailyId(now)),
        data,
        true,
      ),
      updateStructureSpecificStats(
        db
          .collection("statistics")
          .doc(structureId)
          .collection("weekly")
          .doc(getWeekId(now)),
        data,
        true,
      ),
      updateStructureSpecificStats(
        db
          .collection("statistics")
          .doc(structureId)
          .collection("monthly")
          .doc(getMonthId(now)),
        data,
        true,
      ),
    ]);
  },
);

exports.onAnagraficaDataUpdate = onDocumentUpdated(
  { document: "anagrafica_data/{dataId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    if (!beforeData || !afterData) return;

    const structureId = afterData.structureId || beforeData.structureId;
    if (!structureId) return;

    const relevantFields = [
      "nucleoFamiliare",
      "legaleAbitativa",
      "lavoroFormazione",
      "vulnerabilita",
      "referral",
    ];
    const isChanged = relevantFields.some(
      (field) =>
        JSON.stringify(beforeData[field]) !== JSON.stringify(afterData[field]),
    );

    if (isChanged) {
      // Decrement old values, increment new values (total stats only - no historical correction)
      await updateStructureSpecificStats(
        db.collection("statistics").doc(structureId),
        beforeData,
        false,
      );
      await updateStructureSpecificStats(
        db.collection("statistics").doc(structureId),
        afterData,
        true,
      );
    }
  },
);

// ============================================================================
// TRIGGERS - ACCESSES
// ============================================================================

exports.onAccessCreate = onDocumentCreated(
  { document: "accessi/{accessId}", region: "europe-west8" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const structures = data.structureIds || [];
    const now = new Date();

    for (const structureId of structures) {
      await Promise.all([
        updateAccessStats(
          db.collection("statistics").doc(structureId),
          data,
          true,
        ),
        updateAccessStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("daily")
            .doc(getDailyId(now)),
          data,
          true,
        ),
        updateAccessStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("weekly")
            .doc(getWeekId(now)),
          data,
          true,
        ),
        updateAccessStats(
          db
            .collection("statistics")
            .doc(structureId)
            .collection("monthly")
            .doc(getMonthId(now)),
          data,
          true,
        ),
      ]);
    }
  },
);

exports.onAccessUpdate = onDocumentUpdated(
  { document: "accessi/{accessId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    if (!beforeData || !afterData) return;
    const structures = afterData.structureIds || [];

    if (
      JSON.stringify(beforeData.services) !== JSON.stringify(afterData.services)
    ) {
      for (const structureId of structures) {
        await updateAccessStats(
          db.collection("statistics").doc(structureId),
          beforeData,
          false,
        );
        await updateAccessStats(
          db.collection("statistics").doc(structureId),
          afterData,
          true,
        );
      }
    }
  },
);

// ============================================================================
// TRIGGERS - HISTORY
// ============================================================================

async function updateHistoryStatsForStructure(structureId, historyData) {
  if (!structureId || !historyData) return;

  const changedAt = normalizeDate(historyData.changedAt) || new Date();

  await Promise.all([
    updateHistoryStats(
      db.collection("statistics").doc(structureId),
      historyData,
      true,
    ),
    updateHistoryStats(
      db
        .collection("statistics")
        .doc(structureId)
        .collection("daily")
        .doc(getDailyId(changedAt)),
      historyData,
      true,
    ),
    updateHistoryStats(
      db
        .collection("statistics")
        .doc(structureId)
        .collection("weekly")
        .doc(getWeekId(changedAt)),
      historyData,
      true,
    ),
    updateHistoryStats(
      db
        .collection("statistics")
        .doc(structureId)
        .collection("monthly")
        .doc(getMonthId(changedAt)),
      historyData,
      true,
    ),
  ]);
}

exports.onAnagraficaHistoryCreate = onDocumentCreated(
  {
    document: "anagrafica/{personId}/history/{historyId}",
    region: "europe-west8",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    await updateHistoryStatsForStructure(data.changedByStructure, data);
  },
);

exports.onAnagraficaDataHistoryCreate = onDocumentCreated(
  {
    document: "anagrafica_data/{dataId}/history/{historyId}",
    region: "europe-west8",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    let structureId = data.changedByStructure;
    if (!structureId && event.params?.dataId) {
      const structureSnap = await db
        .collection("anagrafica_data")
        .doc(event.params.dataId)
        .get();
      structureId = structureSnap.data()?.structureId;
    }

    await updateHistoryStatsForStructure(structureId, data);
  },
);

exports.onAccessHistoryCreate = onDocumentCreated(
  {
    document: "accessi/{accessId}/history/{historyId}",
    region: "europe-west8",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    await updateHistoryStatsForStructure(data.changedByStructure, data);
  },
);

// ============================================================================
// TRIGGERS - REMINDERS
// ============================================================================

exports.onReminderWrite = onDocumentWritten(
  { document: "reminders/{reminderId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // 1. Deleted
    if (beforeData && !afterData) {
      if (beforeData.structureId) {
        const docRef = db.collection("statistics").doc(beforeData.structureId);
        await docRef.set(
          {
            activeReminders: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.Timestamp.now(),
          },
          { merge: true },
        );
      }
      return;
    }

    // 2. Created
    if (!beforeData && afterData) {
      if (afterData.structureId) {
        const now = new Date();
        const totalRef = db.collection("statistics").doc(afterData.structureId);
        const dailyRef = totalRef.collection("daily").doc(getDailyId(now));

        await updateReminderStats(totalRef, afterData, true, false, false);
        await updateReminderStats(dailyRef, afterData, true, false, false);
      }
      return;
    }

    // 3. Updated (Status Change)
    if (beforeData && afterData) {
      const structureId = afterData.structureId;
      if (structureId) {
        const wasCompleted = beforeData.status === "completed";
        const isNowCompleted = afterData.status === "completed";

        if (wasCompleted !== isNowCompleted) {
          const totalRef = db.collection("statistics").doc(structureId);
          await updateReminderStats(
            totalRef,
            afterData,
            false,
            wasCompleted,
            isNowCompleted,
          );
        }
      }
    }
  },
);

// ============================================================================
// HTTP FUNCTION - RECALCULATE STATS
// ============================================================================

exports.recalculateStats = onRequest(
  { region: "europe-west8", cors: false, timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const authorization = await authorizeAdminRequest(req);
    if (!authorization.ok) {
      res.status(authorization.status).json({ error: authorization.error });
      return;
    }

    const structureId =
      typeof req.query.structureId === "string"
        ? req.query.structureId.trim()
        : "";
    if (!structureId) {
      res.status(400).json({ error: "structureId is required" });
      return;
    }

    console.log(`Starting recalculation for structure: ${structureId}`, {
      actorUid: authorization.actorUid,
    });

    try {
      const stats = {
        // Personal Stats (from anagrafica collection)
        totalPersons: 0,
        byGender: {},
        byAgeRange: {},
        byCittadinanza: {},
        byBirthPlace: {},
        byRegistrationStatus: {},

        // Structure-Specific Stats (from anagrafica_data collection)
        byFamilyType: {},
        byNucleoType: {},
        byChildrenCount: {},
        byLegalStatus: {},
        byHousingStatus: {},
        byJobStatus: {},
        byEducationOrigin: {},
        byEducationItaly: {},
        byItalianLevel: {},
        byVulnerability: {},
        byIntenzioneItalia: {},
        byReferral: {},

        // Access Stats
        totalAccesses: 0,
        byAccessType: {},
        bySubcategory: {},
        byClassification: {},
        byReferralEntity: {},
        totalFiles: 0,
        filesWithExpiration: 0,
        totalReminders: 0,
        totalServices: 0,

        // Reminder Stats
        totalRemindersCreated: 0,
        activeReminders: 0,
        completedReminders: 0,
        remindersByServiceType: {},

        // History / lifecycle stats
        totalHistoryEvents: 0,
        byHistoryChangeType: {},
        byHistoryGroup: {},
        byHistoryField: {},
        byStatusTransition: {},
        byTransitionField: {},
        lastHistoryEventAt: null,

        recalculatedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      const increment = (obj, key) => {
        if (!key) return;
        obj[key] = (obj[key] || 0) + 1;
      };

      // ==================================================================
      // PHASE 1: PERSONAL STATS from `anagrafica` collection
      // ==================================================================
      const anagraficaSnap = await db
        .collection("anagrafica")
        .where("structureIds", "array-contains", structureId)
        .get();

      anagraficaSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.deletedAt) return;

        stats.totalPersons++;
        increment(stats.byGender, data.anagrafica?.sesso);
        increment(
          stats.byRegistrationStatus,
          normalizeRegistrationStatus(data.registrationStatus),
        );
        increment(
          stats.byAgeRange,
          calculateAgeRange(data.anagrafica?.dataDiNascita),
        );
        increment(stats.byBirthPlace, data.anagrafica?.luogoDiNascita);

        if (Array.isArray(data.anagrafica?.cittadinanza)) {
          data.anagrafica.cittadinanza.forEach((c) => {
            increment(stats.byCittadinanza, c);
          });
        }
      });

      // ==================================================================
      // PHASE 2: STRUCTURE-SPECIFIC STATS from `anagrafica_data` collection
      // ==================================================================
      const structureDataSnap = await db
        .collection("anagrafica_data")
        .where("structureId", "==", structureId)
        .get();

      structureDataSnap.docs.forEach((doc) => {
        const data = doc.data();

        increment(stats.byFamilyType, data.nucleoFamiliare?.nucleoTipo);
        increment(stats.byNucleoType, data.nucleoFamiliare?.nucleo);

        const figli = data.nucleoFamiliare?.figli;
        if (figli !== undefined && figli !== null) {
          const cat =
            figli === 0
              ? "0"
              : figli === 1
                ? "1"
                : figli === 2
                  ? "2"
                  : figli <= 4
                    ? "3-4"
                    : "5+";
          increment(stats.byChildrenCount, cat);
        }

        increment(stats.byLegalStatus, data.legaleAbitativa?.situazioneLegale);
        if (Array.isArray(data.legaleAbitativa?.situazioneAbitativa)) {
          data.legaleAbitativa.situazioneAbitativa.forEach((s) => {
            increment(stats.byHousingStatus, s);
          });
        }

        increment(
          stats.byJobStatus,
          data.lavoroFormazione?.situazioneLavorativa,
        );
        increment(
          stats.byEducationOrigin,
          data.lavoroFormazione?.titoloDiStudioOrigine,
        );
        increment(
          stats.byEducationItaly,
          data.lavoroFormazione?.titoloDiStudioItalia,
        );
        increment(
          stats.byItalianLevel,
          data.lavoroFormazione?.conoscenzaItaliano,
        );

        if (Array.isArray(data.vulnerabilita?.vulnerabilita)) {
          data.vulnerabilita.vulnerabilita.forEach((v) => {
            increment(stats.byVulnerability, v);
          });
        }
        increment(
          stats.byIntenzioneItalia,
          data.vulnerabilita?.intenzioneItalia,
        );
        increment(stats.byReferral, data.referral?.referral);
      });

      // ==================================================================
      // PHASE 3: ACCESS STATS from `accessi` collection
      // ==================================================================
      const accessSnap = await db
        .collection("accessi")
        .where("structureIds", "array-contains", structureId)
        .get();

      accessSnap.docs.forEach((doc) => {
        const data = doc.data();
        stats.totalAccesses++;

        const services = data.services || [];
        services.forEach((service) => {
          stats.totalServices++;
          increment(stats.byAccessType, service.tipoAccesso);

          if (Array.isArray(service.sottoCategorie)) {
            service.sottoCategorie.forEach((sub) => {
              increment(stats.bySubcategory, sub);
            });
          }

          if (service.classificazione) {
            let k = service.classificazione;
            if (k.includes("Presa in carico")) k = "Presa in carico";
            else if (k.includes("Informativa")) k = "Informativa";
            else if (k.includes("Referral")) k = "Referral";
            increment(stats.byClassification, k);
          }

          increment(stats.byReferralEntity, service.enteRiferimento);

          if (Array.isArray(service.files)) {
            stats.totalFiles += service.files.length;
            stats.filesWithExpiration += service.files.filter(
              (f) => f.dataScadenza,
            ).length;
          }

          if (service.reminderDate) {
            stats.totalReminders++;
          }
        });
      });

      // ==================================================================
      // PHASE 4: REMINDER STATS from `reminders` collection
      // ==================================================================
      const reminderSnap = await db
        .collection("reminders")
        .where("structureId", "==", structureId)
        .get();

      reminderSnap.docs.forEach((doc) => {
        const data = doc.data();
        stats.totalRemindersCreated++;
        increment(stats.remindersByServiceType, data.serviceType);

        if (data.status === "pending") {
          stats.activeReminders++;
        } else if (data.status === "completed") {
          stats.completedReminders++;
        }
      });

      // ==================================================================
      // PHASE 5: HISTORY STATS from anagrafica, structure, and access logs
      // ==================================================================
      async function applyHistoryCollection(historyRef, shouldFilter = true) {
        const historyQuery = shouldFilter
          ? historyRef.where("changedByStructure", "==", structureId)
          : historyRef;
        const historySnap = await historyQuery.get();
        historySnap.docs.forEach((doc) => {
          applyHistoryStats(stats, doc.data(), true);
        });
      }

      for (const doc of anagraficaSnap.docs) {
        const data = doc.data();
        if (data.deletedAt) continue;
        await applyHistoryCollection(doc.ref.collection("history"), true);
      }

      for (const doc of structureDataSnap.docs) {
        await applyHistoryCollection(doc.ref.collection("history"), false);
      }

      for (const doc of accessSnap.docs) {
        await applyHistoryCollection(doc.ref.collection("history"), true);
      }

      // ==================================================================
      // FINAL SAVE
      // ==================================================================
      await db.collection("statistics").doc(structureId).set(stats);

      res.json({
        success: true,
        message: "Statistics recalculated successfully",
        data: {
          persons: stats.totalPersons,
          accesses: stats.totalAccesses,
          reminders: stats.activeReminders,
        },
      });
    } catch (error) {
      console.error("Error recalculating stats:", error);
      res.status(500).json({ error: error.message });
    }
  },
);
