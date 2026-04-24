"use server";

import { invalidateAnagraficaCaches } from "@/lib/cache";
import { computeGroupChanges } from "@/utils/anagraficaUtils";
import { logDataUpdate } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import {
  adminDb,
  buildPrivacyPayload,
  buildStructureDataPayload,
  choosePreferredStructureDataDoc,
  getComparablePrivacyFields,
  getStructureDataQuery,
  getStructureDataRef,
  markLegacyStructureDataDocsSuperseded,
  STRUCTURE_DATA_FIELDS,
  sanitizeAnagraficaPayload,
} from "./anagrafica-core";
import { getAnagraficaInternalShared } from "./anagrafica-read";
import { createHistoryEntry } from "./history";

/**
 * Internal function to update anagrafica
 * Can be called from both server actions and API routes
 * Uses Firestore transaction to prevent race conditions
 */
export async function updateAnagraficaInternalShared(
  anagraficaId,
  body,
  userUid,
  userMail = null,
  structureId = null,
) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const {
    anagrafica: incomingAnagrafica,
    internalNotes: incomingInternalNotes,
    privacy: incomingPrivacy,
    structureGroups: incomingStructureGroups,
  } = sanitizeAnagraficaPayload(body);

  const result = await adminDb.runTransaction(async (transaction) => {
    const anagraficaSnap = await transaction.get(anagraficaRef);
    if (!anagraficaSnap.exists) throw new Error("Anagrafica not found");
    const anagraficaData = anagraficaSnap.data();
    if (anagraficaData.deletedAt) throw new Error("Anagrafica not found");

    const allowedStructures = anagraficaData.canBeAccessedBy || [];
    await verifyUserPermissions({ userUid, allowedStructures });

    if (structureId) {
      await verifyUserPermissions({ userUid, structureId });

      if (!allowedStructures.includes(structureId)) {
        throw new Error(
          "Forbidden: structureId not allowed for this anagrafica",
        );
      }
    }

    let structureDataRef = null;
    let structureDataDoc = null;
    let legacyStructureDocs = [];
    if (structureId) {
      structureDataRef = getStructureDataRef(anagraficaId, structureId);
      const canonicalSnap = await transaction.get(structureDataRef);
      const legacySnap = await transaction.get(
        getStructureDataQuery(anagraficaId, structureId),
      );
      legacyStructureDocs = legacySnap.docs.map((doc) => ({
        id: doc.id,
        ref: doc.ref,
        data: doc.data(),
      }));
      const availableDocs = canonicalSnap.exists
        ? [
            {
              id: canonicalSnap.id,
              ref: structureDataRef,
              data: canonicalSnap.data(),
            },
            ...legacyStructureDocs,
          ]
        : legacyStructureDocs;

      structureDataDoc = choosePreferredStructureDataDoc(
        availableDocs.filter(
          (doc, index, array) =>
            array.findIndex(
              (candidate) => candidate.ref.path === doc.ref.path,
            ) === index,
        ),
        structureDataRef.id,
      );
    }

    const globalUpdate = {};
    const structureUpdate = {};

    if (incomingAnagrafica && typeof incomingAnagrafica === "object") {
      Object.keys(incomingAnagrafica).forEach((key) => {
        globalUpdate[`anagrafica.${key}`] = incomingAnagrafica[key];
      });
    }

    if (incomingPrivacy && Object.keys(incomingPrivacy).length > 0) {
      globalUpdate.privacy = buildPrivacyPayload(
        incomingPrivacy,
        userUid,
        userMail,
        anagraficaData.privacy || {},
      );
    }

    if (typeof incomingInternalNotes === "string") {
      globalUpdate.internalNotes = incomingInternalNotes;
    }

    Object.assign(structureUpdate, incomingStructureGroups);

    globalUpdate.updatedAt = new Date();
    globalUpdate.updatedBy = userUid;
    if (userMail) globalUpdate.updatedByMail = userMail;
    if (structureId) globalUpdate.updatedByStructure = structureId;

    structureUpdate.updatedAt = new Date();
    structureUpdate.updatedBy = userUid;

    const oldAnagrafica = anagraficaData.anagrafica || {};
    const oldPrivacy = anagraficaData.privacy || {};
    const oldInternalNotes =
      typeof anagraficaData.internalNotes === "string"
        ? anagraficaData.internalNotes
        : "";
    const newAnagrafica = incomingAnagrafica
      ? { ...oldAnagrafica, ...incomingAnagrafica }
      : oldAnagrafica;
    const newPrivacy =
      incomingPrivacy && Object.keys(incomingPrivacy).length > 0
        ? buildPrivacyPayload(incomingPrivacy, userUid, userMail, oldPrivacy)
        : oldPrivacy;
    const newInternalNotes =
      typeof incomingInternalNotes === "string"
        ? incomingInternalNotes
        : oldInternalNotes;

    const oldGlobalWrapped = {
      anagrafica: oldAnagrafica,
      internalNotes: oldInternalNotes,
      privacy: getComparablePrivacyFields(oldPrivacy),
    };
    const newGlobalWrapped = {
      anagrafica: newAnagrafica,
      internalNotes: newInternalNotes,
      privacy: getComparablePrivacyFields(newPrivacy),
    };
    const { changedGroups: globalChangedGroups, changes: globalChanges } =
      computeGroupChanges(oldGlobalWrapped, newGlobalWrapped);

    let structureChangedGroups = [];
    let structureChanges = {};
    let isNewStructureData = false;

    if (structureDataDoc) {
      const { changedGroups: sGroups, changes: sChanges } = computeGroupChanges(
        structureDataDoc.data,
        structureUpdate,
      );
      structureChangedGroups = sGroups;
      structureChanges = sChanges;
    } else if (structureId && Object.keys(structureUpdate).length > 2) {
      isNewStructureData = true;
      STRUCTURE_DATA_FIELDS.forEach((group) => {
        if (
          structureUpdate[group] &&
          Object.keys(structureUpdate[group]).length > 0
        ) {
          structureChangedGroups.push(group);
          structureChanges[group] = {
            before: null,
            after: structureUpdate[group],
          };
        }
      });
    }

    const allChangedGroups = [
      ...globalChangedGroups,
      ...structureChangedGroups,
    ];
    const allChanges = { ...globalChanges, ...structureChanges };

    const globalMetadataFields = [
      "updatedAt",
      "updatedBy",
      "updatedByMail",
      "updatedByStructure",
    ];
    const hasGlobalDataChanges = Object.keys(globalUpdate).some(
      (key) => !globalMetadataFields.includes(key),
    );

    if (hasGlobalDataChanges) {
      transaction.update(anagraficaRef, globalUpdate);
    }

    const structureMetadataFields = ["updatedAt", "updatedBy"];
    const hasStructureDataChanges = Object.keys(structureUpdate).some(
      (key) => !structureMetadataFields.includes(key),
    );

    if (structureDataRef && hasStructureDataChanges) {
      const nextStructureData = buildStructureDataPayload(
        anagraficaId,
        structureId,
        structureDataDoc?.data || {},
        structureUpdate,
        userUid,
      );

      transaction.set(structureDataRef, nextStructureData);

      if (structureDataDoc) {
        legacyStructureDocs
          .filter((doc) => doc.ref.path !== structureDataRef.path)
          .forEach((doc) => {
            transaction.set(
              doc.ref,
              {
                supersededBy: structureDataRef.id,
                supersededAt: new Date(),
              },
              { merge: true },
            );
          });
      }
    }

    return {
      allowedStructures,
      changedGroups: allChangedGroups,
      changes: allChanges,
      structureDataRefPath: structureDataRef ? structureDataRef.path : null,
      isNewStructureData,
    };
  });

  if (structureId && result.structureDataRefPath) {
    await markLegacyStructureDataDocsSuperseded(
      anagraficaId,
      structureId,
      result.structureDataRefPath.split("/").pop(),
    );
  }

  const globalGroupNames = ["anagrafica", "internalNotes", "privacy"];
  const globalGroups = result.changedGroups.filter((g) =>
    globalGroupNames.includes(g),
  );

  if (globalGroups.length > 0) {
    const globalChanges = {};
    let hasActualChanges = false;

    globalGroups.forEach((group) => {
      const change = result.changes[group];
      if (change) {
        const beforeJson = JSON.stringify(change.before || {});
        const afterJson = JSON.stringify(change.after || {});
        if (beforeJson !== afterJson) {
          globalChanges[group] = change;
          hasActualChanges = true;
        }
      }
    });

    if (hasActualChanges) {
      await createHistoryEntry({
        anagraficaId,
        changeType: "update",
        changedGroups: Object.keys(globalChanges),
        changes: globalChanges,
        userUid,
        userMail,
        structureId,
      });
    }
  }

  const structureGroups = result.changedGroups.filter(
    (group) => !globalGroupNames.includes(group),
  );

  if (structureGroups.length > 0 && result.structureDataRefPath) {
    const structureDataId = result.structureDataRefPath.split("/").pop();
    const structureChanges = {};
    let hasStructureChanges = false;

    structureGroups.forEach((group) => {
      const change = result.changes[group];
      if (change) {
        const beforeJson = JSON.stringify(change.before || {});
        const afterJson = JSON.stringify(change.after || {});
        if (beforeJson !== afterJson) {
          structureChanges[group] = change;
          hasStructureChanges = true;
        }
      }
    });

    if (hasStructureChanges) {
      await createHistoryEntry({
        anagraficaId,
        changeType: result.isNewStructureData ? "create" : "update",
        changedGroups: Object.keys(structureChanges),
        changes: structureChanges,
        userUid,
        userMail,
        structureId,
        structureDataId,
      });
    }
  }

  await logDataUpdate({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    structureId,
    changedFields: result.changedGroups,
  });

  invalidateAnagraficaCaches(anagraficaId, result.allowedStructures);

  return await getAnagraficaInternalShared(anagraficaId, userUid, structureId);
}

export async function updateAnagraficaShared(anagraficaId, body, structureId) {
  const { userUid, headers: hdr } = await requireUser();
  const userMail = hdr.get("x-user-email");
  const result = await updateAnagraficaInternalShared(
    anagraficaId,
    body,
    userUid,
    userMail,
    structureId,
  );
  return JSON.stringify(result);
}
