'use server';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, REVALIDATE } from '@/lib/cache';

/**
 * Fetches anagrafica list for a structure with caching
 * Permission checks are performed at the page/component level
 */
async function fetchAnagraficaListFromDb(structureId) {
  const admin = (await import("@/lib/firebase/firebaseAdmin")).default;
  const snap = await admin
    .firestore()
    .collection("anagrafica")
    .where("canBeAccessedBy", "array-contains", structureId)
    .where("deleted", "!=", true)
    .get();

  return snap.docs.map(doc => ({
    id: doc.id,
    ...JSON.parse(JSON.stringify(doc.data())),
  }));
}

/**
 * Gets cached anagrafica list for a structure
 * Cache is automatically invalidated when anagrafica records are mutated
 * @param {string} structure - The structure ID to fetch records for
 */
export async function getData(structure) {
  const getCachedData = unstable_cache(
    async () => fetchAnagraficaListFromDb(structure),
    [`anagrafica-list`, structure],
    {
      tags: [CACHE_TAGS.anagraficaList(structure)],
      revalidate: REVALIDATE.anagraficaList,
    }
  );

  const data = await getCachedData();
  return JSON.stringify(data);
}

/**
 * Fetches full anagrafica data (personal info + structure-specific data) for export.
 * Not cached — always fetches fresh data for accurate exports.
 * @param {string} structureId
 * @returns {Array} Merged rows ready for export
 */
export async function getExportData(structureId) {
  const admin = (await import("@/lib/firebase/firebaseAdmin")).default;
  const db = admin.firestore();

  const [anagraficaSnap, dataSnap] = await Promise.all([
    db.collection("anagrafica")
      .where("canBeAccessedBy", "array-contains", structureId)
      .where("deleted", "!=", true)
      .get(),
    db.collection("anagrafica_data")
      .where("structureId", "==", structureId)
      .get(),
  ]);

  const structureDataMap = {};
  for (const doc of dataSnap.docs) {
    const d = doc.data();
    if (d.anagraficaId) structureDataMap[d.anagraficaId] = d;
  }

  return anagraficaSnap.docs.map(doc => {
    const sd = structureDataMap[doc.id] || {};
    const { anagraficaId: _aid, structureId: _sid, updatedAt: _upd, updatedBy: _upBy, createdAt: _cr, status: _st, ...structureGroups } = sd;
    return {
      id: doc.id,
      ...JSON.parse(JSON.stringify({ ...doc.data(), ...structureGroups })),
    };
  });
}
