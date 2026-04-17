"use server";

import { auth } from "@/lib/firebase/firebaseAdmin";
import { serializeFirestoreData } from "@/lib/utils";
import { collections } from "@/utils/database";
import { logger } from "@/utils/logger";
import { requireUser } from "@/utils/server-auth";

/**
 * Gets the current user's profile data.
 * Returns combined data from Firebase Auth and Firestore operator document.
 *
 * @returns {Promise<{success: boolean, profile?: Object, error?: string}>}
 */
export async function getProfile() {
  try {
    const { userUid } = await requireUser();

    // Get Firebase Auth user
    const authUser = await auth.getUser(userUid);

    // Get Firestore operator document
    const operatorDoc = await collections.operators().doc(userUid).get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : {};

    const profile = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || operatorData.displayName || "",
      photoURL: authUser.photoURL,
      phone: operatorData.phone || "",
      role: operatorData.role || "user",
      structureIds: operatorData.structureIds || [],
      metadata: {
        creationTime: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
      },
    };

    return { success: true, profile: serializeFirestoreData(profile) };
  } catch (error) {
    logger.error("Error getting profile", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the current user's profile.
 * Can update displayName, phone, and email.
 *
 * @param {Object} data - Profile data to update
 * @param {string} [data.displayName] - New display name
 * @param {string} [data.phone] - New phone number
 * @param {string} [data.email] - New email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProfile(data) {
  try {
    const { userUid } = await requireUser();

    const { displayName, phone, email } = data;

    // Update Firebase Auth if displayName or email changed
    const authUpdates = {};
    if (displayName) authUpdates.displayName = displayName;
    if (email) authUpdates.email = email;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userUid, authUpdates);
    }

    // Update Firestore operator document
    const firestoreUpdates = {
      updatedAt: new Date(),
    };
    if (displayName) firestoreUpdates.displayName = displayName;
    if (phone !== undefined) firestoreUpdates.phone = phone;
    if (email) firestoreUpdates.email = email;

    // Check if operator document exists, if not create it
    const operatorDoc = await collections.operators().doc(userUid).get();

    if (operatorDoc.exists) {
      await collections.operators().doc(userUid).update(firestoreUpdates);
    } else {
      // Create operator document if it doesn't exist
      await collections
        .operators()
        .doc(userUid)
        .set({
          ...firestoreUpdates,
          email: email || (await auth.getUser(userUid)).email,
          displayName: displayName || "",
          phone: phone || null,
          role: "user",
          structureIds: [],
          createdAt: new Date(),
        });
    }

    logger.info("Profile updated", { userUid });

    return { success: true };
  } catch (error) {
    logger.error("Error updating profile", error);
    return { success: false, error: error.message };
  }
}
