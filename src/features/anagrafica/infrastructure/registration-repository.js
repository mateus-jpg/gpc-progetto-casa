import admin from "@/lib/firebase/firebaseAdmin";
import {
  adminDb,
  buildStructureDataPayload,
  choosePreferredStructureDataDoc,
  getStructureDataQuery,
  getStructureDataRef,
  markLegacyStructureDataDocsSuperseded,
} from "@/actions/anagrafica/anagrafica-core";

export async function findExistingAnagraficaByCodiceFiscale(codiceFiscale) {
  if (!codiceFiscale) {
    return null;
  }

  const querySnap = await adminDb
    .collection("anagrafica")
    .where("anagrafica.codiceFiscale", "==", codiceFiscale)
    .where("deleted", "==", false)
    .limit(1)
    .get();

  return querySnap.empty ? null : querySnap.docs[0];
}

export async function createOrLinkGlobalAnagrafica({
  globalData,
  structureId,
  codiceFiscale,
}) {
  const existingDoc =
    await findExistingAnagraficaByCodiceFiscale(codiceFiscale);

  if (existingDoc) {
    const anagraficaId = existingDoc.id;
    const currentAccess = existingDoc.data().canBeAccessedBy || [];

    if (!currentAccess.includes(structureId)) {
      await adminDb.collection("anagrafica").doc(anagraficaId).update({
        canBeAccessedBy: admin.firestore.FieldValue.arrayUnion(structureId),
        structureIds: admin.firestore.FieldValue.arrayUnion(structureId),
        updatedAt: new Date(),
      });
    }

    return {
      anagraficaId,
      existingDoc,
    };
  }

  const docRef = await adminDb.collection("anagrafica").add(globalData);

  return {
    anagraficaId: docRef.id,
    existingDoc: null,
  };
}

export async function upsertStructureDataForRegistration({
  anagraficaId,
  structureId,
  structureData,
  userUid,
}) {
  const structureDataRef = getStructureDataRef(anagraficaId, structureId);
  const [canonicalSnap, legacySnap] = await Promise.all([
    structureDataRef.get(),
    getStructureDataQuery(anagraficaId, structureId).get(),
  ]);

  const availableDocs = [
    ...(canonicalSnap.exists
      ? [
          {
            id: canonicalSnap.id,
            ref: structureDataRef,
            data: canonicalSnap.data(),
          },
        ]
      : []),
    ...legacySnap.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    })),
  ];

  const existingStructureData = choosePreferredStructureDataDoc(
    availableDocs.filter(
      (doc, index, array) =>
        array.findIndex((candidate) => candidate.ref.path === doc.ref.path) ===
        index,
    ),
    structureDataRef.id,
  );

  const canonicalStructureData = buildStructureDataPayload(
    anagraficaId,
    structureId,
    existingStructureData?.data || {},
    structureData,
    userUid,
  );

  await structureDataRef.set(canonicalStructureData);
  await markLegacyStructureDataDocsSuperseded(
    anagraficaId,
    structureId,
    structureDataRef.id,
  );

  return {
    structureDataId: structureDataRef.id,
    existingStructureData,
  };
}

export function getAllowedStructures(existingDoc, structureId) {
  return existingDoc
    ? [
        ...new Set([
          ...(existingDoc.data().canBeAccessedBy || []),
          structureId,
        ]),
      ]
    : [structureId];
}
