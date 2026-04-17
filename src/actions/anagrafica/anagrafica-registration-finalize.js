"use server";

import { invalidateAnagraficaCaches } from "@/lib/cache";
import { logDataUpdate } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import {
  adminDb,
  buildPrivacyPayload,
  buildRegistrationState,
  getComparablePrivacyFields,
  REGISTRATION_STATUS,
} from "./anagrafica-core";
import { createHistoryEntry } from "./history";

async function finalizeRegistrationDraftInternal({
  anagraficaId,
  structureId,
  signedFileId = null,
  signedFileName = null,
  signedAt = null,
  reference = "",
  notes = "",
  userUid,
  userMail,
}) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  let historyChanges = null;
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

    const previousPrivacy = anagraficaData.privacy || {};
    let resolvedFileId = signedFileId || previousPrivacy.paperNoticeFileId || null;
    let resolvedFileName =
      signedFileName || previousPrivacy.paperNoticeFileName || "";

    if (resolvedFileId) {
      const fileSnap = await transaction.get(
        adminDb.collection("files").doc(resolvedFileId),
      );

      if (!fileSnap.exists || fileSnap.data()?.deleted) {
        throw new Error("Documento firmato non trovato");
      }

      const fileData = fileSnap.data();
      if (fileData.anagraficaId !== anagraficaId) {
        throw new Error("Il documento firmato non appartiene a questa scheda");
      }

      resolvedFileName = fileData.nome || fileData.nomeOriginale || resolvedFileName;
    }

    if (!resolvedFileId) {
      throw new Error("Carica prima il documento firmato");
    }

    const nextPrivacy = buildPrivacyPayload(
      {
        paperNoticeCollected: true,
        paperNoticeSignedAt:
          signedAt || previousPrivacy.paperNoticeSignedAt || new Date(),
        paperNoticeReference:
          typeof reference === "string" && reference.trim()
            ? reference
            : previousPrivacy.paperNoticeReference || resolvedFileName,
        paperNoticeNotes:
          typeof notes === "string"
            ? notes
            : previousPrivacy.paperNoticeNotes || "",
        paperNoticeFileId: resolvedFileId,
        paperNoticeFileName: resolvedFileName,
        paperNoticeUploadedAt: signedFileId
          ? new Date()
          : previousPrivacy.paperNoticeUploadedAt || new Date(),
      },
      userUid,
      userMail,
      previousPrivacy,
    );

    const registrationUpdate = buildRegistrationState(
      REGISTRATION_STATUS.ACTIVE,
      userUid,
      userMail,
      anagraficaData,
    );

    transaction.update(anagraficaRef, {
      privacy: nextPrivacy,
      ...registrationUpdate,
      updatedAt: new Date(),
      updatedBy: userUid,
      updatedByMail: userMail || null,
      updatedByStructure: structureId,
    });

    historyChanges = {
      before: getComparablePrivacyFields(previousPrivacy),
      after: getComparablePrivacyFields(nextPrivacy),
    };
  });

  invalidateAnagraficaCaches(
    anagraficaId,
    allowedStructures.length > 0 ? allowedStructures : [structureId],
  );

  if (
    historyChanges &&
    JSON.stringify(historyChanges.before) !== JSON.stringify(historyChanges.after)
  ) {
    await createHistoryEntry({
      anagraficaId,
      changeType: "update",
      changedGroups: ["privacy"],
      changes: {
        privacy: historyChanges,
      },
      userUid,
      userMail,
      structureId,
    });
  }

  await logDataUpdate({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    structureId,
    changedFields: ["privacy", "registrationStatus"],
    details: {
      finalizedRegistration: true,
      signedFileId: signedFileId || null,
    },
  });
}

export async function finalizeRegistrationDraftShared({
  anagraficaId,
  structureId,
  signedFileId = null,
  signedFileName = null,
  signedAt = null,
  reference = "",
  notes = "",
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
      signedFileId,
      signedFileName,
      signedAt,
      reference,
      notes,
      userUid,
      userMail,
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
