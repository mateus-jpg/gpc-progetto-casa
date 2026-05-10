"use server";

import admin from "@/lib/firebase/firebaseAdmin";
import { requireUser, verifySuperAdmin } from "@/utils/server-auth";

const adminDb = admin.firestore();

// Personal fields that should be nested under 'anagrafica' key
const PERSONAL_FIELDS = [
  "nome",
  "cognome",
  "sesso",
  "dataDiNascita",
  "luogoDiNascita",
  "codiceFiscale",
  "cittadinanza",
  "comuneDiDomicilio",
  "telefono",
  "email",
];

// Structure-specific fields that should live in anagrafica_data, not in anagrafica
const STRUCTURE_FIELDS = [
  "nucleoFamiliare",
  "legaleAbitativa",
  "lavoroFormazione",
  "vulnerabilita",
  "referral",
  "notes",
];

/**
 * Migration Server Action: Split Anagrafica Data
 *
 * 1. Nests flat personal fields (nome, cognome, etc.) under an 'anagrafica' key
 * 2. Moves structure-specific groups (nucleoFamiliare, legaleAbitativa, etc.)
 *    from the 'anagrafica' collection into per-structure 'anagrafica_data' documents
 * 3. Removes old flat fields from the original anagrafica doc
 *
 * @param {number} limit - Max documents to process (default 100)
 * @param {boolean} dryRun - If true, only preview changes (default true)
 */
export async function migrateAnagraficaStructure(limit = 100, dryRun = true) {
  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    console.log(`[MIGRATION] Starting. DryRun: ${dryRun}, Limit: ${limit}`);

    const snapshot = await adminDb.collection("anagrafica").limit(limit).get();

    if (snapshot.empty) {
      return {
        success: true,
        message: "No documents found to migrate.",
        stats: { total: 0 },
      };
    }

    const stats = {
      total: snapshot.size,
      needsMigration: 0,
      alreadyMigrated: 0,
      personalFieldsNested: 0,
      dataDocsCreated: 0,
      dataDocsSkipped: 0,
      anagraficaCleaned: 0,
      errors: 0,
    };

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const anagraficaId = doc.id;

        // Detect flat personal fields at root (needs nesting under 'anagrafica' key)
        const flatPersonalFields = PERSONAL_FIELDS.filter(
          (f) => data[f] !== undefined,
        );
        // Detect structure fields at root (needs moving to anagrafica_data)
        const structureFieldsPresent = STRUCTURE_FIELDS.filter(
          (f) => data[f] !== undefined,
        );

        if (
          flatPersonalFields.length === 0 &&
          structureFieldsPresent.length === 0
        ) {
          stats.alreadyMigrated++;
          continue;
        }

        stats.needsMigration++;
        const structures = data.canBeAccessedBy || data.structureIds || [];

        // --- Step A: Nest personal fields under 'anagrafica' key ---
        if (flatPersonalFields.length > 0) {
          const anagraficaNested = data.anagrafica || {};
          for (const field of flatPersonalFields) {
            anagraficaNested[field] = data[field];
          }

          if (!dryRun) {
            const updatePayload = { anagrafica: anagraficaNested };
            for (const field of flatPersonalFields) {
              updatePayload[field] = admin.firestore.FieldValue.delete();
            }
            await doc.ref.update(updatePayload);
          }
          stats.personalFieldsNested++;
        }

        // --- Step B: Move structure fields to anagrafica_data ---
        if (structureFieldsPresent.length > 0) {
          const structurePayload = {};
          for (const field of structureFieldsPresent) {
            structurePayload[field] = data[field];
          }

          for (const structureId of structures) {
            const existing = await adminDb
              .collection("anagrafica_data")
              .where("anagraficaId", "==", anagraficaId)
              .where("structureId", "==", structureId)
              .limit(1)
              .get();

            if (!existing.empty) {
              stats.dataDocsSkipped++;
              continue;
            }

            if (!dryRun) {
              await adminDb.collection("anagrafica_data").add({
                anagraficaId,
                structureId,
                ...structurePayload,
                status: "Active",
                updatedAt: data.updatedAt || new Date(),
                updatedBy: data.registeredBy || userUid,
                migratedAt: new Date(),
                migratedBy: userUid,
                createdAt: data.createdAt || new Date(),
              });
            }
            stats.dataDocsCreated++;
          }

          // Remove structure fields from anagrafica doc
          if (!dryRun) {
            const fieldsToDelete = {};
            for (const field of structureFieldsPresent) {
              fieldsToDelete[field] = admin.firestore.FieldValue.delete();
            }
            await doc.ref.update(fieldsToDelete);
            stats.anagraficaCleaned++;
          }
        }
      } catch (err) {
        console.error(`[MIGRATION] Error migrating doc ${doc.id}:`, err);
        stats.errors++;
      }
    }

    return {
      success: true,
      stats,
      message:
        `Migration ${dryRun ? "(dry run) " : ""}completed. ` +
        `Inspected: ${stats.total}, Needed migration: ${stats.needsMigration}, ` +
        `Personal nested: ${stats.personalFieldsNested}, ` +
        `Data docs created: ${stats.dataDocsCreated}, Cleaned: ${stats.anagraficaCleaned}`,
    };
  } catch (error) {
    console.error("[MIGRATION] Fatal error:", error);
    return { success: false, error: error.message };
  }
}
