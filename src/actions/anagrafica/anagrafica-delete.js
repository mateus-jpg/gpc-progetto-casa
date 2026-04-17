"use server";

import { invalidateAnagraficaCaches } from "@/lib/cache";
import { logDataDelete } from "@/utils/audit";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import { adminDb } from "./anagrafica-core";

/**
 * Internal function to soft delete anagrafica
 * Can be called from both server actions and API routes
 * Uses Firestore transaction to prevent race conditions
 */
export async function deleteAnagraficaInternalShared(anagraficaId, userUid) {
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);

  const allowedStructures = await adminDb.runTransaction(
    async (transaction) => {
      const anagraficaSnap = await transaction.get(anagraficaRef);

      if (!anagraficaSnap.exists) {
        const error = new Error("Anagrafica not found");
        error.code = "NOT_FOUND";
        throw error;
      }

      const anagraficaData = anagraficaSnap.data();

      if (anagraficaData.deletedAt) {
        const error = new Error("Anagrafica already deleted");
        error.code = "ALREADY_DELETED";
        throw error;
      }

      const structures = anagraficaData.canBeAccessedBy || [];

      await verifyUserPermissions({
        userUid,
        allowedStructures: structures,
      });

      transaction.update(anagraficaRef, {
        deletedAt: new Date(),
        deletedBy: userUid,
        deleted: true,
      });

      return structures;
    },
  );

  invalidateAnagraficaCaches(anagraficaId, allowedStructures);

  await logDataDelete({
    actorUid: userUid,
    resourceType: "anagrafica",
    resourceId: anagraficaId,
    softDelete: true,
  });

  return { success: true, message: "Scheda eliminata con successo" };
}

export async function deleteAnagraficaShared(anagraficaId) {
  const { userUid } = await requireUser();
  return await deleteAnagraficaInternalShared(anagraficaId, userUid);
}
