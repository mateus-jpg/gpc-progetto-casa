"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import admin from "@/lib/firebase/firebaseAdmin";
import { logDataCreate } from "@/utils/audit";
import {
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMIT,
  validateFileSignature,
} from "@/utils/fileValidation";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/**
 * Create a standalone reminder (not linked to an access record).
 *
 * @param {Object} payload
 * @param {string} payload.anagraficaId
 * @param {string} payload.structureId
 * @param {string} payload.serviceType  - tipoAccesso label (e.g. "Legale")
 * @param {string} payload.date         - ISO string, the reminder datetime
 * @param {string|null} payload.dataScadenza - ISO string, optional expiry
 * @param {string|null} payload.enteRiferimento
 * @param {string|null} payload.note
 * @param {Object|null} payload.file    - { name, creationDate, expirationDate, base64, type, size }
 */
export async function createReminderAction(payload) {
  const { userUid } = await requireUser();

  const {
    anagraficaId,
    structureId,
    serviceType,
    date,
    dataScadenza = null,
    enteRiferimento = null,
    note = null,
    file = null,
  } = payload;

  if (!anagraficaId || !structureId || !serviceType || !date) {
    throw new Error("Missing required fields");
  }

  // Permission check via parent anagrafica
  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error("Anagrafica not found");

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures =
    anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  if (!allowedStructures.includes(structureId)) {
    throw new Error("Forbidden: structureId not allowed for this anagrafica");
  }

  // Handle optional file upload
  let uploadedFile = null;
  if (file?.base64) {
    const matches = file.base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let mimeType = file.type;
    let buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(file.base64, "base64");
    }

    if (buffer.length > FILE_SIZE_LIMIT) {
      throw new Error(
        `File exceeds size limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`,
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }
    if (!validateFileSignature(buffer, mimeType)) {
      throw new Error(`File content does not match claimed type ${mimeType}`);
    }

    const fileExt =
      path
        .extname(file.name)
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "") || "";
    const storagePath = `files/${anagraficaId}/reminders/${randomUUID()}${fileExt}`;

    const fileRef = adminStorage.bucket().file(storagePath);
    await fileRef.save(buffer, { contentType: mimeType, resumable: false });

    uploadedFile = {
      nome: file.name,
      nomeOriginale: file.name,
      tipo: mimeType,
      dimensione: file.size,
      path: storagePath,
      dataCreazione: file.creationDate
        ? new Date(file.creationDate).toISOString()
        : new Date().toISOString(),
      dataScadenza: file.expirationDate
        ? new Date(file.expirationDate).toISOString()
        : null,
    };
  }

  const reminderRef = adminDb.collection("reminders").doc();
  const reminderData = {
    anagraficaId,
    structureId,
    accessId: null,
    serviceType,
    date,
    dataScadenza: dataScadenza || null,
    note: note || null,
    enteRiferimento: enteRiferimento || null,
    file: uploadedFile,
    createdBy: userUid,
    createdAt: new Date().toISOString(),
    status: "pending",
    linkedToAccess: false,
  };

  await reminderRef.set(reminderData);

  await logDataCreate({
    actorUid: userUid,
    resourceType: "reminders",
    resourceId: reminderRef.id,
    structureId,
    details: { anagraficaId, serviceType, linkedToAccess: false },
  });

  return { success: true, reminderId: reminderRef.id };
}

/**
 * Fetch all reminders for an anagrafica record (both standalone and access-linked).
 *
 * @param {string} anagraficaId
 * @returns {Promise<string>} JSON-serialized { success, reminders }
 */
export async function getAnagraficaRemindersAction(anagraficaId) {
  const { userUid } = await requireUser();

  if (!anagraficaId) throw new Error("Missing anagraficaId");

  const anagraficaRef = adminDb.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error("Anagrafica not found");

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures =
    anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  const snapshot = await adminDb
    .collection("reminders")
    .where("anagraficaId", "==", anagraficaId)
    .orderBy("date", "asc")
    .get();

  const reminders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return JSON.stringify({ success: true, reminders });
}
