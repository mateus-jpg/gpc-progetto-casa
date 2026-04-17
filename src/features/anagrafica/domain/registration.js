export const DRAFT_REGISTRATION_STATUS = "draft_signature_pending";

export function buildDraftPrivacyInput(privacy = {}) {
  return {
    ...privacy,
    paperNoticeCollected: false,
    paperNoticeSignedAt: null,
    paperNoticeFileId: null,
    paperNoticeFileName: "",
    paperNoticeUploadedAt: null,
  };
}

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
      existingRegistrationStatus || DRAFT_REGISTRATION_STATUS,
  };
}

export function buildDraftRegistrationAuditDetails({ linkedToExisting }) {
  return {
    draft: true,
    linkedToExisting,
  };
}
