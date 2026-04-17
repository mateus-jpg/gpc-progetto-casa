"use server";

import { unstable_cache } from "next/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const adminDb = admin.firestore();

/**
 * Internal function to fetch statistics from database
 * @param {string} structureId - The structure ID
 * @returns {Object} The statistics data
 */
async function fetchStatisticsFromDb(structureId) {
  const statsRef = adminDb.collection("statistics").doc(structureId);
  const statsSnap = await statsRef.get();

  if (!statsSnap.exists) {
    return null;
  }

  const data = statsSnap.data();
  return JSON.parse(JSON.stringify(data));
}

/**
 * Internal function to fetch monthly statistics for trends
 * @param {string} structureId - The structure ID
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Array} Array of monthly statistics
 */
async function fetchMonthlyStatsFromDb(structureId, months = 6) {
  const monthlyRef = adminDb
    .collection("statistics")
    .doc(structureId)
    .collection("monthly")
    .orderBy("__name__", "desc")
    .limit(months);

  const monthlySnap = await monthlyRef.get();

  if (monthlySnap.empty) {
    return [];
  }

  return monthlySnap.docs
    .map((doc) => ({
      id: doc.id,
      ...JSON.parse(JSON.stringify(doc.data())),
    }))
    .reverse(); // Chronological order
}

/**
 * Get statistics for a structure (Server Action)
 * @param {string} structureId - The structure ID
 * @returns {string} JSON string with statistics data
 */
export async function getStatistics(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({
      userUid,
      structureId,
    });

    // Use cached fetcher for better performance
    const getCachedStats = unstable_cache(
      async () => fetchStatisticsFromDb(structureId),
      [`statistics`, structureId],
      {
        tags: [`statistics-${structureId}`],
        revalidate: 60, // Revalidate every minute
      },
    );

    const stats = await getCachedStats();

    return JSON.stringify({
      success: true,
      data: stats || getEmptyStats(),
    });
  } catch (error) {
    console.error("[GET_STATISTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: getEmptyStats(),
    });
  }
}

/**
 * Get monthly statistics for trends (Server Action)
 * @param {string} structureId - The structure ID
 * @param {number} months - Number of months to fetch
 * @returns {string} JSON string with monthly statistics
 */
export async function getMonthlyStatistics(structureId, months = 6) {
  try {
    const { userUid } = await requireUser();

    await verifyUserPermissions({
      userUid,
      structureId,
    });

    const getCachedMonthlyStats = unstable_cache(
      async () => fetchMonthlyStatsFromDb(structureId, months),
      [`statistics-monthly`, structureId, months.toString()],
      {
        tags: [`statistics-monthly-${structureId}`],
        revalidate: 300, // Revalidate every 5 minutes
      },
    );

    const monthlyStats = await getCachedMonthlyStats();

    return JSON.stringify({
      success: true,
      data: monthlyStats,
    });
  } catch (error) {
    console.error("[GET_MONTHLY_STATISTICS ERROR]:", error);
    return JSON.stringify({
      success: false,
      error: error.message,
      data: [],
    });
  }
}

/**
 * Returns empty stats structure for fallback
 */
function getEmptyStats() {
  return {
    // Anagrafica Stats
    totalPersons: 0,
    byGender: {},
    byAgeRange: {},
    byCittadinanza: {},
    byBirthPlace: {},
    byFamilyType: {},
    byNucleoType: {},
    byChildrenCount: {},
    byLegalStatus: {},
    byHousingStatus: {},
    byJobStatus: {},
    byEducationOrigin: {},
    byEducationItaly: {},
    byItalianLevel: {},
    byVulnerability: {},
    byIntenzioneItalia: {},
    byReferral: {},

    // Access Stats
    totalAccesses: 0,
    byAccessType: {},
    bySubcategory: {},
    byClassification: {},
    byReferralEntity: {},
    totalFiles: 0,
    filesWithExpiration: 0,
    totalReminders: 0,

    // Reminder Stats
    totalRemindersCreated: 0,
    activeReminders: 0,
    completedReminders: 0,
    remindersByServiceType: {},
  };
}
