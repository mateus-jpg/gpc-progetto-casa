export const SHAREABLE_STRUCTURE_DATA_FIELDS = [
  "nucleoFamiliare",
  "legaleAbitativa",
  "lavoroFormazione",
  "vulnerabilita",
  "referral",
  "notes",
];

export const SHAREABLE_STRUCTURE_DATA_LABELS = {
  nucleoFamiliare: "Nucleo familiare",
  legaleAbitativa: "Situazione legale e abitativa",
  lavoroFormazione: "Lavoro e formazione",
  vulnerabilita: "Vulnerabilita e prospettive",
  referral: "Referral",
  notes: "Note struttura",
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeSharedFields(sharedFields = []) {
  if (!Array.isArray(sharedFields)) {
    return [];
  }

  return [
    ...new Set(
      sharedFields.filter((field) =>
        SHAREABLE_STRUCTURE_DATA_FIELDS.includes(field),
      ),
    ),
  ];
}

export function sanitizeSharedDataGrants(grants = []) {
  if (!Array.isArray(grants)) {
    return [];
  }

  const dedupedGrants = new Map();

  for (const grant of grants) {
    if (!grant || typeof grant !== "object") {
      continue;
    }

    const sourceStructureId = isNonEmptyString(grant.sourceStructureId)
      ? grant.sourceStructureId.trim()
      : "";
    const targetStructureId = isNonEmptyString(grant.targetStructureId)
      ? grant.targetStructureId.trim()
      : "";

    if (
      !sourceStructureId ||
      !targetStructureId ||
      sourceStructureId === targetStructureId
    ) {
      continue;
    }

    const sharedFields = normalizeSharedFields(
      grant.sharedFields || grant.fields,
    );
    const grantKey = `${sourceStructureId}::${targetStructureId}`;

    if (sharedFields.length === 0) {
      dedupedGrants.delete(grantKey);
      continue;
    }

    dedupedGrants.set(grantKey, {
      sourceStructureId,
      targetStructureId,
      sharedFields,
      createdAt: grant.createdAt || grant.updatedAt || null,
      createdBy: grant.createdBy || grant.updatedBy || null,
      updatedAt: grant.updatedAt || grant.createdAt || null,
      updatedBy: grant.updatedBy || grant.createdBy || null,
    });
  }

  return [...dedupedGrants.values()];
}

export function upsertSharedDataGrants(
  existingGrants = [],
  {
    sourceStructureId,
    targetStructureIds = [],
    sharedFields = [],
    actorUid = null,
    now = new Date(),
  },
) {
  if (!isNonEmptyString(sourceStructureId)) {
    return sanitizeSharedDataGrants(existingGrants);
  }

  const normalizedTargets = [
    ...new Set(
      (Array.isArray(targetStructureIds) ? targetStructureIds : [])
        .filter((targetStructureId) => isNonEmptyString(targetStructureId))
        .map((targetStructureId) => targetStructureId.trim())
        .filter((targetStructureId) => targetStructureId !== sourceStructureId),
    ),
  ];

  if (normalizedTargets.length === 0) {
    return sanitizeSharedDataGrants(existingGrants);
  }

  const normalizedFields = normalizeSharedFields(sharedFields);
  const sanitizedExisting = sanitizeSharedDataGrants(existingGrants);
  const nextGrants = sanitizedExisting.filter(
    (grant) =>
      !(
        grant.sourceStructureId === sourceStructureId &&
        normalizedTargets.includes(grant.targetStructureId)
      ),
  );

  if (normalizedFields.length === 0) {
    return sanitizeSharedDataGrants(nextGrants);
  }

  for (const targetStructureId of normalizedTargets) {
    const previousGrant = sanitizedExisting.find(
      (grant) =>
        grant.sourceStructureId === sourceStructureId &&
        grant.targetStructureId === targetStructureId,
    );

    nextGrants.push({
      sourceStructureId,
      targetStructureId,
      sharedFields: normalizedFields,
      createdAt: previousGrant?.createdAt || now,
      createdBy: previousGrant?.createdBy || actorUid,
      updatedAt: now,
      updatedBy: actorUid,
    });
  }

  return sanitizeSharedDataGrants(nextGrants);
}

export function removeSharedDataGrantsForStructure(
  existingGrants = [],
  structureId,
) {
  if (!isNonEmptyString(structureId)) {
    return sanitizeSharedDataGrants(existingGrants);
  }

  return sanitizeSharedDataGrants(existingGrants).filter(
    (grant) =>
      grant.sourceStructureId !== structureId &&
      grant.targetStructureId !== structureId,
  );
}

export function getOutgoingSharedFields(
  existingGrants = [],
  sourceStructureId,
  targetStructureId,
) {
  if (
    !isNonEmptyString(sourceStructureId) ||
    !isNonEmptyString(targetStructureId)
  ) {
    return [];
  }

  const grant = sanitizeSharedDataGrants(existingGrants).find(
    (candidate) =>
      candidate.sourceStructureId === sourceStructureId &&
      candidate.targetStructureId === targetStructureId,
  );

  return grant?.sharedFields || [];
}

function hasSharedValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}

export function buildSharedStructurePayload(
  structureData = {},
  sharedFields = [],
) {
  const payload = {};

  for (const field of normalizeSharedFields(sharedFields)) {
    if (hasSharedValue(structureData[field])) {
      payload[field] = structureData[field];
    }
  }

  return payload;
}
