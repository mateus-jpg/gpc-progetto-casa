"use server";

import {
  deleteAnagraficaInternalShared,
  deleteAnagraficaShared,
} from "./anagrafica-delete";
import {
  deleteAnagraficaAsAdmin as deleteAnagraficaAsAdminShared,
  getAvailableStructuresForSharing as getAvailableStructuresForSharingShared,
  removeStructureFromAnagrafica as removeStructureFromAnagraficaShared,
  shareAnagraficaWithStructures as shareAnagraficaWithStructuresShared,
} from "./anagrafica-sharing";
import {
  getAnagraficaInternalShared,
  getAnagraficaShared,
} from "./anagrafica-read";
import {
  createAnagraficaShared,
  createRegistrationDraftShared,
  finalizeRegistrationDraftShared,
} from "./anagrafica-registration";
import {
  updateAnagraficaInternalShared,
  updateAnagraficaShared,
} from "./anagrafica-update";

export async function getAnagraficaInternal(
  anagraficaId,
  userUid,
  structureId = null,
) {
  return await getAnagraficaInternalShared(anagraficaId, userUid, structureId);
}

export async function createAnagrafica(body, services = []) {
  return await createAnagraficaShared(body, services);
}

export async function createRegistrationDraft(body) {
  return await createRegistrationDraftShared(body);
}

export async function finalizeRegistrationDraft(payload) {
  return await finalizeRegistrationDraftShared(payload);
}

export async function getAnagrafica(anagraficaId, structureId = null) {
  return await getAnagraficaShared(anagraficaId, structureId);
}

export async function updateAnagraficaInternal(
  anagraficaId,
  body,
  userUid,
  userMail = null,
  structureId = null,
) {
  return await updateAnagraficaInternalShared(
    anagraficaId,
    body,
    userUid,
    userMail,
    structureId,
  );
}

export async function deleteAnagraficaInternal(anagraficaId, userUid) {
  return await deleteAnagraficaInternalShared(anagraficaId, userUid);
}

/**
 * Update anagrafica (Server Action)
 */
export async function updateAnagrafica(anagraficaId, body, structureId) {
  return await updateAnagraficaShared(anagraficaId, body, structureId);
}

/**
 * Soft delete dell'anagrafica (Server Action)
 */
export async function deleteAnagrafica(anagraficaId) {
  return await deleteAnagraficaShared(anagraficaId);
}

export async function deleteAnagraficaAsAdmin(anagraficaId, structureId) {
  return await deleteAnagraficaAsAdminShared(anagraficaId, structureId);
}

export async function removeStructureFromAnagrafica(anagraficaId, structureId) {
  return await removeStructureFromAnagraficaShared(anagraficaId, structureId);
}

export async function shareAnagraficaWithStructures(
  anagraficaId,
  currentStructureId,
  targetStructureIds,
  sharedFields = [],
) {
  return await shareAnagraficaWithStructuresShared(
    anagraficaId,
    currentStructureId,
    targetStructureIds,
    sharedFields,
  );
}

export async function getAvailableStructuresForSharing(
  anagraficaId,
  currentStructureId,
) {
  return await getAvailableStructuresForSharingShared(
    anagraficaId,
    currentStructureId,
  );
}
