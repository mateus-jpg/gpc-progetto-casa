import { invalidateAnagraficaCaches } from "@/lib/cache";
import { logDataCreate } from "@/utils/audit";
import { verifyUserPermissions } from "@/utils/server-auth";
import {
  buildPrivacyPayload,
  buildRegistrationState,
  normalizeRegistrationStatus,
  REGISTRATION_STATUS,
  sanitizeAnagraficaPayload,
} from "@/actions/anagrafica/anagrafica-core";
import {
  buildDraftPrivacyInput,
  buildDraftRegistrationAuditDetails,
  buildDraftRegistrationResponse,
  buildRegistrationStructureData,
} from "../domain/registration";
import {
  createOrLinkGlobalAnagrafica,
  getAllowedStructures,
  upsertStructureDataForRegistration,
} from "../infrastructure/registration-repository";
import { createRegistrationHistoryEntries } from "../infrastructure/registration-history-repository";

export async function createRegistrationDraftUseCase({
  body,
  actor: { userUid, userMail = null },
}) {
  const structureId = body.registeredByStructure;
  const {
    anagrafica: incomingAnagrafica,
    privacy: incomingPrivacy,
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
    privacy: buildPrivacyPayload(
      buildDraftPrivacyInput(incomingPrivacy),
      userUid,
      userMail,
    ),
    ...buildRegistrationState(
      REGISTRATION_STATUS.DRAFT_SIGNATURE_PENDING,
      userUid,
      userMail,
    ),
    registeredBy: userUid,
    registeredByMail: userMail,
    registeredByStructure: structureId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
  };

  const structureData = buildRegistrationStructureData({
    structureId,
    structureGroups: incomingStructureGroups,
    notes: body.notes || "",
    userUid,
  });

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
    console.error("Error creating draft structure data", error);
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

  invalidateAnagraficaCaches(anagraficaId, allStructures);

  await logDataCreate({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    structureId,
    details: buildDraftRegistrationAuditDetails({
      linkedToExisting: !!existingDoc,
    }),
  });

  return buildDraftRegistrationResponse({
    anagraficaId,
    existingRegistrationStatus: existingDoc
      ? normalizeRegistrationStatus(existingDoc.data().registrationStatus)
      : null,
  });
}
