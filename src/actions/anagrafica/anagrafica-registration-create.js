"use server";

import { createRegistrationDraftUseCase } from "@/features/anagrafica/application/create-registration-draft";
import { invalidateAnagraficaCaches } from "@/lib/cache";
import { computeGroupChanges } from "@/utils/anagraficaUtils";
import { logDataCreate } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import { createAccessInternal } from "./access";
import {
  adminDb,
  buildRegistrationState,
  buildStructureDataPayload,
  choosePreferredStructureDataDoc,
  getStructureDataQuery,
  getStructureDataRef,
  markLegacyStructureDataDocsSuperseded,
  REGISTRATION_STATUS,
  sanitizeAnagraficaPayload,
} from "./anagrafica-core";
import { createHistoryEntry } from "./history";

async function findExistingAnagraficaByCodiceFiscale(codiceFiscale) {
  if (!codiceFiscale) {
    return null;
  }

  const querySnap = await adminDb
    .collection("anagrafica")
    .where("anagrafica.codiceFiscale", "==", codiceFiscale)
    .where("deleted", "==", false)
    .limit(1)
    .get();

  return querySnap.empty ? null : querySnap.docs[0];
}

function getExistingAccessList(data = {}) {
  return [
    ...new Set([
      ...(Array.isArray(data.canBeAccessedBy) ? data.canBeAccessedBy : []),
      ...(Array.isArray(data.structureIds) ? data.structureIds : []),
    ]),
  ];
}

async function createOrLinkGlobalAnagrafica({
  globalData,
  structureId,
  codiceFiscale,
}) {
  const existingDoc =
    await findExistingAnagraficaByCodiceFiscale(codiceFiscale);

  if (existingDoc) {
    const anagraficaId = existingDoc.id;
    const currentAccess = getExistingAccessList(existingDoc.data());

    if (!currentAccess.includes(structureId)) {
      const error = new Error(
        "A record with this fiscal code already exists. Use the sharing workflow instead of automatically linking it.",
      );
      error.code = "EXISTING_ANAGRAFICA_REQUIRES_SHARE";
      throw error;
    }

    return {
      anagraficaId,
      existingDoc,
    };
  }

  const docRef = await adminDb.collection("anagrafica").add(globalData);

  return {
    anagraficaId: docRef.id,
    existingDoc: null,
  };
}

async function upsertStructureDataForRegistration({
  anagraficaId,
  structureId,
  structureData,
  userUid,
}) {
  const structureDataRef = getStructureDataRef(anagraficaId, structureId);
  const [canonicalSnap, legacySnap] = await Promise.all([
    structureDataRef.get(),
    getStructureDataQuery(anagraficaId, structureId).get(),
  ]);

  const availableDocs = [
    ...(canonicalSnap.exists
      ? [
          {
            id: canonicalSnap.id,
            ref: structureDataRef,
            data: canonicalSnap.data(),
          },
        ]
      : []),
    ...legacySnap.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    })),
  ];

  const existingStructureData = choosePreferredStructureDataDoc(
    availableDocs.filter(
      (doc, index, array) =>
        array.findIndex((candidate) => candidate.ref.path === doc.ref.path) ===
        index,
    ),
    structureDataRef.id,
  );

  const canonicalStructureData = buildStructureDataPayload(
    anagraficaId,
    structureId,
    existingStructureData?.data || {},
    structureData,
    userUid,
  );

  await structureDataRef.set(canonicalStructureData);
  await markLegacyStructureDataDocsSuperseded(
    anagraficaId,
    structureId,
    structureDataRef.id,
  );

  return {
    structureDataId: structureDataRef.id,
    existingStructureData,
  };
}

async function createRegistrationHistoryEntries({
  anagraficaId,
  existingDoc,
  globalData,
  existingStructureData,
  structureData,
  structureDataId,
  userUid,
  userMail,
  structureId,
}) {
  if (!existingDoc) {
    await createHistoryEntry({
      anagraficaId,
      changeType: "create",
      changedGroups: ["anagrafica"],
      changes: {
        anagrafica: {
          before: null,
          after: globalData.anagrafica,
        },
      },
      userUid,
      userMail,
      structureId,
    });
  }

  const structureChangedGroups = [];
  const structureChanges = {};
  const structureChangeSet = computeGroupChanges(
    existingStructureData?.data || {},
    structureData,
  );

  structureChangeSet.changedGroups.forEach((group) => {
    structureChangedGroups.push(group);
    structureChanges[group] = structureChangeSet.changes[group];
  });

  if (structureChangedGroups.length > 0 && structureDataId) {
    await createHistoryEntry({
      anagraficaId,
      changeType: existingStructureData ? "update" : "create",
      changedGroups: structureChangedGroups,
      changes: structureChanges,
      userUid,
      userMail,
      structureId,
      structureDataId,
    });
  }
}

function getAllowedStructures(existingDoc, structureId) {
  return existingDoc
    ? [...new Set([...getExistingAccessList(existingDoc.data()), structureId])]
    : [structureId];
}

async function createActiveRegistrationRecord({ body, services = [] }) {
  const { userUid, headers: hdr } = await requireUser();
  const userMail = hdr?.get?.("x-user-email") || null;
  const structureId = body.registeredByStructure;
  const {
    anagrafica: incomingAnagrafica,
    internalNotes,
    structureGroups: incomingStructureGroups,
  } = sanitizeAnagraficaPayload(body);

  await verifyUserPermissions({
    userUid,
    structureId,
  });

  const globalData = {
    anagrafica: incomingAnagrafica,
    canBeAccessedBy: [structureId],
    structureIds: [structureId],
    sharedDataGrants: [],
    internalNotes,
    ...buildRegistrationState(REGISTRATION_STATUS.ACTIVE, userUid, userMail),
    registeredBy: userUid,
    registeredByMail: userMail,
    registeredByStructure: structureId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
  };

  const structureData = {
    structureId,
    ...incomingStructureGroups,
    notes: body.notes || "",
    updatedAt: new Date(),
    updatedBy: userUid,
    status: "Active",
  };

  const { anagraficaId, existingDoc } = await createOrLinkGlobalAnagrafica({
    globalData,
    structureId,
    codiceFiscale: incomingAnagrafica?.codiceFiscale,
  });

  let structurePersistence;
  try {
    structurePersistence = await upsertStructureDataForRegistration({
      anagraficaId,
      structureId,
      structureData,
      userUid,
    });
  } catch (error) {
    console.error("Error creating structure data", error);
    throw new Error("Generazione dati struttura fallita");
  }

  await createRegistrationHistoryEntries({
    anagraficaId,
    existingDoc,
    globalData,
    existingStructureData: structurePersistence.existingStructureData,
    structureData,
    structureDataId: structurePersistence.structureDataId,
    userUid,
    userMail,
    structureId,
  });

  const allStructures = getAllowedStructures(existingDoc, structureId);

  if (services.length > 0) {
    await createAccessInternal({
      anagraficaId,
      services,
      structureId,
      userUid,
      structureIds: allStructures,
    });
  }

  invalidateAnagraficaCaches(anagraficaId, allStructures);

  await logDataCreate({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    structureId,
    details: {
      hasServices: services.length > 0,
      linkedToExisting: !!existingDoc,
    },
  });

  return {
    anagraficaId,
    existingDoc,
  };
}

export async function createAnagraficaShared(body, services = []) {
  try {
    const { anagraficaId } = await createActiveRegistrationRecord({
      body,
      services,
    });

    return JSON.stringify({ id: anagraficaId });
  } catch (error) {
    console.error("[CREATE_ANAGRAFICA FATAL]:", error.stack || error);
    return JSON.stringify(
      {
        error: true,
        message: error.message,
      },
      null,
      2,
    );
  }
}

export async function createRegistrationDraftShared(body) {
  try {
    const { userUid, headers: hdr } = await requireUser();
    const userMail = hdr?.get?.("x-user-email") || null;

    const result = await createRegistrationDraftUseCase({
      body,
      actor: {
        userUid,
        userMail,
      },
    });

    return JSON.stringify(result);
  } catch (error) {
    console.error("[CREATE_REGISTRATION_DRAFT FATAL]:", error.stack || error);
    return JSON.stringify(
      {
        error: true,
        message: error.message,
      },
      null,
      2,
    );
  }
}
