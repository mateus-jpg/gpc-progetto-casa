import admin from "@/lib/firebase/firebaseAdmin";
import {
  buildSharedStructurePayload,
  SHAREABLE_STRUCTURE_DATA_FIELDS,
  sanitizeSharedDataGrants,
} from "@/utils/anagraficaSharing";
import { sanitizeVulnerabilities } from "@/utils/vulnerability";

export const adminDb = admin.firestore();
const STRUCTURE_DATA_GROUPS = [
  ...SHAREABLE_STRUCTURE_DATA_FIELDS.filter((field) => field !== "notes"),
  "contestoCasa",
];
export const STRUCTURE_DATA_FIELDS = [...STRUCTURE_DATA_GROUPS, "notes"];
export const REGISTRATION_STATUS = {
  ACTIVE: "active",
  DRAFT_SIGNATURE_PENDING: "draft_signature_pending",
};

export function normalizeRegistrationStatus(status) {
  return status === REGISTRATION_STATUS.DRAFT_SIGNATURE_PENDING
    ? REGISTRATION_STATUS.DRAFT_SIGNATURE_PENDING
    : REGISTRATION_STATUS.ACTIVE;
}

export function buildRegistrationState(
  status,
  userUid,
  userMail = null,
  previous = {},
) {
  const normalizedStatus = normalizeRegistrationStatus(
    status ?? previous?.registrationStatus,
  );
  const isCompleted = normalizedStatus === REGISTRATION_STATUS.ACTIVE;

  return {
    registrationStatus: normalizedStatus,
    registrationCompletedAt: isCompleted
      ? previous?.registrationCompletedAt || new Date()
      : null,
    registrationCompletedBy: isCompleted
      ? previous?.registrationCompletedBy || userUid
      : null,
    registrationCompletedByMail: isCompleted
      ? previous?.registrationCompletedByMail || userMail || null
      : null,
  };
}

export function normalizeDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === "function") {
    return normalizeDateInput(value.toDate());
  }
  if (value?._seconds) {
    return normalizeDateInput(new Date(value._seconds * 1000));
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function sanitizePrivacyMetadata(privacy = {}) {
  if (!privacy || typeof privacy !== "object") {
    return {};
  }

  const sanitized = {};

  if (typeof privacy.paperNoticeCollected === "boolean") {
    sanitized.paperNoticeCollected = privacy.paperNoticeCollected;
  }

  const paperNoticeSignedAt = normalizeDateInput(privacy.paperNoticeSignedAt);
  if (paperNoticeSignedAt) {
    sanitized.paperNoticeSignedAt = paperNoticeSignedAt;
  }

  if (typeof privacy.paperNoticeReference === "string") {
    sanitized.paperNoticeReference = privacy.paperNoticeReference
      .trim()
      .slice(0, 200);
  }

  if (typeof privacy.paperNoticeNotes === "string") {
    sanitized.paperNoticeNotes = privacy.paperNoticeNotes.trim().slice(0, 1000);
  }

  if (typeof privacy.paperNoticeFileId === "string") {
    const trimmedFileId = privacy.paperNoticeFileId.trim();
    sanitized.paperNoticeFileId = trimmedFileId || null;
  }

  if (typeof privacy.paperNoticeFileName === "string") {
    sanitized.paperNoticeFileName = privacy.paperNoticeFileName
      .trim()
      .slice(0, 255);
  }

  const paperNoticeUploadedAt = normalizeDateInput(
    privacy.paperNoticeUploadedAt,
  );
  if (paperNoticeUploadedAt) {
    sanitized.paperNoticeUploadedAt = paperNoticeUploadedAt;
  }

  return sanitized;
}

export function sanitizeInternalNotes(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 5000);
}

function sanitizeContestoCasa(contestoCasa = {}) {
  if (!contestoCasa || typeof contestoCasa !== "object") {
    return {};
  }

  return {
    dataIngresso:
      typeof contestoCasa.dataIngresso === "string"
        ? contestoCasa.dataIngresso.trim()
        : "",
    dataUscita:
      typeof contestoCasa.dataUscita === "string"
        ? contestoCasa.dataUscita.trim()
        : "",
    notePercorsoCasa: sanitizeInternalNotes(contestoCasa.notePercorsoCasa),
    operatoreRiferimentoNome:
      typeof contestoCasa.operatoreRiferimentoNome === "string"
        ? contestoCasa.operatoreRiferimentoNome.trim().slice(0, 200)
        : "",
    operatoreRiferimentoUid:
      typeof contestoCasa.operatoreRiferimentoUid === "string"
        ? contestoCasa.operatoreRiferimentoUid.trim().slice(0, 200)
        : "",
    spazioAssegnato:
      typeof contestoCasa.spazioAssegnato === "string"
        ? contestoCasa.spazioAssegnato.trim().slice(0, 200)
        : "",
  };
}

export function buildPrivacyPayload(
  privacy = {},
  userUid,
  userMail = null,
  previous = {},
) {
  const normalized = sanitizePrivacyMetadata(privacy);
  const now = new Date();

  const createdAt = previous?.createdAt || now;
  const createdBy = previous?.createdBy || userUid;
  const createdByMail = previous?.createdByMail || userMail || null;

  return {
    paperNoticeCollected:
      normalized.paperNoticeCollected ??
      previous?.paperNoticeCollected ??
      false,
    paperNoticeSignedAt:
      normalized.paperNoticeSignedAt ?? previous?.paperNoticeSignedAt ?? null,
    paperNoticeReference:
      normalized.paperNoticeReference ?? previous?.paperNoticeReference ?? "",
    paperNoticeNotes:
      normalized.paperNoticeNotes ?? previous?.paperNoticeNotes ?? "",
    paperNoticeFileId:
      normalized.paperNoticeFileId ?? previous?.paperNoticeFileId ?? null,
    paperNoticeFileName:
      normalized.paperNoticeFileName ?? previous?.paperNoticeFileName ?? "",
    paperNoticeUploadedAt:
      normalized.paperNoticeUploadedAt ??
      previous?.paperNoticeUploadedAt ??
      null,
    createdAt,
    createdBy,
    createdByMail,
    updatedAt: now,
    updatedBy: userUid,
    updatedByMail: userMail || null,
  };
}

export function getComparablePrivacyFields(privacy = {}) {
  const paperNoticeSignedAt = normalizeDateInput(privacy.paperNoticeSignedAt);
  const paperNoticeUploadedAt = normalizeDateInput(
    privacy.paperNoticeUploadedAt,
  );

  return {
    paperNoticeCollected: privacy.paperNoticeCollected === true,
    paperNoticeSignedAt: paperNoticeSignedAt
      ? paperNoticeSignedAt.toISOString()
      : null,
    paperNoticeReference: privacy.paperNoticeReference || "",
    paperNoticeNotes: privacy.paperNoticeNotes || "",
    paperNoticeFileId: privacy.paperNoticeFileId || null,
    paperNoticeFileName: privacy.paperNoticeFileName || "",
    paperNoticeUploadedAt: paperNoticeUploadedAt
      ? paperNoticeUploadedAt.toISOString()
      : null,
  };
}

export function getStructureDataDocId(anagraficaId, structureId) {
  return `${anagraficaId}__${structureId}`;
}

export function getStructureDataRef(anagraficaId, structureId) {
  return adminDb
    .collection("anagrafica_data")
    .doc(getStructureDataDocId(anagraficaId, structureId));
}

export function getStructureDataQuery(anagraficaId, structureId) {
  return adminDb
    .collection("anagrafica_data")
    .where("anagraficaId", "==", anagraficaId)
    .where("structureId", "==", structureId);
}

function normalizeTimestampValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();

  const dateValue = value?.toDate?.() || value;
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function choosePreferredStructureDataDoc(docs, canonicalDocId = null) {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  return [...docs].sort((a, b) => {
    const aCanonical = canonicalDocId && a.id === canonicalDocId ? 1 : 0;
    const bCanonical = canonicalDocId && b.id === canonicalDocId ? 1 : 0;

    if (aCanonical !== bCanonical) {
      return bCanonical - aCanonical;
    }

    return (
      normalizeTimestampValue(b.data.updatedAt) -
      normalizeTimestampValue(a.data.updatedAt)
    );
  })[0];
}

export function buildStructureDataPayload(
  anagraficaId,
  structureId,
  baseData = {},
  structureGroups = {},
  userUid,
) {
  return {
    ...baseData,
    anagraficaId,
    structureId,
    ...structureGroups,
    createdAt: baseData.createdAt || new Date(),
    updatedAt: new Date(),
    updatedBy: userUid,
    status: baseData.status || "Active",
  };
}

export function extractStructureGroups(body = {}) {
  const extracted = {};

  for (const group of STRUCTURE_DATA_FIELDS) {
    if (Object.hasOwn(body, group)) {
      extracted[group] = body[group];
    }
  }

  return extracted;
}

export function sanitizeAnagraficaPayload(body = {}) {
  const structureGroups = extractStructureGroups(body);
  const internalNotes = sanitizeInternalNotes(body.internalNotes);

  if (structureGroups.vulnerabilita) {
    structureGroups.vulnerabilita = {
      ...structureGroups.vulnerabilita,
      vulnerabilita: sanitizeVulnerabilities(
        structureGroups.vulnerabilita.vulnerabilita,
      ),
    };
  }

  if (structureGroups.contestoCasa) {
    structureGroups.contestoCasa = sanitizeContestoCasa(
      structureGroups.contestoCasa,
    );
  }

  return {
    anagrafica:
      body.anagrafica && typeof body.anagrafica === "object"
        ? { ...body.anagrafica }
        : {},
    internalNotes,
    privacy: sanitizePrivacyMetadata(body.privacy),
    structureGroups,
  };
}

export async function markLegacyStructureDataDocsSuperseded(
  anagraficaId,
  structureId,
  canonicalDocId,
) {
  const snapshot = await getStructureDataQuery(anagraficaId, structureId).get();
  const updates = snapshot.docs
    .filter((doc) => doc.id !== canonicalDocId)
    .map((doc) =>
      doc.ref.set(
        {
          supersededBy: canonicalDocId,
          supersededAt: new Date(),
        },
        { merge: true },
      ),
    );

  await Promise.all(updates);
}

export async function fetchStructureDataFromDb(anagraficaId, structureId) {
  if (!structureId) {
    return null;
  }

  const canonicalRef = getStructureDataRef(anagraficaId, structureId);
  const canonicalSnap = await canonicalRef.get();
  if (canonicalSnap.exists) {
    return { id: canonicalSnap.id, ...canonicalSnap.data() };
  }

  const legacySnap = await getStructureDataQuery(
    anagraficaId,
    structureId,
  ).get();
  if (legacySnap.empty) {
    return null;
  }

  const legacyDocs = legacySnap.docs.map((doc) => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
  }));
  const preferredDoc = choosePreferredStructureDataDoc(
    legacyDocs,
    canonicalRef.id,
  );
  return preferredDoc ? { id: preferredDoc.id, ...preferredDoc.data } : null;
}

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

async function fetchStructureNames(structureIds = []) {
  const uniqueStructureIds = [...new Set((structureIds || []).filter(Boolean))];

  if (uniqueStructureIds.length === 0) {
    return new Map();
  }

  const structureNameMap = new Map();

  for (const batch of splitIntoChunks(uniqueStructureIds, 30)) {
    const snapshot = await adminDb
      .collection("structures")
      .where("__name__", "in", batch)
      .get();

    snapshot.docs.forEach((doc) => {
      structureNameMap.set(doc.id, doc.data()?.name || doc.id);
    });
  }

  return structureNameMap;
}

export async function fetchSharedStructureDataForTarget(
  anagraficaId,
  targetStructureId,
  anagraficaData = {},
) {
  if (!targetStructureId) {
    return [];
  }

  const allowedStructures = anagraficaData.canBeAccessedBy || [];
  const sharedDataGrants = getSharedDataGrants(anagraficaData).filter(
    (grant) =>
      grant.targetStructureId === targetStructureId &&
      grant.sourceStructureId !== targetStructureId &&
      allowedStructures.includes(grant.sourceStructureId),
  );

  if (sharedDataGrants.length === 0) {
    return [];
  }

  const structureNameMap = await fetchStructureNames(
    sharedDataGrants.map((grant) => grant.sourceStructureId),
  );

  const sharedDataEntries = await Promise.all(
    sharedDataGrants.map(async (grant) => {
      const sourceStructureData = await fetchStructureDataFromDb(
        anagraficaId,
        grant.sourceStructureId,
      );

      if (!sourceStructureData) {
        return null;
      }

      const sharedPayload = buildSharedStructurePayload(
        sourceStructureData,
        grant.sharedFields,
      );
      if (Object.keys(sharedPayload).length === 0) {
        return null;
      }

      return {
        id: `${grant.sourceStructureId}__${targetStructureId}`,
        structureId: grant.sourceStructureId,
        structureName:
          structureNameMap.get(grant.sourceStructureId) ||
          grant.sourceStructureId,
        sharedFields: grant.sharedFields,
        sharedAt: grant.updatedAt || grant.createdAt || null,
        updatedAt: sourceStructureData.updatedAt || null,
        ...sharedPayload,
      };
    }),
  );

  return sharedDataEntries.filter(Boolean);
}

export async function fetchAnagraficaFromDb(anagraficaId) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    return null;
  }

  const data = anagraficaSnap.data();
  return {
    id: anagraficaSnap.id,
    ...JSON.parse(JSON.stringify(data)),
  };
}
