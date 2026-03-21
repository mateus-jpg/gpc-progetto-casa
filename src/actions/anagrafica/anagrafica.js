'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions, verifyStructureAdmin } from '@/utils/server-auth';
import { createAccessInternal } from './access';
import { createHistoryEntry } from './history';
import { computeGroupChanges } from '@/utils/anagraficaUtils';
import { CACHE_TAGS, REVALIDATE, invalidateAnagraficaCaches } from '@/lib/cache';
import { logDataCreate, logDataAccess, logDataUpdate, logDataDelete, logResourceModification } from '@/utils/audit';
import { serializeFirestoreData } from '@/lib/utils';
import { logger } from '@/utils/logger';

const adminDb = admin.firestore();

/**
 * Internal function to fetch anagrafica from database
 * Used by cached wrapper
 */
async function fetchAnagraficaFromDb(anagraficaId) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    return null;
  }

  const data = anagraficaSnap.data();
  return {
    id: anagraficaSnap.id,
    ...JSON.parse(JSON.stringify(data)),
  };
}

/**
 * Internal function to get anagrafica with caching
 * Can be called from both server actions and API routes
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} userUid - The user UID for permission check
 * @param {string} [structureId] - Optional structure ID for context
 * @returns {Object} The anagrafica data
 * @throws {Error} If not found or access denied
 */
export async function getAnagraficaInternal(anagraficaId, userUid, structureId = null) {
  // Get cached data first (faster)
  const getCachedAnagrafica = unstable_cache(
    async () => fetchAnagraficaFromDb(anagraficaId),
    [`anagrafica`, anagraficaId],
    {
      tags: [CACHE_TAGS.anagrafica(anagraficaId)],
      revalidate: REVALIDATE.anagraficaDetail,
    }
  );

  const anagraficaData = await getCachedAnagrafica();

  if (!anagraficaData) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Check soft delete
  if (anagraficaData.deletedAt) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const globalData = anagraficaData;
  const allowedStructures = globalData.canBeAccessedBy || [];

  // Permission check is NOT cached - always runs fresh for security
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  // 3. Fetch Structure Specific Data
  // Strategy: Fetch ALL data available for this anagrafica from 'anagrafica_data' collection
  // filtered by what the user is allowed to see (which is technically "all" if they have access to the person, per new requirement).

  let structureData = {};
  let otherStructuresData = [];

  const getCachedAllStructureData = unstable_cache(
    async () => {
      const q = await adminDb.collection('anagrafica_data')
        .where('anagraficaId', '==', anagraficaId)
        .get();

      if (q.empty) return [];
      return serializeFirestoreData(q.docs.map(d => ({ ...d.data(), id: d.id })));
    },
    [`anagrafica_all_data`, anagraficaId],
    {
      tags: [CACHE_TAGS.anagraficaData(anagraficaId)],
      revalidate: REVALIDATE.anagraficaDetail
    }
  );

  const allStructureDocs = await getCachedAllStructureData();

  // Sort data: Current Structure vs Others
  if (structureId) {
    const current = allStructureDocs.find(d => d.structureId === structureId);
    if (current) {
      structureData = current;
    }
  }

  // Collect others (excluding current if it exists)
  otherStructuresData = allStructureDocs.filter(d => d.structureId !== structureId);

  // Enrich otherStructuresData with structure names
  if (otherStructuresData.length > 0) {
    const otherStructureIds = [...new Set(otherStructuresData.map(d => d.structureId))];
    const structureNames = {};

    // Fetch structure documents to get display names
    for (const sId of otherStructureIds) {
      try {
        const structureDoc = await adminDb.collection('structures').doc(sId).get();
        if (structureDoc.exists) {
          structureNames[sId] = structureDoc.data().name || sId;
        } else {
          structureNames[sId] = sId;
        }
      } catch {
        structureNames[sId] = sId;
      }
    }

    otherStructuresData = otherStructuresData.map(d => ({
      ...d,
      structureName: structureNames[d.structureId] || d.structureId
    }));
  }

  // 4. Merge Data
  // Global data already has personal info nested under 'anagrafica' key in Firestore
  // Extract structure group data (exclude metadata fields from structureData)
  const { id: _sdId, anagraficaId: _sdAid, structureId: _sdSid, updatedAt: _sdUpd, updatedBy: _sdUpBy, createdAt: _sdCr, status: _sdSt, ...structureGroups } = structureData;

  const result = {
    ...globalData,          // { anagrafica: { nome, cognome, ... }, canBeAccessedBy, createdAt, ... }
    ...structureGroups,     // { nucleoFamiliare: {...}, legaleAbitativa: {...}, ... }
    id: globalData.id,
    globalId: globalData.id,
    structureDataId: structureData.id,
    otherStructuresData: otherStructuresData
  };

  // Audit log: anagrafica read
  await logDataAccess({
    actorUid: userUid,
    resourceType: 'anagrafica',
    resourceId: anagraficaId
  });

  return result;
}

/**
 * Internal function to update anagrafica
 * Can be called from both server actions and API routes
 * Uses Firestore transaction to prevent race conditions
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {Object} body - The update data (should be pre-validated)
 * @param {string} userUid - The user UID
 * @param {string} userMail - The user email (optional)
 * @param {string} structureId - The structure ID making the update (optional)
 * @returns {Object} The updated anagrafica data
 */
export async function updateAnagraficaInternal(anagraficaId, body, userUid, userMail = null, structureId = null) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);

  // Use transaction to ensure atomic read-check-write
  const result = await adminDb.runTransaction(async (transaction) => {
    // 1. Fetch Global Data
    const anagraficaSnap = await transaction.get(anagraficaRef);
    if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');
    const anagraficaData = anagraficaSnap.data();
    if (anagraficaData.deletedAt) throw new Error('Anagrafica not found');

    const allowedStructures = anagraficaData.canBeAccessedBy || [];
    await verifyUserPermissions({ userUid, allowedStructures });

    // 2. Fetch Structure Data (if structureId provided)
    let structureDataRef = null;
    let structureDataDoc = null;
    if (structureId) {
      // We need to find the document. It's a query, but inside transaction?
      // Query inside transaction is tricky. Best practice: unique ID or know the ID.
      // We implemented 'anagrafica_data' with auto-ID. This makes transactions hard.
      // FIX: For robust updates, we should probably have pre-fetched the ID or query.
      // However, Firestore transactions require reads come before writes.
      // We can do a query using `transaction.get(query)`.

      const q = adminDb.collection('anagrafica_data')
        .where('anagraficaId', '==', anagraficaId)
        .where('structureId', '==', structureId)
        .limit(1);

      const qSnap = await transaction.get(q);
      if (!qSnap.empty) {
        structureDataDoc = qSnap.docs[0];
        structureDataRef = structureDataDoc.ref;
      } else {
        // Can't update structure data if it doesn't exist. 
        // Should we create it on fly? Maybe.
        // For now, let's assume if we are updating, it exists or we create new ref.
        structureDataRef = adminDb.collection('anagrafica_data').doc();
      }
    }

    // 3. Split Payload
    // Personal info comes nested: { anagrafica: { nome, ... }, nucleoFamiliare: {...}, ... }
    // Personal fields are stored nested in Firestore as 'anagrafica.fieldName'
    const globalUpdate = {};
    const structureUpdate = {};

    // Handle personal info nested under 'anagrafica' key
    // Use Firestore dot notation to update individual nested fields
    if (body.anagrafica && typeof body.anagrafica === 'object') {
      Object.keys(body.anagrafica).forEach(key => {
        globalUpdate[`anagrafica.${key}`] = body.anagrafica[key];
      });
    }

    // Handle root-level global fields (canBeAccessedBy, etc.) and structure groups
    Object.keys(body).forEach(key => {
      if (key === 'anagrafica') return; // Already handled above
      if (key === 'canBeAccessedBy' || key === 'structureIds') {
        globalUpdate[key] = body[key];
      } else {
        structureUpdate[key] = body[key];
      }
    });

    globalUpdate['updatedAt'] = new Date();
    globalUpdate['updatedBy'] = userUid;
    if (userMail) globalUpdate['updatedByMail'] = userMail;
    if (structureId) globalUpdate['updatedByStructure'] = structureId;

    structureUpdate['updatedAt'] = new Date();
    structureUpdate['updatedBy'] = userUid;

    // 4. Calculate Changes (History)
    // Firestore doc has anagrafica nested: { anagrafica: { nome, ... }, ... }
    // Compare old vs new personal info
    const oldAnagrafica = anagraficaData.anagrafica || {};
    const newAnagrafica = body.anagrafica
      ? { ...oldAnagrafica, ...body.anagrafica }
      : oldAnagrafica;

    const oldGlobalWrapped = { anagrafica: oldAnagrafica };
    const newGlobalWrapped = { anagrafica: newAnagrafica };
    const { changedGroups: globalChangedGroups, changes: globalChanges } = computeGroupChanges(oldGlobalWrapped, newGlobalWrapped);

    // Structure changes - data is already organized by groups
    let structureChangedGroups = [];
    let structureChanges = {};
    let isNewStructureData = false;

    if (structureDataDoc && structureDataDoc.exists) {
      // Compare with existing structure data
      const { changedGroups: sGroups, changes: sChanges } = computeGroupChanges(structureDataDoc.data(), structureUpdate);
      structureChangedGroups = sGroups;
      structureChanges = sChanges;
    } else if (structureId && Object.keys(structureUpdate).length > 2) {
      // New structure data - treat all non-empty groups as changes
      isNewStructureData = true;
      const structureGroups = ['nucleoFamiliare', 'legaleAbitativa', 'lavoroFormazione', 'vulnerabilita', 'referral'];
      structureGroups.forEach(group => {
        if (structureUpdate[group] && Object.keys(structureUpdate[group]).length > 0) {
          structureChangedGroups.push(group);
          structureChanges[group] = {
            before: null,
            after: structureUpdate[group]
          };
        }
      });
    }

    const allChangedGroups = [...globalChangedGroups, ...structureChangedGroups];
    const allChanges = { ...globalChanges, ...structureChanges };

    // 5. Perform Updates
    // Check if we have actual data changes (not just metadata)
    const globalMetadataFields = ['updatedAt', 'updatedBy', 'updatedByMail', 'updatedByStructure'];
    const hasGlobalDataChanges = Object.keys(globalUpdate).some(key => !globalMetadataFields.includes(key));

    if (hasGlobalDataChanges) {
      transaction.update(anagraficaRef, globalUpdate);
    }

    // For structure update, check for actual data (excluding updatedAt, updatedBy)
    const structureMetadataFields = ['updatedAt', 'updatedBy'];
    const hasStructureDataChanges = Object.keys(structureUpdate).some(key => !structureMetadataFields.includes(key));

    if (structureDataRef && hasStructureDataChanges) {
      if (structureDataDoc && structureDataDoc.exists) {
        transaction.update(structureDataRef, structureUpdate);
      } else {
        // Create if not exists (upsert logic for migration/safety)
        transaction.set(structureDataRef, {
          anagraficaId,
          structureId,
          ...structureUpdate,
          createdAt: new Date()
        });
      }
    }

    return {
      allowedStructures,
      changedGroups: allChangedGroups,
      changes: allChanges,
      updateData: { ...globalUpdate, ...structureUpdate },
      structureDataRefPath: structureDataRef ? structureDataRef.path : null,
      isNewStructureData
    };
  });

  // Create history entry AFTER successful transaction
  // Determine where to save history. Global -> Global History, Structure -> Structure History?
  // User requested split history.
  // Currently `createHistoryEntry` saves to `anagrafica/{id}/history`.
  // We should interpret `changedGroups` to decide.

  // NOTE: Simple patch - we save everything to global history for now OR update `history.js` which is separate task.
  // The plan said: "Global History ... Structure History".
  // For this step I will log to global history as originally designed BUT ensuring we pass structureId.
  // ideally we should split this too, but `createHistoryEntry` needs update.

  // Create history entry AFTER successful transaction (outside transaction to avoid conflicts)
  // Split history creation based on changes

  // 1. Global History
  const globalGroupNames = ['anagrafica'];
  const globalGroups = result.changedGroups.filter(g => globalGroupNames.includes(g));

  if (globalGroups.length > 0) {
    // Build changes object and verify there are actual differences
    const globalChanges = {};
    let hasActualChanges = false;

    globalGroups.forEach(g => {
      const change = result.changes[g];
      if (change) {
        // Verify before and after are actually different
        const beforeJson = JSON.stringify(change.before || {});
        const afterJson = JSON.stringify(change.after || {});
        if (beforeJson !== afterJson) {
          globalChanges[g] = change;
          hasActualChanges = true;
        }
      }
    });

    // Only create history entry if there are actual changes
    if (hasActualChanges) {
      await createHistoryEntry({
        anagraficaId,
        changeType: 'update',
        changedGroups: Object.keys(globalChanges),
        changes: globalChanges,
        userUid,
        userMail,
        structureId
      });
    }
  }

  // 2. Structure History
  const structureGroups = result.changedGroups.filter(g => !globalGroupNames.includes(g));

  if (structureGroups.length > 0 && result.structureDataRefPath) {
    // Extract ID from path "anagrafica_data/ID"
    const structureDataId = result.structureDataRefPath.split('/').pop();
    const sChanges = {};
    let hasStructureChanges = false;

    structureGroups.forEach(g => {
      const change = result.changes[g];
      if (change) {
        // Verify before and after are actually different
        const beforeJson = JSON.stringify(change.before || {});
        const afterJson = JSON.stringify(change.after || {});
        if (beforeJson !== afterJson) {
          sChanges[g] = change;
          hasStructureChanges = true;
        }
      }
    });

    // Only create history entry if there are actual changes
    if (hasStructureChanges) {
      await createHistoryEntry({
        anagraficaId,
        changeType: result.isNewStructureData ? 'create' : 'update',
        changedGroups: Object.keys(sChanges),
        changes: sChanges,
        userUid,
        userMail,
        structureId,
        structureDataId: structureDataId
      });
    }
  }

  // Audit log
  await logDataUpdate({
    actorUid: userUid,
    resourceType: 'anagrafica',
    resourceId: anagraficaId,
    structureId,
    changedFields: result.changedGroups
  });

  // Invalidate caches (includes anagrafica_data tag for cross-structure visibility)
  invalidateAnagraficaCaches(anagraficaId, result.allowedStructures);

  // Return merged data via getInternal
  return await getAnagraficaInternal(anagraficaId, userUid, structureId);
}

/**
 * Internal function to soft delete anagrafica
 * Can be called from both server actions and API routes
 * Uses Firestore transaction to prevent race conditions
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} userUid - The user UID
 * @returns {Object} Success result
 */
export async function deleteAnagraficaInternal(anagraficaId, userUid) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);

  // Use transaction to ensure atomic read-check-write
  const allowedStructures = await adminDb.runTransaction(async (transaction) => {
    const anagraficaSnap = await transaction.get(anagraficaRef);

    if (!anagraficaSnap.exists) {
      const error = new Error('Anagrafica not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const anagraficaData = anagraficaSnap.data();

    // Already deleted
    if (anagraficaData.deletedAt) {
      const error = new Error('Anagrafica already deleted');
      error.code = 'ALREADY_DELETED';
      throw error;
    }

    const structures = anagraficaData.canBeAccessedBy || [];

    // Check access
    await verifyUserPermissions({
      userUid,
      allowedStructures: structures
    });

    // Soft delete within transaction
    transaction.update(anagraficaRef, {
      deletedAt: new Date(),
      deletedBy: userUid,
      deleted: true,
    });

    return structures;
  });

  // Invalidate caches after successful delete
  invalidateAnagraficaCaches(anagraficaId, allowedStructures);

  // Audit log: anagrafica delete (soft delete)
  await logDataDelete({
    actorUid: userUid,
    resourceType: 'anagrafica',
    resourceId: anagraficaId,
    softDelete: true
  });

  return { success: true, message: 'Scheda eliminata con successo' };
}

/**
 * Crea una nuova anagrafica (con eventuali accessi e file)
 * Handles splitting data between Global 'anagrafica' and specific 'anagrafica_data'
 */
export async function createAnagrafica(body, services = []) {
  try {
    // 1. AUTHENTICATION
    const { userUid, headers: hdr } = await requireUser();
    const userMail = hdr?.get?.('x-user-mail') || null;
    const structureId = body.registeredByStructure;

    // 2. PERMISSION CHECK (User must belong to the registering structure)
    await verifyUserPermissions({
      userUid,
      structureId
    });

    // 3. PREPARE DATA SPLIT
    // Global fields (Identity) - personal info nested under 'anagrafica' key
    const globalData = {
      anagrafica: body.anagrafica, // { nome, cognome, sesso, dataDiNascita, ... }
      canBeAccessedBy: body.canBeAccessedBy || [structureId],
      structureIds: body.canBeAccessedBy || [structureId],
      registeredBy: userUid,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    };

    // Structure Specific Data (Situation)
    const structureData = {
      structureId: structureId,
      nucleoFamiliare: body.nucleoFamiliare,
      legaleAbitativa: body.legaleAbitativa,
      lavoroFormazione: body.lavoroFormazione,
      vulnerabilita: body.vulnerabilita,
      referral: body.referral,
      notes: body.notes || "",
      updatedAt: new Date(),
      updatedBy: userUid,
      status: 'Active'
    };

    let anagraficaId;

    // 4. CHECK IF EXISTS (Optional: check by CF if provided)
    // For now, we assume it's new logic or we implement a check later.
    // The plan said "Check if global anagrafica exists".
    // Let's do a simple check by Codice Fiscale if present
    const cf = body.anagrafica?.codiceFiscale;
    let existingDoc = null;

    if (cf) {
      const querySnap = await adminDb.collection('anagrafica')
        .where('anagrafica.codiceFiscale', '==', cf)
        .where('deleted', '==', false)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        existingDoc = querySnap.docs[0];
      }
    }

    if (existingDoc) {
      // Link to existing
      anagraficaId = existingDoc.id;
      const currentAccess = existingDoc.data().canBeAccessedBy || [];

      if (!currentAccess.includes(structureId)) {
        await adminDb.collection('anagrafica').doc(anagraficaId).update({
          canBeAccessedBy: admin.firestore.FieldValue.arrayUnion(structureId),
          structureIds: admin.firestore.FieldValue.arrayUnion(structureId),
          updatedAt: new Date()
        });
      }
    } else {
      // Create NEW Global
      try {
        const docRef = await adminDb.collection('anagrafica').add(globalData);
        anagraficaId = docRef.id;
      } catch (createErr) {
        console.error('[DB ANAGRAFICA CREATION ERROR]:', createErr);
        throw new Error(`Failed to create Anagrafica record: ${createErr.message}`);
      }
    }

    // 5. SAVE STRUCTURE DATA
    // We store this in 'anagrafica_data' collection
    // ID strategy: composite key or auto-id?
    // Let's use auto-id but query by anagraficaId + structureId
    let structureDataId = null;
    try {
      const structureDocRef = await adminDb.collection('anagrafica_data').add({
        anagraficaId,
        ...structureData
      });
      structureDataId = structureDocRef.id;
    } catch (err) {
      console.error("Error creating structure data", err);
      // If we just created the global doc, we might want to rollback?
      // For complexity, we skip rollback logic for now but log error.
      throw new Error("Generazione dati struttura fallita");
    }

    // 5b. CREATE HISTORY ENTRIES
    // Global history entry (if new record was created, not linked to existing)
    if (!existingDoc) {
      await createHistoryEntry({
        anagraficaId,
        changeType: 'create',
        changedGroups: ['anagrafica'],
        changes: {
          anagrafica: {
            before: null,
            after: globalData.anagrafica
          }
        },
        userUid,
        userMail,
        structureId
      });
    }

    // Structure history entry
    const structureGroups = ['nucleoFamiliare', 'legaleAbitativa', 'lavoroFormazione', 'vulnerabilita', 'referral'];
    const structureChangedGroups = [];
    const structureChanges = {};

    structureGroups.forEach(group => {
      if (structureData[group] && Object.keys(structureData[group]).length > 0) {
        structureChangedGroups.push(group);
        structureChanges[group] = {
          before: null,
          after: structureData[group]
        };
      }
    });

    if (structureChangedGroups.length > 0 && structureDataId) {
      await createHistoryEntry({
        anagraficaId,
        changeType: 'create',
        changedGroups: structureChangedGroups,
        changes: structureChanges,
        userUid,
        userMail,
        structureId,
        structureDataId
      });
    }


    // 6. SERVICES & FILE PROCESSING
    if (services && services.length > 0) {
      try {
        await createAccessInternal({
          anagraficaId,
          services,
          structureId: body.registeredByStructure,
          userUid,
          structureIds: globalData.structureIds,
        });
      } catch (err) {
        console.error("Error creating Acesso", err);
        return JSON.stringify({
          error: true,
          message: err.message
        }, null, 2);
      }
    }

    // 7. INVALIDATE CACHES
    // Invalidate for all involved structures
    const allStructures = existingDoc
      ? [...(existingDoc.data().canBeAccessedBy || []), structureId]
      : [structureId];

    invalidateAnagraficaCaches(anagraficaId, allStructures);

    // 8. AUDIT LOG
    await logDataCreate({
      actorUid: userUid,
      resourceType: 'anagrafica',
      resourceId: anagraficaId,
      structureId: body.registeredByStructure,
      details: {
        hasServices: services && services.length > 0,
        linkedToExisting: !!existingDoc
      }
    });

    return JSON.stringify({ id: anagraficaId });

  } catch (globalErr) {
    console.error('[CREATE_ANAGRAFICA FATAL]:', globalErr.stack);
    return JSON.stringify({
      error: true,
      message: globalErr.message
    }, null, 2);
  }
}

/**
 * Recupera l'anagrafica con caching (Server Action)
 * Permission check runs fresh on every call (not cached)
 */
export async function getAnagrafica(anagraficaId, structureId = null) {
  const { userUid } = await requireUser();
  const anagraficaData = await getAnagraficaInternal(anagraficaId, userUid, structureId);
  return JSON.stringify(anagraficaData);
}

/**
 * Update anagrafica (Server Action)
 */
export async function updateAnagrafica(anagraficaId, body, structureId) {
  const { userUid, headers: hdr } = await requireUser();
  const userMail = hdr.get('x-user-mail');
  const result = await updateAnagraficaInternal(anagraficaId, body, userUid, userMail, structureId);
  return JSON.stringify(result);
}

/**
 * Soft delete dell'anagrafica (Server Action)
 */
export async function deleteAnagrafica(anagraficaId) {
  const { userUid } = await requireUser();
  return await deleteAnagraficaInternal(anagraficaId, userUid);
}

/**
 * Soft delete anagrafica — admin-only.
 * Adds verifyStructureAdmin guard on top of the existing internal function.
 * Includes transaction guard to reject if record became shared after dialog opened.
 *
 * @param {string} anagraficaId
 * @param {string} structureId - The admin's current structure
 */
export async function deleteAnagraficaAsAdmin(anagraficaId, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });

    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);

    const allowedStructures = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(anagraficaRef);

      if (!snap.exists) {
        const e = new Error('Anagrafica non trovata');
        e.code = 'NOT_FOUND';
        throw e;
      }

      const data = snap.data();

      if (data.deletedAt) {
        const e = new Error('Scheda già eliminata');
        e.code = 'ALREADY_DELETED';
        throw e;
      }

      const canBeAccessedBy = data.canBeAccessedBy || [];

      // Guard: record became shared between dialog open and submit
      if (canBeAccessedBy.length > 1) {
        const e = new Error('La scheda è ora condivisa con altre strutture. Ricarica la pagina e usa "Rimuovi dalla struttura".');
        e.code = 'SHARED_RECORD';
        throw e;
      }

      transaction.update(anagraficaRef, {
        deletedAt: new Date(),
        deletedBy: userUid,
        deleted: true,
      });

      return canBeAccessedBy;
    });

    invalidateAnagraficaCaches(anagraficaId, allowedStructures);

    // Note: if logDataDelete throws, the Firestore write is already committed.
    // This is consistent with the pattern in deleteAnagraficaInternal.
    await logDataDelete({
      actorUid: userUid,
      resourceType: 'anagrafica',
      resourceId: anagraficaId,
      softDelete: true,
      details: { structureId },
    });

    return { success: true, message: 'Scheda eliminata con successo' };
  } catch (err) {
    console.error('[DELETE_ANAGRAFICA_AS_ADMIN]:', err);
    return { error: true, message: err.message };
  }
}

/**
 * Remove the current structure from a shared anagrafica.
 * Admin-only. Record stays accessible to other structures.
 * Also removes structureId from `structureIds` (kept in sync with canBeAccessedBy).
 * Cleans up anagrafica_data document for this structure.
 *
 * @param {string} anagraficaId
 * @param {string} structureId - Structure to remove
 */
export async function removeStructureFromAnagrafica(anagraficaId, structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });

    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);

    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(anagraficaRef);

      if (!snap.exists) {
        const e = new Error('Anagrafica non trovata');
        e.code = 'NOT_FOUND';
        throw e;
      }

      const data = snap.data();

      if (data.deletedAt) {
        const e = new Error('Anagrafica non trovata');
        e.code = 'NOT_FOUND';
        throw e;
      }
      const canBeAccessedBy = data.canBeAccessedBy || [];

      if (!canBeAccessedBy.includes(structureId)) {
        throw new Error('Struttura non associata a questa scheda');
      }

      // Guard: record became sole-owner between dialog open and submit
      if (canBeAccessedBy.length === 1) {
        const e = new Error("Sei l'unica struttura associata. Usa elimina definitiva.");
        e.code = 'LAST_STRUCTURE';
        throw e;
      }

      // IMPORTANT: FieldValue.arrayRemove() cannot be used inside a transaction.
      // Compute the filtered arrays from the transaction read and pass them directly.
      const updatedCanBeAccessedBy = canBeAccessedBy.filter((id) => id !== structureId);
      const updatedStructureIds = (data.structureIds || []).filter((id) => id !== structureId);

      transaction.update(anagraficaRef, {
        canBeAccessedBy: updatedCanBeAccessedBy,
        structureIds: updatedStructureIds,
      });
    });

    // Cleanup anagrafica_data — outside transaction, best-effort
    try {
      const dataQuery = await adminDb
        .collection('anagrafica_data')
        .where('anagraficaId', '==', anagraficaId)
        .where('structureId', '==', structureId)
        .limit(1)
        .get();

      if (!dataQuery.empty) {
        await dataQuery.docs[0].ref.delete();
      }
    } catch (cleanupErr) {
      console.error('[REMOVE_STRUCTURE_CLEANUP_ERROR]:', cleanupErr);
      // Non-fatal — log and continue
    }

    invalidateAnagraficaCaches(anagraficaId, [structureId]);

    // Note: if logDataDelete throws, the Firestore write is already committed.
    // This is consistent with the pattern in deleteAnagraficaInternal.
    await logDataDelete({
      actorUid: userUid,
      resourceType: 'anagrafica',
      resourceId: anagraficaId,
      softDelete: false,
      details: { action: 'removed_from_structure', structureId },
    });

    return { success: true, message: 'Struttura rimossa con successo' };
  } catch (err) {
    console.error('[REMOVE_STRUCTURE_FROM_ANAGRAFICA]:', err);
    return { error: true, message: err.message };
  }
}

/**
 * Share an anagrafica with additional structures.
 * User must be in the target structure OR the target structure must be in the same project
 * as the current structure.
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} currentStructureId - The current structure ID (for project context)
 * @param {string[]} targetStructureIds - Array of structure IDs to share with
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function shareAnagraficaWithStructures(anagraficaId, currentStructureId, targetStructureIds) {
  try {
    const { userUid } = await requireUser();

    if (!targetStructureIds || targetStructureIds.length === 0) {
      return { success: false, error: 'No structures selected' };
    }

    // Get anagrafica to verify access and get current canBeAccessedBy
    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      return { success: false, error: 'Anagrafica not found' };
    }

    const anagraficaData = anagraficaSnap.data();

    if (anagraficaData.deletedAt) {
      return { success: false, error: 'Anagrafica not found' };
    }

    // Verify user has access to this anagrafica
    const allowedStructures = anagraficaData.canBeAccessedBy || [];
    await verifyUserPermissions({ userUid, allowedStructures });

    // Get user data
    const operatorDoc = await adminDb.collection('operators').doc(userUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const operatorData = operatorDoc.data();
    const userStructureIds = operatorData.structureIds || [];
    const isSuperAdmin = operatorData.role === 'admin';

    // Get current structure's project
    let currentProjectId = null;
    if (currentStructureId) {
      const currentStructureDoc = await adminDb.collection('structures').doc(currentStructureId).get();
      if (currentStructureDoc.exists) {
        currentProjectId = currentStructureDoc.data().projectId;
      }
    }

    // Validate each target structure
    const validStructureIds = [];
    for (const structureId of targetStructureIds) {
      // Skip if already shared
      if (allowedStructures.includes(structureId)) {
        continue;
      }

      // Get target structure
      const targetStructureDoc = await adminDb.collection('structures').doc(structureId).get();
      if (!targetStructureDoc.exists) {
        continue; // Skip invalid structures
      }

      const targetStructureData = targetStructureDoc.data();

      // Check if user can share with this structure:
      // 1. User is in the target structure, OR
      // 2. Target structure is in the same project as current structure, OR
      // 3. User is super admin
      const userIsInTargetStructure = userStructureIds.includes(structureId);
      const sameProject = currentProjectId && targetStructureData.projectId === currentProjectId;

      if (isSuperAdmin || userIsInTargetStructure || sameProject) {
        validStructureIds.push(structureId);
      }
    }

    if (validStructureIds.length === 0) {
      return {
        success: false,
        error: 'No valid structures to share with. You can only share with structures you belong to or structures in the same project.'
      };
    }

    // Update the anagrafica with new structures
    const newCanBeAccessedBy = [...new Set([...allowedStructures, ...validStructureIds])];

    await anagraficaRef.update({
      canBeAccessedBy: newCanBeAccessedBy,
      structureIds: newCanBeAccessedBy, // Keep in sync
      updatedAt: new Date(),
      updatedBy: userUid
    });

    // Log the action
    await logResourceModification({
      actorUid: userUid,
      resourceType: 'anagrafica',
      resourceId: anagraficaId,
      action: 'share',
      details: {
        addedStructures: validStructureIds,
        totalStructures: newCanBeAccessedBy.length
      }
    });

    // Invalidate caches
    invalidateAnagraficaCaches(anagraficaId, newCanBeAccessedBy);

    logger.info('Shared anagrafica with structures', {
      anagraficaId,
      addedStructures: validStructureIds,
      actorUid: userUid
    });

    return { success: true, addedCount: validStructureIds.length };
  } catch (error) {
    logger.error('Error sharing anagrafica', error, { anagraficaId });
    return { success: false, error: error.message };
  }
}

/**
 * Get structures available for sharing an anagrafica.
 * Returns structures the user is in OR structures in the same project.
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} currentStructureId - The current structure ID (for project context)
 * @returns {Promise<{success: boolean, structures?: Array, error?: string}>}
 */
export async function getAvailableStructuresForSharing(anagraficaId, currentStructureId) {
  try {
    const { userUid } = await requireUser();

    // Get anagrafica to verify access and get current canBeAccessedBy
    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      return { success: false, error: 'Anagrafica not found' };
    }

    const anagraficaData = anagraficaSnap.data();
    const currentlySharedWith = anagraficaData.canBeAccessedBy || [];

    // Verify user has access
    await verifyUserPermissions({ userUid, allowedStructures: currentlySharedWith });

    // Get user data
    const operatorDoc = await adminDb.collection('operators').doc(userUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const operatorData = operatorDoc.data();
    const userStructureIds = operatorData.structureIds || [];
    const isSuperAdmin = operatorData.role === 'admin';

    // Get current structure's project
    let currentProjectId = null;
    let projectStructureIds = [];

    if (currentStructureId) {
      const currentStructureDoc = await adminDb.collection('structures').doc(currentStructureId).get();
      if (currentStructureDoc.exists) {
        currentProjectId = currentStructureDoc.data().projectId;

        // Get all structures in the same project
        if (currentProjectId) {
          const projectStructuresSnap = await adminDb.collection('structures')
            .where('projectId', '==', currentProjectId)
            .get();

          projectStructureIds = projectStructuresSnap.docs.map(doc => doc.id);
        }
      }
    }

    // Combine user structures and project structures
    const eligibleStructureIds = [...new Set([...userStructureIds, ...projectStructureIds])];

    // Filter out already shared structures
    const availableStructureIds = eligibleStructureIds.filter(
      id => !currentlySharedWith.includes(id)
    );

    if (availableStructureIds.length === 0) {
      return { success: true, structures: [] };
    }

    // Fetch structure details - batch in groups of 30 (Firestore limit)
    const structures = [];
    const batchSize = 30;

    for (let i = 0; i < availableStructureIds.length; i += batchSize) {
      const batch = availableStructureIds.slice(i, i + batchSize);
      const batchSnap = await adminDb.collection('structures')
        .where('__name__', 'in', batch)
        .get();

      for (const doc of batchSnap.docs) {
        const data = doc.data();
        structures.push({
          id: doc.id,
          name: data.name,
          city: data.city || '',
          projectId: data.projectId || null,
          isUserStructure: userStructureIds.includes(doc.id),
          isSameProject: projectStructureIds.includes(doc.id)
        });
      }
    }

    // Sort: user's structures first, then project structures
    structures.sort((a, b) => {
      if (a.isUserStructure && !b.isUserStructure) return -1;
      if (!a.isUserStructure && b.isUserStructure) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, structures: serializeFirestoreData(structures) };
  } catch (error) {
    logger.error('Error getting available structures for sharing', error, { anagraficaId });
    return { success: false, error: error.message };
  }
}
