/**
 * Utility functions for anagrafica operations
 * These are NOT server actions - they are pure utility functions
 */

// Define the group fields that we track for history
export const ANAGRAFICA_GROUPS = [
  "anagrafica",
  "internalNotes",
  "privacy",
  "nucleoFamiliare",
  "legaleAbitativa",
  "lavoroFormazione",
  "vulnerabilita",
  "referral",
  "contestoCasa",
];

// Personal/identity fields stored flat in the 'anagrafica' Firestore collection
// These get wrapped under an 'anagrafica' key when returned to the client
export const ANAGRAFICA_PERSONAL_FIELDS = [
  "nome",
  "cognome",
  "sesso",
  "dataDiNascita",
  "luogoDiNascita",
  "codiceFiscale",
  "cittadinanza",
  "comuneDiDomicilio",
  "telefono",
  "email",
];

/**
 * Wraps flat personal fields from a Firestore anagrafica document
 * into a nested { anagrafica: {...}, ...rest } structure.
 * @param {Object} flatDoc - Flat Firestore document data (with id)
 * @returns {Object} Document with personal fields nested under 'anagrafica' key
 */
export function wrapPersonalFields(flatDoc) {
  const anagraficaData = {};
  const rest = {};

  for (const [key, value] of Object.entries(flatDoc)) {
    if (ANAGRAFICA_PERSONAL_FIELDS.includes(key)) {
      anagraficaData[key] = value;
    } else {
      rest[key] = value;
    }
  }

  return { ...rest, anagrafica: anagraficaData };
}

/**
 * Compute which groups have changed between old and new data
 * @param {Object} oldData - Previous anagrafica data
 * @param {Object} newData - New data being applied
 * @returns {Object} Object with changedGroups array and changes object
 */
export function computeGroupChanges(oldData, newData) {
  const changedGroups = [];
  const changes = {};

  for (const group of ANAGRAFICA_GROUPS) {
    const oldGroup = oldData[group];
    const newGroup = newData[group];

    // Skip if newGroup is not being updated
    if (newGroup === undefined) continue;

    // Check if the group has changed
    const oldJson = JSON.stringify(oldGroup || {});
    const newJson = JSON.stringify(newGroup || {});

    if (oldJson !== newJson) {
      changedGroups.push(group);
      changes[group] = {
        before: oldGroup || null,
        after: newGroup || null,
      };
    }
  }

  return { changedGroups, changes };
}
