/**
 * Unified database access utilities
 * Provides consistent patterns for accessing Firestore collections
 */

import admin from '@/lib/firebase/firebaseAdmin';
import { serializeFirestoreData } from '@/lib/utils';

const db = admin.firestore();

// Re-export for backward compatibility
export { serializeFirestoreData, serializeFirestoreData as serializeFirestoreDoc };

/**
 * Gets a user document, checking operators collection first, then users collection as fallback
 * This standardizes the dual-collection pattern used throughout the application
 * 
 * @param {string} userId - The UID of the user to fetch
 * @returns {Promise<{exists: boolean, data: Object|null, collection: string|null}>}
 */
export async function getUserDocument(userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    // Check operators collection first (primary)
    let userDoc = await db.collection('operators').doc(userId).get();

    if (userDoc.exists) {
        return {
            exists: true,
            data: { uid: userId, ...userDoc.data() },
            collection: 'operators'
        };
    }

    // Fallback to users collection
    userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
        return {
            exists: true,
            data: { uid: userId, ...userDoc.data() },
            collection: 'users'
        };
    }

    return {
        exists: false,
        data: null,
        collection: null
    };
}

/**
 * Checks if two arrays have any common elements
 * Useful for permission checking with structure IDs
 * 
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean} True if arrays have at least one common element
 */
export function arraysIntersect(a = [], b = []) {
    const set = new Set(a || []);
    return (b || []).some(x => set.has(x));
}


/**
 * Queries a Firestore collection for documents matching a list of IDs.
 * Handles Firestore's 30-item 'in' query limit by batching automatically.
 *
 * @param {FirebaseFirestore.CollectionReference} collectionRef
 * @param {string[]} ids
 * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot[]>}
 */
export async function queryDocumentsByIds(collectionRef, ids) {
    if (!ids || ids.length === 0) return [];
    const batchSize = 30;
    const results = await Promise.all(
        Array.from({ length: Math.ceil(ids.length / batchSize) }, (_, i) =>
            collectionRef.where('__name__', 'in', ids.slice(i * batchSize, (i + 1) * batchSize)).get()
        )
    );
    return results.flatMap(snapshot => snapshot.docs);
}

/**
 * Gets a Firestore collection reference
 * Centralizes collection name management
 */
export const collections = {
    operators: () => db.collection('operators'),
    users: () => db.collection('users'),
    projects: () => db.collection('projects'),
    structures: () => db.collection('structures'),
    anagrafica: () => db.collection('anagrafica'),
    auditLogs: () => db.collection('audit_logs'),
};
