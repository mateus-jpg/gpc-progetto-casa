"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, REVALIDATE } from "@/lib/cache";
import { logDataAccess } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import {
  fetchAnagraficaFromDb,
  fetchSharedStructureDataForTarget,
  fetchStructureDataFromDb,
} from "./anagrafica-core";

/**
 * Internal function to get anagrafica with caching
 * Can be called from both server actions and API routes
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} userUid - The user UID for permission check
 * @param {string} [structureId] - Optional structure ID for context
 * @returns {Object} The anagrafica data
 * @throws {Error} If not found or access denied
 */
export async function getAnagraficaInternalShared(
  anagraficaId,
  userUid,
  structureId = null,
) {
  const getCachedAnagrafica = unstable_cache(
    async () => fetchAnagraficaFromDb(anagraficaId),
    ["anagrafica", anagraficaId],
    {
      tags: [CACHE_TAGS.anagrafica(anagraficaId)],
      revalidate: REVALIDATE.anagraficaDetail,
    },
  );

  const anagraficaData = await getCachedAnagrafica();

  if (!anagraficaData) {
    const error = new Error("Anagrafica not found");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (anagraficaData.deletedAt) {
    const error = new Error("Anagrafica not found");
    error.code = "NOT_FOUND";
    throw error;
  }

  const globalData = anagraficaData;
  const allowedStructures = globalData.canBeAccessedBy || [];

  await verifyUserPermissions({
    userUid,
    allowedStructures,
  });

  if (structureId) {
    await verifyUserPermissions({ userUid, structureId });

    if (!allowedStructures.includes(structureId)) {
      const error = new Error(
        "Forbidden: structure does not have access to this anagrafica",
      );
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  let structureData = {};
  let otherStructuresData = [];
  if (structureId) {
    const getCachedStructureData = unstable_cache(
      async () => fetchStructureDataFromDb(anagraficaId, structureId),
      ["anagrafica_structure_data", anagraficaId, structureId],
      {
        tags: [CACHE_TAGS.anagraficaData(anagraficaId)],
        revalidate: REVALIDATE.anagraficaDetail,
      },
    );

    structureData = (await getCachedStructureData()) || {};
    otherStructuresData = await fetchSharedStructureDataForTarget(
      anagraficaId,
      structureId,
      globalData,
    );
  }

  const {
    id: _sdId,
    anagraficaId: _sdAid,
    structureId: _sdSid,
    updatedAt: _sdUpd,
    updatedBy: _sdUpBy,
    createdAt: _sdCr,
    status: _sdSt,
    ...structureGroups
  } = structureData;

  const result = {
    ...globalData,
    ...structureGroups,
    id: globalData.id,
    globalId: globalData.id,
    structureDataId: structureData.id,
    otherStructuresData,
  };

  await logDataAccess({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
  });

  return result;
}

/**
 * Recupera l'anagrafica con caching (Server Action)
 * Permission check runs fresh on every call (not cached)
 */
export async function getAnagraficaShared(anagraficaId, structureId = null) {
  const { userUid } = await requireUser();
  const anagraficaData = await getAnagraficaInternalShared(
    anagraficaId,
    userUid,
    structureId,
  );
  return JSON.stringify(anagraficaData);
}
