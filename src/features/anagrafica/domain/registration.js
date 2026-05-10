export const DRAFT_REGISTRATION_STATUS = "draft_signature_pending";
export const ACTIVE_REGISTRATION_STATUS = "active";

export function buildRegistrationStructureData({
  structureId,
  structureGroups = {},
  notes = "",
  userUid,
}) {
  return {
    structureId,
    ...structureGroups,
    notes,
    updatedAt: new Date(),
    updatedBy: userUid,
    status: "Active",
  };
}

export function buildDraftRegistrationResponse({
  anagraficaId,
  existingRegistrationStatus = null,
}) {
  return {
    id: anagraficaId,
    registrationStatus:
      existingRegistrationStatus || ACTIVE_REGISTRATION_STATUS,
  };
}

export function buildDraftRegistrationAuditDetails({ linkedToExisting }) {
  return {
    linkedToExisting,
    registrationActivatedImmediately: true,
  };
}
