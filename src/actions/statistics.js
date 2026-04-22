"use server";

import { unstable_cache } from "next/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?._seconds) return new Date(value._seconds * 1000);
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

function isWithinUpcomingWindow(date, now, windowEnd) {
  return date && date >= now && date <= windowEnd;
}

function sortByDateField(field) {
  return (a, b) => {
    const aTime = normalizeDateValue(a[field])?.getTime() || 0;
    const bTime = normalizeDateValue(b[field])?.getTime() || 0;
    return aTime - bTime;
  };
}

function getPersonName(person) {
  const personal = person?.anagrafica || {};
  return [personal.nome || person?.nome, personal.cognome || person?.cognome]
    .filter(Boolean)
    .join(" ")
    .trim();
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STATUS_FLOW_BLOCKED_DAYS = 30;
const MISSING_STATUS = "Non compilato";

const STATUS_FLOW_FIELDS = [
  {
    key: "situazioneLegale",
    label: "Situazione legale",
    source: "structure",
    path: ["legaleAbitativa", "situazioneLegale"],
  },
  {
    key: "situazioneAbitativa",
    label: "Situazione abitativa",
    source: "structure",
    path: ["legaleAbitativa", "situazioneAbitativa"],
  },
  {
    key: "situazioneLavorativa",
    label: "Situazione lavorativa",
    source: "structure",
    path: ["lavoroFormazione", "situazioneLavorativa"],
  },
  {
    key: "conoscenzaItaliano",
    label: "Livello italiano",
    source: "structure",
    path: ["lavoroFormazione", "conoscenzaItaliano"],
  },
  {
    key: "intenzioneItalia",
    label: "Intenzione Italia",
    source: "structure",
    path: ["vulnerabilita", "intenzioneItalia"],
  },
  {
    key: "referral",
    label: "Referral",
    source: "structure",
    path: ["referral", "referral"],
  },
  {
    key: "registrationStatus",
    label: "Registrazione",
    source: "global",
    path: ["registrationStatus"],
  },
];

async function fetchPersonNames(anagraficaIds = []) {
  const uniqueIds = [...new Set(anagraficaIds.filter(Boolean))];
  const names = new Map();

  for (let i = 0; i < uniqueIds.length; i += 30) {
    const batch = uniqueIds.slice(i, i + 30);
    const snapshot = await adminDb
      .collection("anagrafica")
      .where("__name__", "in", batch)
      .get();

    snapshot.docs.forEach((doc) => {
      names.set(doc.id, getPersonName(doc.data()) || doc.id);
    });
  }

  return names;
}

function normalizeRegistrationStatusLabel(status) {
  return status === "draft_signature_pending" ? "Firma in attesa" : "Attiva";
}

function normalizeStatusValue(value) {
  if (value === undefined || value === null || value === "") {
    return MISSING_STATUS;
  }

  if (typeof value?.toDate === "function" || value?._seconds) {
    const date = normalizeDateValue(value);
    return date ? date.toISOString().split("T")[0] : MISSING_STATUS;
  }

  if (Array.isArray(value)) {
    if (!value.length) return MISSING_STATUS;
    return value
      .map((item) => normalizeStatusValue(item))
      .sort()
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function isMissingStatus(value) {
  return !value || value === MISSING_STATUS;
}

function isTerminalStatus(value) {
  return /dimess|chius|conclus|complet/i.test(value || "");
}

function getNestedValue(value, path = []) {
  return path.reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, value);
}

function valuesDiffer(before, after) {
  return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
}

function getFieldCurrentValue(data = {}, field) {
  if (field.key === "registrationStatus") {
    return normalizeRegistrationStatusLabel(data.registrationStatus);
  }

  return normalizeStatusValue(getNestedValue(data, field.path));
}

function extractFieldTransition(historyData = {}, field) {
  const changes = historyData.changes || {};

  if (field.path.length === 1) {
    const directChange = changes[field.path[0]];
    if (!directChange) return null;

    const before = directChange.before;
    const after = directChange.after;
    if (!valuesDiffer(before, after)) return null;

    return {
      before: normalizeStatusValue(before),
      after:
        field.key === "registrationStatus"
          ? normalizeRegistrationStatusLabel(after)
          : normalizeStatusValue(after),
    };
  }

  const [group, ...fieldPath] = field.path;
  const change = changes[group];
  if (!change) return null;

  const before = getNestedValue(change.before, fieldPath);
  const after = getNestedValue(change.after, fieldPath);
  if (!valuesDiffer(before, after)) return null;

  return {
    before: normalizeStatusValue(before),
    after: normalizeStatusValue(after),
  };
}

function ensurePersonRecord(records, personId, seed = {}) {
  if (!records.has(personId)) {
    records.set(personId, {
      id: personId,
      name: seed.name || personId,
      createdAt: seed.createdAt || null,
      currentValues: {},
      eventsByField: {},
    });
  }

  const record = records.get(personId);
  if (seed.name && (!record.name || record.name === personId)) {
    record.name = seed.name;
  }
  if (seed.createdAt) {
    if (!record.createdAt || seed.createdAt < record.createdAt) {
      record.createdAt = seed.createdAt;
    }
  }

  return record;
}

function addHistoryEventToRecord(record, historyData, fields) {
  const changedAt = normalizeDateValue(historyData.changedAt);
  if (!changedAt) return;

  fields.forEach((field) => {
    const transition = extractFieldTransition(historyData, field);
    if (!transition || transition.before === transition.after) return;

    if (!record.eventsByField[field.key]) {
      record.eventsByField[field.key] = [];
    }

    record.eventsByField[field.key].push({
      at: changedAt,
      before: transition.before,
      after: transition.after,
    });
  });
}

function createStatusAccumulator(name) {
  return {
    name,
    currentCount: 0,
    enteredThisMonth: 0,
    exitedThisMonth: 0,
    dwellSamples: 0,
    totalDwellDays: 0,
    blockedCount: 0,
    maxDaysInStatus: 0,
  };
}

function addDwell(statusMap, status, start, end) {
  if (isMissingStatus(status) || !start || !end) return;

  const days = Math.max(0, (end.getTime() - start.getTime()) / DAY_IN_MS);
  const statusData = statusMap.get(status) || createStatusAccumulator(status);
  statusData.dwellSamples += 1;
  statusData.totalDwellDays += days;
  statusMap.set(status, statusData);
}

function getCurrentEnteredAt(events, currentStatus, fallbackDate) {
  if (isMissingStatus(currentStatus)) return fallbackDate;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].after === currentStatus) {
      return events[index].at;
    }
  }

  return fallbackDate;
}

function summarizeStatusField(field, records, now, monthStart) {
  const statusMap = new Map();
  const linkMap = new Map();
  let transitionTotal = 0;
  let enteredThisMonth = 0;
  let exitedThisMonth = 0;

  records.forEach((record) => {
    const events = [...(record.eventsByField[field.key] || [])].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
    const currentStatus =
      record.currentValues[field.key] || events.at(-1)?.after || null;
    const createdAt = record.createdAt || events[0]?.at || now;

    events.forEach((event) => {
      if (event.before === event.after) return;

      transitionTotal += 1;
      const linkKey = `${event.before}__${event.after}`;
      const link = linkMap.get(linkKey) || {
        from: event.before,
        to: event.after,
        value: 0,
        thisMonth: 0,
      };
      link.value += 1;
      if (event.at >= monthStart) {
        link.thisMonth += 1;
        enteredThisMonth += 1;
        if (!isMissingStatus(event.after)) {
          const enteredStatus =
            statusMap.get(event.after) || createStatusAccumulator(event.after);
          enteredStatus.enteredThisMonth += 1;
          statusMap.set(event.after, enteredStatus);
        }
        if (!isMissingStatus(event.before)) {
          exitedThisMonth += 1;
          const exitedStatus =
            statusMap.get(event.before) ||
            createStatusAccumulator(event.before);
          exitedStatus.exitedThisMonth += 1;
          statusMap.set(event.before, exitedStatus);
        }
      }
      linkMap.set(linkKey, link);
    });

    if (events.length > 0) {
      const firstEvent = events[0];
      if (!isMissingStatus(firstEvent.before) && createdAt < firstEvent.at) {
        addDwell(statusMap, firstEvent.before, createdAt, firstEvent.at);
      }

      events.forEach((event, index) => {
        const nextEvent = events[index + 1];
        addDwell(statusMap, event.after, event.at, nextEvent?.at || now);
      });

      const lastEvent = events.at(-1);
      if (
        currentStatus &&
        currentStatus !== lastEvent?.after &&
        !isMissingStatus(currentStatus)
      ) {
        addDwell(statusMap, currentStatus, lastEvent.at, now);
      }
    } else if (!isMissingStatus(currentStatus)) {
      addDwell(statusMap, currentStatus, createdAt, now);
    }

    if (!isMissingStatus(currentStatus)) {
      const currentStatusData =
        statusMap.get(currentStatus) || createStatusAccumulator(currentStatus);
      const enteredAt = getCurrentEnteredAt(events, currentStatus, createdAt);
      const daysInStatus = Math.max(
        0,
        (now.getTime() - enteredAt.getTime()) / DAY_IN_MS,
      );

      currentStatusData.currentCount += 1;
      currentStatusData.maxDaysInStatus = Math.max(
        currentStatusData.maxDaysInStatus,
        daysInStatus,
      );
      if (
        daysInStatus > STATUS_FLOW_BLOCKED_DAYS &&
        !isTerminalStatus(currentStatus)
      ) {
        currentStatusData.blockedCount += 1;
      }
      statusMap.set(currentStatus, currentStatusData);
    }
  });

  const statuses = [...statusMap.values()]
    .map((status) => ({
      name: status.name,
      currentCount: status.currentCount,
      enteredThisMonth: status.enteredThisMonth,
      exitedThisMonth: status.exitedThisMonth,
      avgDays: status.dwellSamples
        ? Math.round(status.totalDwellDays / status.dwellSamples)
        : 0,
      blockedCount: status.blockedCount,
      maxDaysInStatus: Math.round(status.maxDaysInStatus),
    }))
    .sort(
      (a, b) =>
        b.currentCount - a.currentCount || b.blockedCount - a.blockedCount,
    );

  const links = [...linkMap.values()]
    .filter((link) => !isMissingStatus(link.to))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const blocked = statuses
    .filter((status) => status.blockedCount > 0)
    .sort((a, b) => b.blockedCount - a.blockedCount)
    .slice(0, 5);

  const totalCurrent = statuses.reduce(
    (sum, status) => sum + status.currentCount,
    0,
  );
  const avgDaysOverall = statuses.length
    ? Math.round(
        statuses.reduce((sum, status) => sum + status.avgDays, 0) /
          statuses.length,
      )
    : 0;

  return {
    key: field.key,
    label: field.label,
    totalCurrent,
    totalTransitions: transitionTotal,
    enteredThisMonth,
    exitedThisMonth,
    avgDaysOverall,
    statuses: statuses.slice(0, 8),
    links,
    blocked,
  };
}

async function fetchStructureStatusFlowAnalyticsFromDb(structureId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const records = new Map();

  const [anagraficaSnap, structureDataSnap] = await Promise.all([
    adminDb
      .collection("anagrafica")
      .where("structureIds", "array-contains", structureId)
      .get(),
    adminDb
      .collection("anagrafica_data")
      .where("structureId", "==", structureId)
      .get(),
  ]);

  anagraficaSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.deletedAt) return;

    const record = ensurePersonRecord(records, doc.id, {
      name: getPersonName(data) || doc.id,
      createdAt: normalizeDateValue(
        data.createdAt || data.registeredAt || data.updatedAt,
      ),
    });

    STATUS_FLOW_FIELDS.filter((field) => field.source === "global").forEach(
      (field) => {
        record.currentValues[field.key] = getFieldCurrentValue(data, field);
      },
    );
  });

  structureDataSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.anagraficaId) return;

    const record = ensurePersonRecord(records, data.anagraficaId, {
      createdAt: normalizeDateValue(data.createdAt || data.updatedAt),
    });

    STATUS_FLOW_FIELDS.filter((field) => field.source === "structure").forEach(
      (field) => {
        record.currentValues[field.key] = getFieldCurrentValue(data, field);
      },
    );
  });

  await Promise.all([
    ...anagraficaSnap.docs.map(async (doc) => {
      if (doc.data().deletedAt) return;
      const record = records.get(doc.id);
      if (!record) return;

      const historySnap = await doc.ref
        .collection("history")
        .where("changedByStructure", "==", structureId)
        .get();
      historySnap.docs.forEach((historyDoc) => {
        addHistoryEventToRecord(
          record,
          historyDoc.data(),
          STATUS_FLOW_FIELDS.filter((field) => field.source === "global"),
        );
      });
    }),
    ...structureDataSnap.docs.map(async (doc) => {
      const data = doc.data();
      if (!data.anagraficaId) return;
      const record = records.get(data.anagraficaId);
      if (!record) return;

      const historySnap = await doc.ref.collection("history").get();
      historySnap.docs.forEach((historyDoc) => {
        addHistoryEventToRecord(
          record,
          historyDoc.data(),
          STATUS_FLOW_FIELDS.filter((field) => field.source === "structure"),
        );
      });
    }),
  ]);

  const fields = STATUS_FLOW_FIELDS.map((field) =>
    summarizeStatusField(field, records, now, monthStart),
  )
    .filter(
      (field) =>
        field.totalTransitions > 0 ||
        field.totalCurrent > 0 ||
        field.statuses.length > 0,
    )
    .sort(
      (a, b) =>
        b.totalTransitions - a.totalTransitions ||
        b.blocked.length - a.blocked.length ||
        b.totalCurrent - a.totalCurrent,
    );

  return {
    blockedThresholdDays: STATUS_FLOW_BLOCKED_DAYS,
    monthStart: monthStart.toISOString(),
    updatedAt: now.toISOString(),
    fields,
  };
}

/**
 * Internal function to fetch statistics from database
 * @param {string} structureId - The structure ID
 * @returns {Object} The statistics data
 */
async function fetchStatisticsFromDb(structureId) {
  const statsRef = adminDb.collection("statistics").doc(structureId);
  const statsSnap = await statsRef.get();

  if (!statsSnap.exists) {
    return null;
  }

  const data = statsSnap.data();
  return JSON.parse(JSON.stringify(data));
}

/**
 * Internal function to fetch monthly statistics for trends
 * @param {string} structureId - The structure ID
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Array} Array of monthly statistics
 */
async function fetchMonthlyStatsFromDb(structureId, months = 6) {
  const monthlyRef = adminDb
    .collection("statistics")
    .doc(structureId)
    .collection("monthly")
    .orderBy("__name__", "desc")
    .limit(months);

  const monthlySnap = await monthlyRef.get();

  if (monthlySnap.empty) {
    return [];
  }

  return monthlySnap.docs
    .map((doc) => ({
      id: doc.id,
      ...JSON.parse(JSON.stringify(doc.data())),
    }))
    .reverse(); // Chronological order
}

function isTimestampLike(value) {
  return (
    value &&
    typeof value === "object" &&
    "_seconds" in value &&
    "_nanoseconds" in value
  );
}

function mergeStatsAggregate(target, source = {}) {
  Object.entries(source).forEach(([key, value]) => {
    if (key === "id" || value === null || value === undefined) return;

    if (typeof value === "number") {
      target[key] = (target[key] || 0) + value;
      return;
    }

    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      !isTimestampLike(value)
    ) {
      const entries = Object.entries(value);
      const isNumericMap = entries.every(([, mapValue]) => {
        return typeof mapValue === "number";
      });

      if (!isNumericMap) return;

      target[key] = { ...(target[key] || {}) };
      entries.forEach(([mapKey, mapValue]) => {
        target[key][mapKey] = (target[key][mapKey] || 0) + mapValue;
      });
    }
  });

  return target;
}

async function fetchStatsCollectionFromDb(structureId, collectionName, limit) {
  const statsRef = adminDb
    .collection("statistics")
    .doc(structureId)
    .collection(collectionName)
    .orderBy("__name__", "desc")
    .limit(limit);

  const statsSnap = await statsRef.get();

  if (statsSnap.empty) {
    return [];
  }

  return statsSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...JSON.parse(JSON.stringify(doc.data())),
    }))
    .reverse();
}

async function fetchYearlyStatsFromDb(structureId, years = 5) {
  const monthlyStats = await fetchStatsCollectionFromDb(
    structureId,
    "monthly",
    years * 12,
  );
  const yearlyStats = new Map();

  monthlyStats.forEach((monthStats) => {
    const year = /^\d{4}-\d{2}$/.test(monthStats.id)
      ? monthStats.id.slice(0, 4)
      : null;
    if (!year) return;

    const aggregate = yearlyStats.get(year) || { id: year };
    yearlyStats.set(year, mergeStatsAggregate(aggregate, monthStats));
  });

  return [...yearlyStats.values()];
}

/**
 * Get statistics for a structure (Server Action)
 * @param {string} structureId - The structure ID
 * @returns {string} JSON string with statistics data
 */
export async function getStatistics(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({
      userUid,
      structureId,
    });

    // Use cached fetcher for better performance
    const getCachedStats = unstable_cache(
      async () => fetchStatisticsFromDb(structureId),
      [`statistics`, structureId],
      {
        tags: [`statistics-${structureId}`],
        revalidate: 60, // Revalidate every minute
      },
    );

    const stats = await getCachedStats();

    return JSON.stringify({
      success: true,
      data: stats || getEmptyStats(),
    });
  } catch (error) {
    console.error("[GET_STATISTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: getEmptyStats(),
    });
  }
}

/**
 * Get monthly statistics for trends (Server Action)
 * @param {string} structureId - The structure ID
 * @param {number} months - Number of months to fetch
 * @returns {string} JSON string with monthly statistics
 */
export async function getMonthlyStatistics(structureId, months = 6) {
  try {
    const { userUid } = await requireUser();

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    const getCachedMonthlyStats = unstable_cache(
      async () => fetchMonthlyStatsFromDb(structureId, months),
      [`statistics-monthly`, structureId, months.toString()],
      {
        tags: [`statistics-monthly-${structureId}`],
        revalidate: 300, // Revalidate every 5 minutes
      },
    );

    const monthlyStats = await getCachedMonthlyStats();

    return JSON.stringify({
      success: true,
      data: monthlyStats,
    });
  } catch (error) {
    console.error("[GET_MONTHLY_STATISTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: [],
    });
  }
}

/**
 * Get time-series statistics for trends.
 * @param {string} structureId - The structure ID
 * @param {"weekly"|"monthly"|"yearly"} period - Granularity to fetch
 * @param {number} limit - Number of periods to fetch
 * @returns {string} JSON string with trend statistics
 */
export async function getTrendStatistics(
  structureId,
  period = "monthly",
  limit = 12,
) {
  try {
    const { userUid } = await requireUser();

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    const normalizedPeriod = ["weekly", "monthly", "yearly"].includes(period)
      ? period
      : "monthly";
    const normalizedLimit = Math.max(
      1,
      Math.min(Number.parseInt(limit, 10) || 12, 60),
    );

    const getCachedTrendStats = unstable_cache(
      async () => {
        if (normalizedPeriod === "yearly") {
          return fetchYearlyStatsFromDb(structureId, normalizedLimit);
        }

        const collectionName =
          normalizedPeriod === "weekly" ? "weekly" : "monthly";
        return fetchStatsCollectionFromDb(
          structureId,
          collectionName,
          normalizedLimit,
        );
      },
      [
        "statistics-trend",
        structureId,
        normalizedPeriod,
        normalizedLimit.toString(),
      ],
      {
        tags: [`statistics-trend-${structureId}`],
        revalidate: 300,
      },
    );

    const trendStats = await getCachedTrendStats();

    return JSON.stringify({
      success: true,
      data: trendStats,
    });
  } catch (error) {
    console.error("[GET_TREND_STATISTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: [],
    });
  }
}

/**
 * Get upcoming reminders and expiring files for a structure dashboard.
 * @param {string} structureId - Structure ID
 * @param {number} daysAhead - Upcoming window in days
 * @param {number} limit - Max reminders and files to return
 * @returns {string} JSON string with upcoming operational items
 */
export async function getStructureUpcomingItems(
  structureId,
  daysAhead = 30,
  limit = 8,
) {
  try {
    const { userUid } = await requireUser();

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    const now = new Date();
    const normalizedDays = Math.max(
      1,
      Math.min(Number.parseInt(daysAhead, 10) || 30, 365),
    );
    const normalizedLimit = Math.max(
      1,
      Math.min(Number.parseInt(limit, 10) || 8, 30),
    );
    const windowEnd = new Date(
      now.getTime() + normalizedDays * 24 * 60 * 60 * 1000,
    );

    const [remindersSnap, personalFilesSnap, structureFilesSnap] =
      await Promise.all([
        adminDb
          .collection("reminders")
          .where("structureId", "==", structureId)
          .get(),
        adminDb
          .collection("files")
          .where("structureIds", "array-contains", structureId)
          .get(),
        adminDb
          .collection("structureFiles")
          .where("structureId", "==", structureId)
          .get(),
      ]);

    const reminders = remindersSnap.docs
      .map((doc) => {
        const data = doc.data();
        const dueAt = normalizeDateValue(data.date);
        return {
          id: doc.id,
          anagraficaId: data.anagraficaId || null,
          accessId: data.accessId || null,
          serviceType: data.serviceType || null,
          note: data.note || null,
          enteRiferimento: data.enteRiferimento || null,
          linkedToAccess: data.linkedToAccess === true,
          status: data.status || "pending",
          dueAt: dueAt?.toISOString() || null,
        };
      })
      .filter((item) => {
        const dueAt = normalizeDateValue(item.dueAt);
        return (
          item.status !== "completed" &&
          isWithinUpcomingWindow(dueAt, now, windowEnd)
        );
      })
      .sort(sortByDateField("dueAt"))
      .slice(0, normalizedLimit);

    const personalFiles = personalFilesSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          source: "person",
          name: data.nome || data.nomeOriginale || "Documento",
          originalName: data.nomeOriginale || data.nome || "Documento",
          anagraficaId: data.anagraficaId || null,
          accessoId: data.accessoId || null,
          category: data.category || null,
          expiresAt: toIsoString(data.dataScadenza),
          deleted: data.deleted === true,
        };
      })
      .filter((item) =>
        isWithinUpcomingWindow(
          normalizeDateValue(item.expiresAt),
          now,
          windowEnd,
        ),
      )
      .filter((item) => !item.deleted);

    const structureFiles = structureFilesSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          source: "structure",
          name: data.nome || data.nomeOriginale || "Documento struttura",
          originalName:
            data.nomeOriginale || data.nome || "Documento struttura",
          anagraficaId: null,
          accessoId: null,
          category: "Documenti struttura",
          expiresAt: toIsoString(data.dataScadenza),
          deleted: data.deleted === true,
        };
      })
      .filter((item) =>
        isWithinUpcomingWindow(
          normalizeDateValue(item.expiresAt),
          now,
          windowEnd,
        ),
      )
      .filter((item) => !item.deleted);

    const reminderFiles = remindersSnap.docs
      .map((doc) => {
        const data = doc.data();
        const file = data.file || {};
        return {
          id: `${doc.id}-file`,
          source: "reminder",
          name: file.nomeOriginale || file.nome || "Documento promemoria",
          originalName:
            file.nomeOriginale || file.nome || "Documento promemoria",
          anagraficaId: data.anagraficaId || null,
          accessoId: data.accessId || null,
          category: data.serviceType || "Promemoria",
          expiresAt: toIsoString(file.dataScadenza || data.dataScadenza),
          deleted: false,
        };
      })
      .filter((item) =>
        isWithinUpcomingWindow(
          normalizeDateValue(item.expiresAt),
          now,
          windowEnd,
        ),
      );

    const expiringFiles = [
      ...personalFiles,
      ...structureFiles,
      ...reminderFiles,
    ]
      .sort(sortByDateField("expiresAt"))
      .slice(0, normalizedLimit);

    const personNames = await fetchPersonNames([
      ...reminders.map((item) => item.anagraficaId),
      ...expiringFiles.map((item) => item.anagraficaId),
    ]);

    return JSON.stringify({
      success: true,
      data: {
        daysAhead: normalizedDays,
        reminders: reminders.map((item) => ({
          ...item,
          personName: personNames.get(item.anagraficaId) || null,
        })),
        expiringFiles: expiringFiles.map((item) => ({
          ...item,
          personName: personNames.get(item.anagraficaId) || null,
        })),
      },
    });
  } catch (error) {
    console.error("[GET_STRUCTURE_UPCOMING_ITEMS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: {
        daysAhead: daysAhead || 30,
        reminders: [],
        expiringFiles: [],
      },
    });
  }
}

/**
 * Get status-flow analytics for a structure.
 * Reconstructs person timelines from history entries and current records.
 * @param {string} structureId - Structure ID
 * @returns {string} JSON string with status-flow data
 */
export async function getStructureStatusFlowAnalytics(structureId) {
  try {
    const { userUid } = await requireUser();

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    const getCachedStatusFlow = unstable_cache(
      async () => fetchStructureStatusFlowAnalyticsFromDb(structureId),
      ["statistics-status-flow", structureId],
      {
        tags: [`statistics-status-flow-${structureId}`],
        revalidate: 300,
      },
    );

    const statusFlow = await getCachedStatusFlow();

    return JSON.stringify({
      success: true,
      data: statusFlow,
    });
  } catch (error) {
    console.error("[GET_STRUCTURE_STATUS_FLOW_ANALYTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: {
        blockedThresholdDays: STATUS_FLOW_BLOCKED_DAYS,
        monthStart: null,
        updatedAt: null,
        fields: [],
      },
    });
  }
}

/**
 * Get statistics for multiple accessible structures.
 * @param {string[]} structureIds - Structure IDs visible to the current user
 * @returns {string} JSON string keyed by structure ID
 */
export async function getStatisticsForStructures(structureIds = []) {
  try {
    const { userUid } = await requireUser();
    const uniqueStructureIds = [
      ...new Set(
        (Array.isArray(structureIds) ? structureIds : []).filter(Boolean),
      ),
    ].slice(0, 100);

    await Promise.all(
      uniqueStructureIds.map((structureId) =>
        verifyUserPermissions({
          userUid,
          structureId,
        }),
      ),
    );

    const entries = await Promise.all(
      uniqueStructureIds.map(async (structureId) => {
        const stats = await fetchStatisticsFromDb(structureId);
        return [structureId, stats || getEmptyStats()];
      }),
    );

    return JSON.stringify({
      success: true,
      data: Object.fromEntries(entries),
    });
  } catch (error) {
    console.error("[GET_STATISTICS_FOR_STRUCTURES ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: {},
    });
  }
}

/**
 * Returns empty stats structure for fallback
 */
function getEmptyStats() {
  return {
    // Anagrafica Stats
    totalPersons: 0,
    byGender: {},
    byAgeRange: {},
    byCittadinanza: {},
    byBirthPlace: {},
    byRegistrationStatus: {},
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

    // History / lifecycle Stats
    totalHistoryEvents: 0,
    byHistoryChangeType: {},
    byHistoryGroup: {},
    byHistoryField: {},
    byStatusTransition: {},
    byTransitionField: {},
    lastHistoryEventAt: null,
  };
}
