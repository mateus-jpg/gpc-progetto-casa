"use server";

import { serializeFirestoreData } from "@/lib/utils";
import { collections, serializeFirestoreDoc } from "@/utils/database";
import { logger } from "@/utils/logger";
import { requireUser } from "@/utils/server-auth";

/**
 * Fetches the current user's data, including their operator profile,
 * and the structures and projects they have access to.
 *
 * This server action replaces client-side Firestore queries to ensure
 * data is fetched with administrative privileges (bypassing Client SDK rules)
 * while enforcing application-level permissions.
 *
 * @returns {Promise<{
 *   user: Object,
 *   structures: Array,
 *   projects: Array,
 *   success: boolean,
 *   error?: string
 * }>}
 */
export async function getAuthUserData() {
  try {
    // 1. Authenticate the user
    const { userUid } = await requireUser();

    // 2. Fetch the operator document
    const operatorDoc = await collections.operators().doc(userUid).get();

    // If not found in operators, check if it's a legacy user or just return basic auth info
    // For GPC, we expect operators. If not found, they might be a limited user.
    let operatorData = {};
    if (operatorDoc.exists) {
      operatorData = operatorDoc.data();
    } else {
      logger.warn(
        "User not found in operators collection during initial load",
        { userUid },
      );
      // Optionally check 'users' collection or return limited data
    }

    // 3. Determine permissions
    const isAdmin = operatorData.role === "admin";
    const userStructureIds = operatorData.structureIds || [];
    const userProjectIds = operatorData.projectIds || [];

    let structures = [];
    let projects = [];

    // 4. Fetch Structures
    if (isAdmin) {
      // Admin sees all structures
      const structuresSnap = await collections.structures().get();
      structures = structuresSnap.docs.map((doc) => ({
        id: doc.id,
        ...serializeFirestoreDoc(doc.data()),
      }));
    } else if (userStructureIds.length > 0) {
      // User sees assigned structures
      // Batch queries if > 30 items
      const batchSize = 30;
      const batches = [];
      for (let i = 0; i < userStructureIds.length; i += batchSize) {
        batches.push(userStructureIds.slice(i, i + batchSize));
      }

      const batchResults = await Promise.all(
        batches.map((batch) =>
          collections.structures().where("__name__", "in", batch).get(),
        ),
      );

      for (const snap of batchResults) {
        structures.push(
          ...snap.docs.map((doc) => ({
            id: doc.id,
            ...serializeFirestoreDoc(doc.data()),
          })),
        );
      }
    }

    // 5. Fetch Projects
    if (isAdmin) {
      // Admin sees all projects
      const projectsSnap = await collections.projects().get();
      projects = projectsSnap.docs.map((doc) => ({
        id: doc.id,
        ...serializeFirestoreDoc(doc.data()),
      }));
    } else if (userProjectIds.length > 0) {
      // User sees assigned projects
      const batchSize = 30;
      const batches = [];
      for (let i = 0; i < userProjectIds.length; i += batchSize) {
        batches.push(userProjectIds.slice(i, i + batchSize));
      }

      const batchResults = await Promise.all(
        batches.map((batch) =>
          collections.projects().where("__name__", "in", batch).get(),
        ),
      );

      for (const snap of batchResults) {
        projects.push(
          ...snap.docs.map((doc) => ({
            id: doc.id,
            ...serializeFirestoreDoc(doc.data()),
          })),
        );
      }
    }

    // 6. Construct the full user object
    // Merging auth data (handled by caller typically, but we return operator data)
    const fullUser = {
      uid: userUid,
      ...operatorData,
    };

    return {
      success: true,
      user: serializeFirestoreData(fullUser),
      structures,
      projects,
    };
  } catch (error) {
    logger.error("Error fetching auth user data", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
