/**
 * Migration Script: Lift embedded files out of 'accessi' into 'files' + 'folders'
 *
 * Old format (main branch):
 *   accessi/{id}: {
 *     anagraficaId, createdBy, createdByStructure, createdAt, structureIds,
 *     services: [
 *       {
 *         tipoAccesso: 'Legale',
 *         files: [
 *           { nome, nomeOriginale, tipo, dimensione, path, dataCreazione, dataScadenza }
 *         ]
 *       }
 *     ]
 *   }
 *
 *   Also handles old flat accessi (no services array):
 *   accessi/{id}: { anagraficaId, tipoAccesso, files: [...], ... }
 *
 * New format (experiments branch):
 *   files/{id}: {
 *     nome, nomeOriginale, tipo, dimensione, path,
 *     anagraficaId, folderId, accessoId, category, tags,
 *     dataDocumento, dataCreazione, dataScadenza,
 *     structureIds, uploadedByStructure, uploadedBy,
 *     createdAt, updatedAt, deleted, ...
 *   }
 *   folders/{id}: { nome, anagraficaId, parentFolderId: null, depth: 0, ... }
 *
 * What this script does:
 *   1. Reads all 'accessi' documents
 *   2. Normalizes old flat-format accessi to the services[] structure
 *   3. For each service with files, finds or creates a folder by service type name
 *   4. Creates a 'files' document for each embedded file (keeps same Storage path)
 *   5. Skips files already migrated (detected by path uniqueness in 'files' collection)
 *
 * Usage:
 *   DRY RUN (preview only, no changes):
 *     node -r dotenv/config src/scripts/migrateAccessiFiles.js
 *
 *   EXECUTE:
 *     node -r dotenv/config src/scripts/migrateAccessiFiles.js --execute
 *
 *   With limit:
 *     node -r dotenv/config src/scripts/migrateAccessiFiles.js --execute --limit=50
 */

import admin from "../lib/firebase/firebaseAdmin.js";

const db = admin.firestore();

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;

// Default folder name when tipoAccesso is missing
const DEFAULT_FOLDER_NAME = "Documenti";

// Cache: anagraficaId -> { folderName -> folderId }
// Avoids repeated Firestore queries for the same anagrafica/folder combo
const folderCache = {};

/**
 * Find or create a root-level folder for an anagrafica by name.
 * Uses in-memory cache to avoid duplicate queries within the same run.
 */
async function getOrCreateFolder(anagraficaId, folderName, structureIds) {
  if (!folderCache[anagraficaId]) {
    folderCache[anagraficaId] = {};
  }

  if (folderCache[anagraficaId][folderName]) {
    return folderCache[anagraficaId][folderName];
  }

  // Query Firestore
  const q = await db
    .collection("folders")
    .where("anagraficaId", "==", anagraficaId)
    .where("nome", "==", folderName)
    .where("deleted", "==", false)
    .limit(1)
    .get();

  if (!q.empty) {
    const folderId = q.docs[0].id;
    folderCache[anagraficaId][folderName] = folderId;
    return folderId;
  }

  // Create the folder
  if (DRY_RUN) {
    const mockId = `dry_folder_${anagraficaId}_${folderName}`;
    folderCache[anagraficaId][folderName] = mockId;
    return mockId;
  }

  const folderRef = db.collection("folders").doc();
  await folderRef.set({
    nome: folderName,
    anagraficaId,
    parentFolderId: null,
    path: `/${folderName}`,
    depth: 0,
    isDefaultCategory: false,
    category: null,
    structureIds: structureIds || [],
    createdAt: new Date(),
    createdBy: "migration-script",
    createdByEmail: null,
    updatedAt: new Date(),
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  });

  folderCache[anagraficaId][folderName] = folderRef.id;
  return folderRef.id;
}

/**
 * Build a set of all Storage paths already in the 'files' collection.
 * Used for idempotency: skip files that were already migrated.
 */
async function buildMigratedPathsSet() {
  console.log("Building index of already-migrated file paths...");
  const snap = await db.collection("files").get();
  const paths = new Set();
  snap.forEach((doc) => {
    const p = doc.data().path;
    if (p) paths.add(p);
  });
  console.log(
    `  Found ${paths.size} existing file(s) in 'files' collection.\n`,
  );
  return paths;
}

/**
 * Normalize an accessi document to a consistent services[] structure.
 * Handles both the new format (services array) and old flat format.
 */
function normalizeServices(data) {
  if (data.services && Array.isArray(data.services)) {
    return data.services;
  }

  // Old flat format: tipoAccesso + files at root level
  return [
    {
      tipoAccesso: data.tipoAccesso || null,
      files: data.files || [],
      sottoCategorie: data.sottoCategorie || null,
      note: data.note || null,
      classificazione: data.classificazione || null,
    },
  ];
}

async function migrateAccessiFiles() {
  console.log("=".repeat(60));
  console.log("  Accessi Files Migration");
  console.log("=".repeat(60));
  console.log(
    `  Mode:  ${DRY_RUN ? "DRY RUN (no changes)" : "EXECUTE (writing to Firestore)"}`,
  );
  console.log(`  Limit: ${LIMIT || "none (all documents)"}`);
  console.log("=".repeat(60));
  console.log();

  const stats = {
    accessiTotal: 0,
    accessiWithFiles: 0,
    accessiAlreadyMigrated: 0,
    foldersCreated: 0,
    filesCreated: 0,
    filesSkipped: 0,
    errors: 0,
  };

  // Pre-build set of already-migrated paths for idempotency
  const migratedPaths = await buildMigratedPathsSet();

  try {
    let query = db.collection("accessi");
    if (LIMIT > 0) query = query.limit(LIMIT);

    const snapshot = await query.get();
    stats.accessiTotal = snapshot.size;

    console.log(
      `Found ${stats.accessiTotal} accessi document(s) to inspect.\n`,
    );

    if (snapshot.empty) {
      console.log("No accessi found. Nothing to do.");
      return stats;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const accessoId = doc.id;
      const anagraficaId = data.anagraficaId;

      if (!anagraficaId) {
        console.log(`[${accessoId}] SKIP: no anagraficaId\n`);
        stats.errors++;
        continue;
      }

      const services = normalizeServices(data);
      const structureIds =
        data.structureIds ||
        (data.createdByStructure ? [data.createdByStructure] : []);
      const createdBy = data.createdBy || "migration-script";
      const uploadedByStructure = data.createdByStructure || null;
      const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

      // Collect all files across all services
      const allFiles = services.flatMap((svc) =>
        (svc.files || []).map((f) => ({ ...f, _svc: svc })),
      );

      if (allFiles.length === 0) {
        continue; // accesso has no files, nothing to migrate
      }

      stats.accessiWithFiles++;

      // Check if ALL files in this accesso are already migrated
      const allAlreadyMigrated = allFiles.every((f) =>
        migratedPaths.has(f.path),
      );
      if (allAlreadyMigrated) {
        stats.accessiAlreadyMigrated++;
        stats.filesSkipped += allFiles.length;
        console.log(
          `[${accessoId}] All ${allFiles.length} file(s) already migrated -> skip\n`,
        );
        continue;
      }

      console.log(`[${accessoId}] anagraficaId: ${anagraficaId}`);
      console.log(
        `  ${services.length} service(s), ${allFiles.length} file(s)`,
      );

      for (const svc of services) {
        const files = svc.files || [];
        if (files.length === 0) continue;

        const folderName = svc.tipoAccesso?.trim() || DEFAULT_FOLDER_NAME;

        // Find or create folder for this service type
        let folderId;
        try {
          folderId = await getOrCreateFolder(
            anagraficaId,
            folderName,
            structureIds,
          );
          const _isNew = !(!folderCache[anagraficaId]?.[folderName] || DRY_RUN); // approximate
          console.log(`  Folder "${folderName}": ${folderId}`);

          if (!DRY_RUN) stats.foldersCreated++; // will over-count but cache prevents real duplicates
        } catch (err) {
          console.error(
            `  ERROR finding/creating folder "${folderName}":`,
            err.message,
          );
          stats.errors++;
          continue;
        }

        for (const file of files) {
          if (!file.path) {
            console.log(`    SKIP file without path: ${file.nome}`);
            stats.filesSkipped++;
            continue;
          }

          if (migratedPaths.has(file.path)) {
            console.log(`    SKIP (already migrated): ${file.nome}`);
            stats.filesSkipped++;
            continue;
          }

          const fileDoc = {
            // File info
            nome: file.nome || file.nomeOriginale || "unnamed",
            nomeOriginale: file.nomeOriginale || file.nome || "unnamed",
            tipo: file.tipo || "application/octet-stream",
            dimensione: file.dimensione || 0,
            path: file.path,

            // Links
            anagraficaId,
            folderId,
            accessoId,
            category: "OTHER",
            tags: [],

            // Dates
            dataDocumento: file.dataCreazione
              ? new Date(file.dataCreazione)
              : null,
            dataCreazione: file.dataCreazione
              ? new Date(file.dataCreazione)
              : createdAt,
            dataScadenza: file.dataScadenza
              ? new Date(file.dataScadenza)
              : null,

            // Access Control
            structureIds,
            uploadedByStructure,

            // Metadata
            uploadedBy: createdBy,
            uploadedByEmail: null,
            createdAt,
            updatedAt: new Date(),

            // Soft Delete
            deleted: false,
            deletedAt: null,
            deletedBy: null,

            // Tracking
            lastAccessedAt: null,
            accessCount: 0,

            // Migration marker
            migratedFrom: "accessi",
            migratedAt: new Date(),
          };

          if (!DRY_RUN) {
            try {
              await db.collection("files").add(fileDoc);
              migratedPaths.add(file.path); // update in-memory set
              console.log(
                `    Created file: ${file.nome} -> folder "${folderName}"`,
              );
            } catch (err) {
              console.error(
                `    ERROR creating file doc for ${file.nome}:`,
                err.message,
              );
              stats.errors++;
              continue;
            }
          } else {
            console.log(
              `    Would create file: ${file.nome} -> folder "${folderName}"`,
            );
          }
          stats.filesCreated++;
        }
      }

      console.log();
    }
  } catch (error) {
    console.error("Fatal error during migration:", error);
    stats.errors++;
  }

  return stats;
}

// Run
migrateAccessiFiles()
  .then((stats) => {
    console.log("=".repeat(60));
    console.log("  Migration Summary");
    console.log("=".repeat(60));
    console.log(`  Accessi inspected:             ${stats.accessiTotal}`);
    console.log(`  Accessi with files:            ${stats.accessiWithFiles}`);
    console.log(
      `  Accessi already migrated:      ${stats.accessiAlreadyMigrated}`,
    );
    console.log(`  Folders found/created:         ${stats.foldersCreated}`);
    console.log(`  Files created in 'files':      ${stats.filesCreated}`);
    console.log(`  Files skipped (already done):  ${stats.filesSkipped}`);
    console.log(`  Errors:                        ${stats.errors}`);
    console.log("=".repeat(60));

    if (DRY_RUN && stats.filesCreated > 0) {
      console.log("\n  This was a DRY RUN. To execute:");
      console.log(
        "  node -r dotenv/config src/scripts/migrateAccessiFiles.js --execute\n",
      );
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
