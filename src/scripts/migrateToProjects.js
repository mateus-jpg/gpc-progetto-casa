/**
 * Migration Script: Add Project Hierarchy
 *
 * This script migrates the existing data structure to support the new Project hierarchy:
 * 1. Creates a "Default Project"
 * 2. Updates all existing structures with projectId = defaultProjectId
 * 3. Updates all existing operators with projectIds = [defaultProjectId] (if they have structures)
 *
 * Run this script once after deploying the new code.
 *
 * Usage:
 *   node -r dotenv/config src/scripts/migrateToProjects.js
 *
 * Or via npm:
 *   npm run migrate:projects
 */

import admin from "../lib/firebase/firebaseAdmin.js";

const db = admin.firestore();

const DEFAULT_PROJECT_NAME = "Default Project";
const DEFAULT_PROJECT_DESCRIPTION =
  "Automatically created during migration. Contains all pre-existing structures.";

async function migrateToProjects() {
  console.log("Starting migration to Project hierarchy...\n");

  try {
    // Step 1: Check if migration has already been done
    const existingProjectsSnap = await db.collection("projects").limit(1).get();
    if (!existingProjectsSnap.empty) {
      console.log(
        "Migration appears to have already been run (projects collection is not empty).",
      );
      console.log(
        "If you want to re-run, please manually delete the projects collection first.",
      );
      return;
    }

    // Step 2: Create Default Project
    console.log("Step 1: Creating Default Project...");

    const defaultProjectData = {
      name: DEFAULT_PROJECT_NAME,
      description: DEFAULT_PROJECT_DESCRIPTION,
      admins: [], // Super admins will manage this
      createdAt: new Date(),
      createdBy: "system-migration",
      updatedAt: new Date(),
      updatedBy: "system-migration",
    };

    const projectRef = await db.collection("projects").add(defaultProjectData);
    const defaultProjectId = projectRef.id;

    console.log(`Created Default Project with ID: ${defaultProjectId}\n`);

    // Step 3: Update all structures with projectId
    console.log("Step 2: Updating structures with projectId...");

    const structuresSnap = await db.collection("structures").get();
    const structureIds = [];

    if (structuresSnap.empty) {
      console.log("No structures found to migrate.\n");
    } else {
      const structureBatch = db.batch();

      structuresSnap.docs.forEach((doc) => {
        const data = doc.data();
        // Only update if projectId is not already set
        if (!data.projectId) {
          structureBatch.update(doc.ref, {
            projectId: defaultProjectId,
            updatedAt: new Date(),
            updatedBy: "system-migration",
          });
          structureIds.push(doc.id);
        }
      });

      if (structureIds.length > 0) {
        await structureBatch.commit();
        console.log(
          `Updated ${structureIds.length} structures with projectId.\n`,
        );
      } else {
        console.log("All structures already have projectId set.\n");
      }
    }

    // Step 4: Update all operators with projectIds
    console.log("Step 3: Updating operators with projectIds...");

    const operatorsSnap = await db.collection("operators").get();
    let operatorsUpdated = 0;

    if (operatorsSnap.empty) {
      console.log("No operators found to migrate.\n");
    } else {
      // Firestore batches have a limit of 500 operations
      const batchSize = 500;
      let batch = db.batch();
      let operationsInBatch = 0;

      for (const doc of operatorsSnap.docs) {
        const data = doc.data();
        const hasStructures = data.structureIds && data.structureIds.length > 0;
        const hasProjectIds = data.projectIds && data.projectIds.length > 0;

        // If user has structures but no projectIds, add them to default project
        if (hasStructures && !hasProjectIds) {
          batch.update(doc.ref, {
            projectIds: [defaultProjectId],
            updatedAt: new Date(),
            updatedBy: "system-migration",
          });
          operatorsUpdated++;
          operationsInBatch++;

          // Commit batch if we've reached the limit
          if (operationsInBatch >= batchSize) {
            await batch.commit();
            batch = db.batch();
            operationsInBatch = 0;
          }
        }
      }

      // Commit any remaining operations
      if (operationsInBatch > 0) {
        await batch.commit();
      }

      console.log(`Updated ${operatorsUpdated} operators with projectIds.\n`);
    }

    // Print summary
    console.log("=".repeat(50));
    console.log("Migration completed successfully!");
    console.log("=".repeat(50));
    console.log(`\nSummary:`);
    console.log(`  - Default Project ID: ${defaultProjectId}`);
    console.log(`  - Structures migrated: ${structureIds.length}`);
    console.log(`  - Operators updated: ${operatorsUpdated}`);
    console.log("\nNext steps:");
    console.log("  1. Verify the migration in Firebase Console");
    console.log("  2. Assign project admins as needed");
    console.log("  3. Create additional projects if required");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateToProjects()
  .then(() => {
    console.log("\nMigration script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
