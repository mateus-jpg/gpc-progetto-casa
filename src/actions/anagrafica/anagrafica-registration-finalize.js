"use server";

import { invalidateAnagraficaCaches } from "@/lib/cache";
import { logDataUpdate } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import {
  adminDb,
  buildRegistrationState,
  REGISTRATION_STATUS,
} from "./anagrafica-core";

async function finalizeRegistrationDraftInternal({
  anagraficaId,
  structureId,
  userMail,
  userUid,
}) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  let allowedStructures = [];

  await adminDb.runTransaction(async (transaction) => {
    const anagraficaSnap = await transaction.get(anagraficaRef);

    if (!anagraficaSnap.exists) {
      throw new Error("Anagrafica non trovata");
    }

    const anagraficaData = anagraficaSnap.data();
    if (anagraficaData.deletedAt) {
      throw new Error("Anagrafica non trovata");
    }

    allowedStructures = anagraficaData.canBeAccessedBy || [];

    await verifyUserPermissions({
      userUid,
      allowedStructures,
    });

    if (!allowedStructures.includes(structureId)) {
      throw new Error("Forbidden: structureId not allowed for this anagrafica");
    }

    transaction.update(anagraficaRef, {
      ...buildRegistrationState(
        REGISTRATION_STATUS.ACTIVE,
        userUid,
        userMail,
        anagraficaData,
      ),
      updatedAt: new Date(),
      updatedBy: userUid,
      updatedByMail: userMail || null,
      updatedByStructure: structureId,
    });
  });

  invalidateAnagraficaCaches(
    anagraficaId,
    allowedStructures.length > 0 ? allowedStructures : [structureId],
  );

  await logDataUpdate({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    structureId,
    changedFields: ["registrationStatus"],
    details: {
      finalizedRegistration: true,
      manualCompletionRequired: false,
    },
  });
}

export async function finalizeRegistrationDraftShared({
  anagraficaId,
  structureId,
}) {
  try {
    if (!anagraficaId) {
      throw new Error("Scheda anagrafica mancante");
    }
    if (!structureId) {
      throw new Error("Struttura mancante");
    }

    const { userUid, headers: hdr } = await requireUser();
    const userMail = hdr?.get?.("x-user-email") || null;

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    await finalizeRegistrationDraftInternal({
      anagraficaId,
      structureId,
      userMail,
      userUid,
    });

    return JSON.stringify({
      success: true,
      id: anagraficaId,
      registrationStatus: REGISTRATION_STATUS.ACTIVE,
    });
  } catch (error) {
    console.error("[FINALIZE_REGISTRATION_DRAFT_ERROR]:", error);
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
