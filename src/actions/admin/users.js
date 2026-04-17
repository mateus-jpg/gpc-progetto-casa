"use server";

import {
  invalidateStructureCache,
  invalidateUserProfileCache,
} from "@/lib/cache";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { serializeFirestoreData } from "@/lib/utils";
import { logAdminAction, logPermissionChange } from "@/utils/audit";
import {
  collections,
  queryDocumentsByIds,
  serializeFirestoreDoc,
} from "@/utils/database";
import { logger } from "@/utils/logger";
import { requireUser, verifySuperAdmin } from "@/utils/server-auth";

/**
 * Lists all users in the system.
 * Requires super admin privileges.
 *
 * @param {number} maxResults - Maximum number of results to return
 * @param {string} pageToken - Pagination token
 * @returns {Promise<{users: Array, pageToken: string}>}
 * @throws {Error} If user is not authenticated or not a super admin
 */
export async function listAllUsers(maxResults = 100, pageToken) {
  try {
    // Ensure the caller is authenticated and is a super admin
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    // Fetch users using Firebase Admin SDK
    const result = await auth.listUsers(maxResults, pageToken);

    // Get operator data for each user
    const usersWithOperatorData = await Promise.all(
      result.users.map(async (user) => {
        const operatorDoc = await collections.operators().doc(user.uid).get();
        const operatorData = operatorDoc.exists ? operatorDoc.data() : {};

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
          role: operatorData.role || "user",
          projectIds: operatorData.projectIds || [],
          structureIds: operatorData.structureIds || [],
          metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
          },
        };
      }),
    );

    logger.info("Listed all users", {
      count: usersWithOperatorData.length,
      actorUid: userUid,
    });

    return {
      users: serializeFirestoreData(usersWithOperatorData),
      pageToken: result.pageToken,
    };
  } catch (error) {
    logger.error("Error listing users", error);
    throw new Error("Failed to list users.");
  }
}

/**
 * Creates a new user in Firebase Auth and Firestore.
 * Requires super admin privileges.
 *
 * @param {Object} userData - User data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} [userData.displayName] - User's display name
 * @param {string} [userData.phone] - User's phone number
 * @param {string} [userData.role] - User's role (user, structure_admin)
 * @param {string[]} [userData.structureIds] - Array of structure IDs the user has access to
 * @returns {Promise<{success: boolean, uid?: string, error?: string}>}
 */
export async function createUser(userData) {
  let createdAuthUser = null;

  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    const {
      email,
      password,
      displayName,
      phone,
      role = "user",
      projectIds = [],
      structureIds = [],
    } = userData;

    // Validate required fields
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
      disabled: false,
    });

    // Track created user for rollback if needed
    createdAuthUser = userRecord;

    // Create operator document in Firestore
    await collections
      .operators()
      .doc(userRecord.uid)
      .set({
        email,
        displayName: displayName || email.split("@")[0],
        phone: phone || null,
        role,
        projectIds,
        structureIds,
        createdAt: new Date(),
        createdBy: userUid,
      });

    // Log the action
    await logAdminAction({
      action: "create_user",
      actorUid: userUid,
      targetUid: userRecord.uid,
      details: { email, role, projectIds, structureIds },
    });

    logger.info("Created new user", {
      actorUid: userUid,
      newUserUid: userRecord.uid,
      email,
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    logger.error("Error creating user", error);

    // Rollback: If Auth user was created but Firestore failed, delete the Auth user
    if (createdAuthUser) {
      try {
        await auth.deleteUser(createdAuthUser.uid);
        logger.info("Rolled back Auth user creation after Firestore failure", {
          uid: createdAuthUser.uid,
        });
      } catch (rollbackError) {
        logger.error("Failed to rollback Auth user creation", rollbackError, {
          uid: createdAuthUser.uid,
        });
      }
    }

    return { success: false, error: error.message };
  }
}

/**
 * Gets a user's details including their Firestore operator document.
 * Requires super admin privileges.
 *
 * @param {string} targetUid - UID of user to get
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function getUser(targetUid) {
  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    // Get Firebase Auth user
    const authUser = await auth.getUser(targetUid);

    // Get Firestore operator document
    const operatorDoc = await collections.operators().doc(targetUid).get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : {};

    const user = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      disabled: authUser.disabled,
      metadata: {
        creationTime: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
      },
      // Include operator data
      phone: operatorData.phone || null,
      role: operatorData.role || "user",
      projectIds: operatorData.projectIds || [],
      structureIds: operatorData.structureIds || [],
    };

    return { success: true, user: serializeFirestoreData(user) };
  } catch (error) {
    logger.error("Error getting user", error, { targetUid });
    return { success: false, error: error.message };
  }
}

/**
 * Updates a user's basic information.
 * Requires super admin privileges.
 *
 * @param {string} targetUid - UID of user to update
 * @param {Object} data - Data to update (displayName, phone, role)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUser(targetUid, data) {
  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    const { displayName, phone, role, email } = data;

    // Update Firebase Auth if displayName or email changed
    const authUpdates = {};
    if (displayName) authUpdates.displayName = displayName;
    if (email) authUpdates.email = email;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(targetUid, authUpdates);
    }

    // Update Firestore operator document
    const firestoreUpdates = {
      updatedAt: new Date(),
      updatedBy: userUid,
    };
    if (displayName) firestoreUpdates.displayName = displayName;
    if (phone !== undefined) firestoreUpdates.phone = phone;
    if (role) firestoreUpdates.role = role;
    if (email) firestoreUpdates.email = email;

    await collections.operators().doc(targetUid).update(firestoreUpdates);

    await logAdminAction({
      action: "update_user",
      actorUid: userUid,
      targetUid,
      details: { updatedFields: Object.keys(data) },
    });

    logger.info("Updated user", { actorUid: userUid, targetUid });

    return { success: true };
  } catch (error) {
    logger.error("Error updating user", error, { targetUid });
    return { success: false, error: error.message };
  }
}

/**
 * Adds a structure to a user's access list.
 * Requires super admin privileges.
 *
 * @param {string} targetUid - UID of user to modify
 * @param {string} structureId - Structure ID to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addUserToStructure(targetUid, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    // Get current operator document
    const operatorDoc = await collections.operators().doc(targetUid).get();

    if (!operatorDoc.exists) {
      return {
        success: false,
        error: "User not found in operators collection",
      };
    }

    const operatorData = operatorDoc.data();
    const currentStructures = operatorData.structureIds || [];

    // Check if already has access
    if (currentStructures.includes(structureId)) {
      return {
        success: false,
        error: "User already has access to this structure",
      };
    }

    // Verify structure exists
    const structureDoc = await collections.structures().doc(structureId).get();
    if (!structureDoc.exists) {
      return { success: false, error: "Structure not found" };
    }

    const newStructureIds = [...currentStructures, structureId];

    // Update Firestore
    await collections.operators().doc(targetUid).update({
      structureIds: newStructureIds,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logPermissionChange({
      actorUid: userUid,
      targetUid,
      changeType: "add_structure",
      details: { structureId, newStructureIds },
    });

    // Invalidate caches for the affected user and structure
    invalidateUserProfileCache(targetUid);
    invalidateStructureCache(structureId);

    logger.info("Added user to structure", {
      actorUid: userUid,
      targetUid,
      structureId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error adding user to structure", error, {
      targetUid,
      structureId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Removes a structure from a user's access list.
 * Requires super admin privileges.
 *
 * @param {string} targetUid - UID of user to modify
 * @param {string} structureId - Structure ID to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeUserFromStructure(targetUid, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifySuperAdmin({ userUid });

    // Get current operator document
    const operatorDoc = await collections.operators().doc(targetUid).get();

    if (!operatorDoc.exists) {
      return {
        success: false,
        error: "User not found in operators collection",
      };
    }

    const operatorData = operatorDoc.data();
    const currentStructures = operatorData.structureIds || [];

    // Check if has access
    if (!currentStructures.includes(structureId)) {
      return {
        success: false,
        error: "User does not have access to this structure",
      };
    }

    const newStructureIds = currentStructures.filter(
      (id) => id !== structureId,
    );

    // Update Firestore
    await collections.operators().doc(targetUid).update({
      structureIds: newStructureIds,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logPermissionChange({
      actorUid: userUid,
      targetUid,
      changeType: "remove_structure",
      details: { structureId, newStructureIds },
    });

    // Invalidate caches for the affected user and structure
    invalidateUserProfileCache(targetUid);
    invalidateStructureCache(structureId);

    logger.info("Removed user from structure", {
      actorUid: userUid,
      targetUid,
      structureId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error removing user from structure", error, {
      targetUid,
      structureId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Lists structures in the system.
 * Super admins see all structures.
 * Non-admin users see only structures they are operators of.
 *
 * @returns {Promise<{success: boolean, structures?: Array, error?: string}>}
 */
export async function listAllStructures() {
  try {
    const { userUid } = await requireUser();

    // Get user document to check role and structureIds
    const operatorDoc = await collections.operators().doc(userUid).get();

    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const isAdmin = operatorData.role === "admin";

    let structures = [];

    if (isAdmin) {
      // Super admins see all structures
      const snapshot = await collections.structures().get();
      structures = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        ...serializeFirestoreDoc(doc.data()),
      }));
    } else {
      // Non-admin users see only structures they are operators of
      const userStructureIds = operatorData.structureIds || [];

      if (userStructureIds.length === 0) {
        return { success: true, structures: [] };
      }

      const docs = await queryDocumentsByIds(
        collections.structures(),
        userStructureIds,
      );
      structures.push(
        ...docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
          ...serializeFirestoreDoc(doc.data()),
        })),
      );
    }

    logger.info("Listed structures", {
      count: structures.length,
      actorUid: userUid,
      isAdmin,
    });

    return { success: true, structures };
  } catch (error) {
    logger.error("Error listing structures", error);
    return { success: false, error: error.message };
  }
}
