/**
 * Migration Script: Convert File Categories to Folder Structure
 *
 * This script migrates existing files to the new folder-based system:
 * 1. Creates 9 default folders for each anagrafica (based on FILE_CATEGORIES)
 * 2. Assigns all existing files to their corresponding category folders
 * 3. Maintains backward compatibility by keeping the category field
 *
 * Usage:
 *   node src/scripts/migrateFilesToFolders.js [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run        Run without making changes (test mode)
 *   --batch-size=N   Process N anagrafica at a time (default: 10)
 *   --limit=N        Limit to N anagrafica (for testing)
 */

import { FILE_CATEGORIES } from "../config/constants.js";
import admin from "../lib/firebase/firebaseAdmin.js";

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
const limitArg = args.find((arg) => arg.startsWith("--limit="));

const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : 10;
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1]) : null;

console.log("=".repeat(80));
console.log("FILE TO FOLDERS MIGRATION SCRIPT");
console.log("=".repeat(80));
console.log(
  `Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE MIGRATION"}`,
);
console.log(`Batch Size: ${BATCH_SIZE} anagrafica at a time`);
if (LIMIT) console.log(`Limit: ${LIMIT} anagrafica`);
console.log("=".repeat(80));
console.log("");

/**
 * Create default folders for an anagrafica
 */
async function createDefaultFolders(anagraficaId, structureIds) {
  const folders = [];
  const folderMap = {}; // category -> folderId

  if (dryRun) {
    console.log(`  [DRY RUN] Would create 9 default folders`);
    // Create mock folder IDs for dry run
    for (const [key, value] of Object.entries(FILE_CATEGORIES)) {
      const mockId = `folder_${anagraficaId}_${value}`;
      folderMap[value] = mockId;
      folders.push({ id: mockId, category: value });
    }
    return { folders, folderMap };
  }

  // Create actual folders
  const batch = db.batch();

  for (const [key, value] of Object.entries(FILE_CATEGORIES)) {
    const folderRef = db.collection("folders").doc();
    const folderName = key; // e.g., "IDENTITY"

    const folderData = {
      nome: folderName,

      // Hierarchy
      anagraficaId,
      parentFolderId: null,
      path: `/${folderName}`,
      depth: 0,

      // Metadata
      isDefaultCategory: true,
      category: value,

      // Access Control
      structureIds: structureIds || [],

      // Audit
      createdAt: new Date(),
      createdBy: "migration_script",
      createdByEmail: "migration@system",
      updatedAt: new Date(),

      // Soft Delete
      deleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    batch.set(folderRef, folderData);
    folders.push({ id: folderRef.id, category: value });
    folderMap[value] = folderRef.id;
  }

  await batch.commit();

  return { folders, folderMap };
}

/**
 * Migrate files for an anagrafica
 */
async function migrateAnagraficaFiles(anagraficaId, anagraficaData) {
  try {
    console.log(`\n📁 Processing anagrafica: ${anagraficaId}`);
    console.log(
      `   Name: ${anagraficaData.anagrafica?.nome || "N/A"} ${anagraficaData.anagrafica?.cognome || ""}`,
    );
    console.log(
      `   Structures: ${anagraficaData.canBeAccessedBy?.length || 0}`,
    );

    // 1. Check if folders already exist
    const existingFolders = await db
      .collection("folders")
      .where("anagraficaId", "==", anagraficaId)
      .where("isDefaultCategory", "==", true)
      .get();

    let folderMap = {};

    if (!existingFolders.empty) {
      console.log(
        `   ✓ Default folders already exist (${existingFolders.size}), using existing`,
      );
      existingFolders.forEach((doc) => {
        const data = doc.data();
        if (data.category) {
          folderMap[data.category] = doc.id;
        }
      });
    } else {
      // 2. Create default folders
      console.log(`   Creating 9 default folders...`);
      const result = await createDefaultFolders(
        anagraficaId,
        anagraficaData.canBeAccessedBy || [],
      );
      folderMap = result.folderMap;
      console.log(`   ✓ Created ${result.folders.length} folders`);
    }

    // 3. Get all files for this anagrafica
    const filesSnapshot = await db
      .collection("files")
      .where("anagraficaId", "==", anagraficaId)
      .where("deleted", "==", false)
      .get();

    if (filesSnapshot.empty) {
      console.log(`   ℹ No files to migrate`);
      return {
        anagraficaId,
        foldersCreated: !existingFolders.empty ? 0 : 9,
        filesProcessed: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: [],
      };
    }

    console.log(`   Found ${filesSnapshot.size} files to process`);

    // 4. Assign files to folders based on category
    let filesUpdated = 0;
    let filesSkipped = 0;
    const errors = [];

    // Process in batches of 500 (Firestore limit)
    const files = filesSnapshot.docs;
    const fileBatches = [];
    for (let i = 0; i < files.length; i += 500) {
      fileBatches.push(files.slice(i, i + 500));
    }

    for (const [batchIndex, fileBatch] of fileBatches.entries()) {
      if (dryRun) {
        console.log(
          `   [DRY RUN] Would update batch ${batchIndex + 1}/${fileBatches.length} (${fileBatch.length} files)`,
        );
        filesUpdated += fileBatch.length;
        continue;
      }

      const batch = db.batch();

      fileBatch.forEach((fileDoc) => {
        const fileData = fileDoc.data();

        // Skip if already has folderId
        if (fileData.folderId) {
          filesSkipped++;
          return;
        }

        // Get folder ID for this file's category
        const category = fileData.category || FILE_CATEGORIES.OTHER;
        const folderId = folderMap[category];

        if (!folderId) {
          errors.push({
            fileId: fileDoc.id,
            fileName: fileData.nome,
            error: `No folder found for category: ${category}`,
          });
          return;
        }

        // Update file with folderId
        batch.update(db.collection("files").doc(fileDoc.id), {
          folderId: folderId,
          updatedAt: new Date(),
        });

        filesUpdated++;
      });

      await batch.commit();
      console.log(`   ✓ Updated batch ${batchIndex + 1}/${fileBatches.length}`);
    }

    console.log(
      `   ✅ Completed: ${filesUpdated} updated, ${filesSkipped} skipped`,
    );
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} errors`);
    }

    return {
      anagraficaId,
      foldersCreated: !existingFolders.empty ? 0 : 9,
      filesProcessed: filesSnapshot.size,
      filesUpdated,
      filesSkipped,
      errors,
    };
  } catch (error) {
    console.error(
      `   ❌ Error processing anagrafica ${anagraficaId}:`,
      error.message,
    );
    return {
      anagraficaId,
      foldersCreated: 0,
      filesProcessed: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      errors: [{ error: error.message }],
    };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  const startTime = Date.now();
  const results = {
    totalAnagrafica: 0,
    processedAnagrafica: 0,
    totalFoldersCreated: 0,
    totalFilesUpdated: 0,
    totalFilesSkipped: 0,
    totalErrors: 0,
    anagraficaResults: [],
  };

  try {
    // Get all anagrafica records
    let query = db.collection("anagrafica").where("deletedAt", "==", null);

    if (LIMIT) {
      query = query.limit(LIMIT);
    }

    const anagraficaSnapshot = await query.get();
    results.totalAnagrafica = anagraficaSnapshot.size;

    console.log(
      `Found ${results.totalAnagrafica} anagrafica records to process\n`,
    );

    // Process in batches
    const anagrafica = anagraficaSnapshot.docs;
    const batches = [];
    for (let i = 0; i < anagrafica.length; i += BATCH_SIZE) {
      batches.push(anagrafica.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing in ${batches.length} batches of ${BATCH_SIZE}\n`);

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`BATCH ${batchIndex + 1}/${batches.length}`);
      console.log(`${"=".repeat(80)}`);

      for (const doc of batch) {
        const result = await migrateAnagraficaFiles(doc.id, doc.data());
        results.anagraficaResults.push(result);
        results.processedAnagrafica++;
        results.totalFoldersCreated += result.foldersCreated;
        results.totalFilesUpdated += result.filesUpdated;
        results.totalFilesSkipped += result.filesSkipped;
        results.totalErrors += result.errors.length;
      }

      // Progress update
      const progress = (
        (results.processedAnagrafica / results.totalAnagrafica) *
        100
      ).toFixed(1);
      console.log(
        `\n📊 Progress: ${results.processedAnagrafica}/${results.totalAnagrafica} (${progress}%)`,
      );
    }
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    results.fatalError = error.message;
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n");
  console.log("=".repeat(80));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE MIGRATION"}`);
  console.log(`Duration: ${duration}s`);
  console.log("");
  console.log(`Anagrafica Records:`);
  console.log(`  Total:     ${results.totalAnagrafica}`);
  console.log(`  Processed: ${results.processedAnagrafica}`);
  console.log("");
  console.log(`Folders:`);
  console.log(`  Created:   ${results.totalFoldersCreated}`);
  console.log("");
  console.log(`Files:`);
  console.log(`  Updated:   ${results.totalFilesUpdated}`);
  console.log(
    `  Skipped:   ${results.totalFilesSkipped} (already had folderId)`,
  );
  console.log("");
  console.log(`Errors:      ${results.totalErrors}`);

  if (results.totalErrors > 0) {
    console.log("\n⚠️  ERRORS ENCOUNTERED:");
    results.anagraficaResults
      .filter((r) => r.errors.length > 0)
      .forEach((r) => {
        console.log(`\n  Anagrafica: ${r.anagraficaId}`);
        r.errors.forEach((e) => {
          console.log(`    - ${e.error || e.message || JSON.stringify(e)}`);
        });
      });
  }

  console.log("=".repeat(80));

  if (dryRun) {
    console.log("\n⚠️  DRY RUN MODE - No changes were made");
    console.log("Run without --dry-run to perform the actual migration\n");
  } else {
    console.log("\n✅ Migration completed successfully!\n");
  }

  // Exit
  process.exit(results.totalErrors > 0 ? 1 : 0);
}

// Run migration
runMigration().catch((error) => {
  console.error("\n❌ UNHANDLED ERROR:", error);
  process.exit(1);
});
