# YAK Firestore Data Model Architecture

**Project:** GPC Progetto Casa  
**Source documents:** `doc in revisione/*.docx`  
**Created:** 2026-05-03

This document describes the recommended Firestore data model for the YAK Progetto Casa workflow and compares it with the current application shape. It is based on the review documents first, then checked against the app implementation.

## Goals

The data model must support three product needs:

1. Operational work: operators need to compile house sheets, guest agreements, personal projects, interventions, self-assessments, monitorings, and group diaries.
2. Longitudinal analysis: the system must show how each person, house, and item evolves over time.
3. Aggregated reporting: the system must extract cohorts by house, period, item, source, operator, and project.

The central design choice is to store completed forms as source documents and also write every scored item into a long-format `yak_evaluations` collection.

## Domain Concepts

| Concept | Meaning | Current app equivalent |
| --- | --- | --- |
| Project | Organizational container for one or more houses/structures. | `projects` |
| House / Structure | The concrete co-housing unit or apartment. | `structures`, plus `house_profiles` |
| Person / Guest | The welcomed person. | `anagrafica` |
| Residency | The relationship between a person and a house over time. | Mostly `anagrafica_data.contestoCasa` today |
| Source form | A complete operator-facing document, such as an intervention or monitoring. | `self_assessments`, `individual_monitorings`, `interventions`, etc. |
| YAK item | Stable item ID such as `PER-01`, `ABI-03`, `ECO-07`, `REL-05`, `GRP-02`. | Hard-coded in `src/lib/group-home/catalog.js` |
| Evaluation row | One scored observation for one item on one date from one source. | `yak_evaluations` |

## High-Level Collection Map

```txt
projects/{projectId}
structures/{structureId}
house_profiles/{structureId}

anagrafica/{anagraficaId}
anagrafica_data/{anagraficaId__structureId}
residencies/{residencyId}

patti_accoglienza/{pattoId}
personal_projects/{projectDocId}
objectives/{objectiveId}

self_assessments/{assessmentId}
individual_monitorings/{monitoringId}
interventions/{interventionId}
group_activities/{activityId}
group_evaluations/{evaluationId}

yak_item_catalog/{itemId}
yak_evaluations/{evaluationId}

files/{fileId}
folders/{folderId}
structureFiles/{fileId}
structureFolders/{folderId}
```

The current app already has most of these collections. The main recommended additions still open are `residencies` and optionally `yak_item_catalog`.

## Core Principle: Source Forms Plus Long Evaluations

Each compiled form remains stored as a full document. This preserves the operator narrative, signatures, context, and UI-specific fields.

Each scored item is also copied into `yak_evaluations`. This collection is the analytical stream. It allows the app to answer questions like:

- What is the latest value for `ABI-03` for this person?
- What changed during the last trimester?
- Which items were never touched in the period?
- How many interventions informed the next monitoring?
- What is the GRP trajectory of this house?

Do not replace source forms with `yak_evaluations`; use both.

## Recommended Collections

### `projects`

Organizational parent for houses.

```json
{
  "name": "Progetto Casa Torino",
  "description": "Percorso di co-housing e autonomia abitativa",
  "admins": ["operatorUid1"],
  "createdAt": "2026-05-03T10:00:00.000Z",
  "createdBy": "operatorUid1",
  "updatedAt": "2026-05-03T10:00:00.000Z",
  "updatedBy": "operatorUid1"
}
```

### `structures`

Represents the house or apartment in the multi-tenant system.

```json
{
  "projectId": "project_123",
  "name": "Casa Aurora",
  "address": "Via Roma 10",
  "city": "Torino",
  "phone": "",
  "email": "",
  "admins": ["operatorUid1"],
  "houseSetup": {
    "houseType": "Co-abitazione",
    "propertyOwner": "Ente proprietario",
    "rentContractHolder": "Associazione",
    "authorizedResidents": 4,
    "maxGuests": 4,
    "cohabitationType": "Condivisa",
    "hasCondominiumRules": true,
    "residencyAllowed": true,
    "domicileAllowed": true,
    "hospitalityAllowed": false,
    "technicalReferent": "Mario Rossi",
    "administrativeReferent": "Giulia Bianchi"
  },
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

Keep `structures` lightweight. Detailed technical house data belongs in `house_profiles`.

### `house_profiles`

One document per house. The document ID should be the `structureId`.

```json
{
  "structureId": "house_123",
  "address": "Via Roma 10",
  "operatorName": "Giulia Bianchi",
  "compiledAt": "2026-05-03T00:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z",
  "residentIds": ["person_1", "person_2"],
  "contract": {
    "type": "Affitto",
    "propertyOwner": "Ente proprietario",
    "rentContractHolder": "Associazione",
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2027-01-01T00:00:00.000Z",
    "depositAmount": 1200,
    "monthlyRent": 800,
    "paymentMethod": "Bonifico",
    "monthlyDueDay": "5"
  },
  "utilities": {
    "electricity": {
      "accountHolder": "Associazione",
      "vendorName": "Fornitore Energia",
      "customerCode": "ABC123",
      "pod": "IT001E..."
    },
    "gas": {
      "accountHolder": "Associazione",
      "vendorName": "Fornitore Gas",
      "customerCode": "GAS123",
      "pdr": "123456789"
    },
    "billReceiver": "Operatore",
    "billPayer": "Abitante"
  },
  "appliances": [
    {
      "name": "Lavatrice",
      "present": true,
      "functioning": true,
      "ownership": "Casa",
      "notes": ""
    }
  ],
  "commonAreas": {
    "wasteCollectionSchedule": "Lunedi e giovedi",
    "commonSpaces": ["Scale", "Cantina"],
    "quietHours": "22:00-07:00",
    "cleaningRules": "Turni settimanali"
  },
  "notes": "Note tecniche sulla casa"
}
```

### `anagrafica`

Global identity data for a person. Keep cross-structure personal identity here.

```json
{
  "anagrafica": {
    "nome": "Amina",
    "cognome": "Diallo",
    "dataNascita": "1992-03-15",
    "telefono": "+39..."
  },
  "canBeAccessedBy": ["house_123"],
  "structureIds": ["house_123"],
  "deleted": false,
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

### `anagrafica_data`

Structure-specific data for a person. Current app uses the document ID `{anagraficaId}__{structureId}`.

```json
{
  "anagraficaId": "person_1",
  "structureId": "house_123",
  "contestoCasa": {
    "dataIngresso": "2026-05-03",
    "dataUscita": "",
    "spazioAssegnato": "Stanza 2",
    "operatoreRiferimentoUid": "",
    "operatoreRiferimentoNome": "Equipe educativa",
    "figureOperative": [
      {
        "id": "figure-1",
        "ruolo": "EDU",
        "nome": "Giulia",
        "cognome": "Bianchi"
      },
      {
        "id": "figure-2",
        "ruolo": "AS",
        "nome": "Marco",
        "cognome": "Rossi"
      }
    ],
    "notePercorsoCasa": "Ingresso completato"
  },
  "status": "Active",
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

### `residencies`

Recommended addition. This makes house membership historical instead of only current-state.
The app now keeps changes to `contestoCasa`, including entry/exit dates and
operative figures, in `anagrafica_history`; a dedicated `residencies` collection
is still the recommended model for reporting moves as first-class records.

```json
{
  "projectId": "project_123",
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "startedAt": "2026-05-03T00:00:00.000Z",
  "endedAt": null,
  "roomOrSpace": "Stanza 2",
  "operatorUid": "operatorUid1",
  "operatorName": "Giulia Bianchi",
  "status": "active",
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

Use this when a person moves houses, leaves, returns, or has overlapping access history.

### `yak_item_catalog`

Recommended addition or generated mirror of the app catalog. Stable item IDs are the backbone of reporting.

```json
{
  "itemId": "ABI-03",
  "areaId": "ABI",
  "subjectType": "person",
  "operatorLabel": "Uso degli elettrodomestici",
  "personLabel": "Uso lavatrice, forno e fornelli in modo corretto e sicuro",
  "description": "Lavatrice, forno, fornelli - uso sicuro",
  "valueType": "scale_0_3_na",
  "active": true,
  "deprecatedAt": null,
  "version": 1
}
```

For group items:

```json
{
  "itemId": "GRP-02",
  "areaId": "GRP",
  "subjectType": "group",
  "operatorLabel": "Espressione e ascolto",
  "personLabel": "Riusciamo a parlare e ad ascoltarci a vicenda",
  "description": "Capacita di esprimere il proprio punto di vista e ascoltare gli altri",
  "valueType": "scale_0_3_na",
  "active": true,
  "version": 1
}
```

### `personal_projects`

Source document for the Progetto Personalizzato. Current app uses `{structureId}__{anagraficaId}` as ID.

```json
{
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "operatorName": "Giulia Bianchi",
  "compilationDate": "2026-05-03T00:00:00.000Z",
  "plannedReviewDate": "2026-08-03T00:00:00.000Z",
  "observationsSharedAt": "2026-05-03T00:00:00.000Z",
  "actionsSharedAt": "2026-07-03T00:00:00.000Z",
  "observations": {
    "PER": "Buona cura personale, fatica nella gestione sanitaria.",
    "ABI": "Deve consolidare turni e uso lavatrice.",
    "ECO": "Entrate presenti ma budget fragile.",
    "REL": "Rete territoriale limitata."
  },
  "facts": {
    "documentsOwned": ["Carta d'identita", "Tessera sanitaria"],
    "motherTongue": "Francese",
    "otherLanguages": "Italiano base",
    "incomeTypes": ["Sussidi / contributi"],
    "averageMonthlyIncome": 420
  },
  "goalsByArea": {
    "ABI": [
      {
        "goal": "Usare lavatrice e cucina in autonomia",
        "linkedItemIds": ["ABI-03", "ABI-04"],
        "timeframe": "2 mesi",
        "successIndicators": "Usa gli elettrodomestici senza supervisione"
      }
    ]
  }
}
```

### `objectives`

Recommended addition. The docs describe objectives as analytical records linked to item IDs. They should not only be embedded in `personal_projects`.

```json
{
  "projectId": "project_123",
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "personalProjectId": "house_123__person_1",
  "areaId": "ABI",
  "linkedItemIds": ["ABI-03", "ABI-04"],
  "text": "Usare lavatrice e cucina in autonomia",
  "timeframe": "2 mesi",
  "dueAt": "2026-07-03T00:00:00.000Z",
  "successIndicators": "Usa gli elettrodomestici senza supervisione",
  "status": "open",
  "definedAt": "2026-05-03T00:00:00.000Z",
  "verifiedAt": null,
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

### `self_assessments`

Source document for the person-guided self-assessment.

```json
{
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "operatorName": "Giulia Bianchi",
  "compiledAt": "2026-05-03T00:00:00.000Z",
  "reviewAt": "2026-08-03T00:00:00.000Z",
  "facts": {
    "documentsOwned": ["Carta d'identita"],
    "motherTongue": "Francese",
    "otherLanguages": "Italiano base",
    "incomeTypes": ["Sussidi / contributi"],
    "averageMonthlyIncome": 420
  },
  "responses": {
    "ABI-03": {
      "value": "1",
      "note": "Serve aiuto per lavatrice e forno"
    },
    "REL-05": {
      "value": "2",
      "note": "Sa usare alcuni servizi con accompagnamento"
    }
  },
  "selfOverview": {
    "strength": "Tiene pulita la stanza",
    "improve": "Gestione bollette",
    "help": "Accompagnamento al CAF"
  }
}
```

Saving this document should create one `yak_evaluations` row for each answered item.

### `individual_monitorings`

Source document for periodic operator monitoring.

```json
{
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "operatorName": "Giulia Bianchi",
  "compiledAt": "2026-08-03T00:00:00.000Z",
  "sequenceNumber": "1",
  "previousRecordedAt": "2026-05-03T00:00:00.000Z",
  "projectReferenceAt": "2026-05-03T00:00:00.000Z",
  "responses": {
    "ABI-03": {
      "value": "2",
      "note": "Usa la lavatrice con supporto occasionale"
    },
    "ECO-01": {
      "value": "1",
      "note": "Budget ancora fragile"
    }
  },
  "qualitative": {
    "andamento": "Percorso stabile con miglioramento abitativo.",
    "puntiDiForza": "Disponibilita e puntualita.",
    "criticita": "Gestione economica.",
    "eventiSignificativi": "Primo pagamento quota effettuato.",
    "relazioneProgetto": "Obiettivo ABI-03 in avanzamento."
  },
  "synthetic": {
    "status": "miglioramento",
    "motivation": "Progressi osservati su casa e routine"
  }
}
```

Saving this document should create `yak_evaluations` rows with `source = "monitoraggio"`.

### `interventions`

Source document for one individual meeting or action. The docs expect one to three touched items.

```json
{
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "operatorName": "Giulia Bianchi",
  "happenedAt": "2026-06-10T00:00:00.000Z",
  "startTime": "14:30",
  "durationMinutes": 60,
  "interventionNumber": "4",
  "interventionType": "A casa",
  "locationType": "Casa",
  "whoPresent": ["Operatrice da sola"],
  "items": [
    {
      "itemId": "ABI-03",
      "value": "2",
      "note": "Ha usato la lavatrice con una sola indicazione"
    }
  ],
  "linkedGoals": "Obiettivo ABI: gestione elettrodomestici",
  "diary": "Laboratorio pratico sull'uso della lavatrice.",
  "equipeNotes": "Valutare ripetizione tra due settimane.",
  "nextStepsPerson": "Fare un lavaggio in autonomia.",
  "nextStepsOperator": "Verificare esito al prossimo incontro."
}
```

Saving this document should create `yak_evaluations` rows with `source = "intervento"`.

### `group_activities`

Source document for one group activity.

```json
{
  "structureId": "house_123",
  "operatorName": "Giulia Bianchi",
  "happenedAt": "2026-06-15T00:00:00.000Z",
  "startTime": "18:00",
  "endTime": "19:30",
  "activityNumber": "3",
  "activityType": "Laboratorio di Autonomia",
  "locationType": "Casa/Appartamento",
  "participants": [
    {
      "anagraficaId": "person_1",
      "name": "Amina Diallo",
      "present": true,
      "participationNote": "Attiva"
    }
  ],
  "grpResponses": {
    "GRP-01": {
      "value": "2",
      "note": "Il gruppo si organizza con supporto"
    },
    "GRP-02": {
      "value": "2",
      "note": "Buon ascolto reciproco"
    }
  },
  "individualItems": [
    {
      "anagraficaId": "person_1",
      "name": "Amina Diallo",
      "itemId": "ABI-03",
      "value": "2",
      "note": "Ha partecipato al laboratorio lavatrice"
    }
  ],
  "description": "Laboratorio condiviso sull'uso della lavatrice.",
  "educatorNotes": "Buona collaborazione.",
  "nextCommitmentsGroup": "Ripetere i turni lavanderia.",
  "nextCommitmentsOperator": "Preparare schema turni."
}
```

Saving this document should create:

- GRP rows in `yak_evaluations` with `subjectType = "group"`.
- Individual rows in `yak_evaluations` with `subjectType = "person"`.

### `group_evaluations`

Source document for periodic house/group monitoring.

```json
{
  "structureId": "house_123",
  "operatorName": "Giulia Bianchi",
  "periodLabel": "Maggio-Luglio 2026",
  "evaluatedAt": "2026-08-01T00:00:00.000Z",
  "grpResponses": {
    "GRP-01": {
      "value": "2",
      "note": "Collaborazione in costruzione"
    },
    "GRP-03": {
      "value": "1",
      "note": "Conflitti ancora fragili"
    }
  },
  "groupSelfResponses": {
    "GRP-01": {
      "value": "2",
      "note": "Il gruppo riconosce miglioramenti"
    }
  },
  "puntiDiForza": "Partecipazione alle assemblee.",
  "criticalIssues": "Turni cucina non sempre rispettati.",
  "valutazioneSintetica": "stabilita",
  "agreedActions": "Rivedere turni e regole cucina.",
  "followUpAt": "2026-09-01T00:00:00.000Z"
}
```

### `yak_evaluations`

This is the most important analytical collection.

```json
{
  "projectId": "project_123",
  "structureId": "house_123",
  "anagraficaId": "person_1",
  "subjectType": "person",
  "itemId": "ABI-03",
  "areaId": "ABI",
  "source": "intervento",
  "sourceEntryId": "intervention_123",
  "recordedAt": "2026-06-10T00:00:00.000Z",
  "value": 2,
  "isNotApplicable": false,
  "note": "Ha usato la lavatrice con una sola indicazione",
  "operatorUid": "operatorUid1",
  "operatorName": "Giulia Bianchi",
  "active": true,
  "revision": 1,
  "superseded": false,
  "createdAt": "2026-06-10T15:40:00.000Z",
  "updatedAt": "2026-06-10T15:40:00.000Z"
}
```

For group rows:

```json
{
  "projectId": "project_123",
  "structureId": "house_123",
  "anagraficaId": null,
  "subjectType": "group",
  "itemId": "GRP-01",
  "areaId": "GRP",
  "source": "attivita_gruppo",
  "sourceEntryId": "activity_123",
  "recordedAt": "2026-06-15T00:00:00.000Z",
  "value": 2,
  "isNotApplicable": false,
  "note": "Il gruppo si organizza con supporto",
  "operatorUid": "operatorUid1",
  "operatorName": "Giulia Bianchi",
  "active": true,
  "revision": 1,
  "superseded": false,
  "createdAt": "2026-06-15T19:40:00.000Z",
  "updatedAt": "2026-06-15T19:40:00.000Z"
}
```

Recommended field rules:

| Field | Rule |
| --- | --- |
| `projectId` | Denormalize from the structure for project-level reporting. |
| `structureId` | Required for every row. |
| `anagraficaId` | Required for person rows, `null` for group rows. |
| `subjectType` | `person` or `group`. |
| `itemId` | Stable ID from the item catalog. |
| `areaId` | Denormalized prefix: `PER`, `ABI`, `ECO`, `REL`, `GRP`. |
| `source` | Use controlled values. See below. |
| `sourceEntryId` | ID of the source form document. |
| `recordedAt` | Domain date of the observation, not write time. |
| `value` | Number `0`, `1`, `2`, `3`, or `null` for N/A. |
| `isNotApplicable` | Boolean. Prefer this over storing `"na"` as value. |
| `active` | `true` for the latest revision used by reporting; `false` for preserved historical rows. |
| `revision` | Monotonic revision number for the same `sourceEntryId`. |
| `superseded` | `true` when a later save replaced this row as the current analytical value. |
| `supersededAt` | Timestamp set when the row is superseded. |

Recommended `source` values:

```txt
autovalutazione
monitoraggio
intervento
attivita_gruppo
attivita_gruppo_individuale
valutazione_gruppo
autovalutazione_gruppo
```

## Write Flows

### Self-assessment

```txt
create/update self_assessments/{id}
  -> mark previous active yak_evaluations where sourceEntryId == id as superseded
  -> create one yak_evaluations row per answered PER/ABI/ECO/REL item
```

### Individual monitoring

```txt
create/update individual_monitorings/{id}
  -> mark previous active yak_evaluations where sourceEntryId == id as superseded
  -> create one yak_evaluations row per answered PER/ABI/ECO/REL item
```

### Intervention

```txt
create/update interventions/{id}
  -> mark previous active yak_evaluations where sourceEntryId == id as superseded
  -> create one yak_evaluations row per touched item
```

### Group activity

```txt
create/update group_activities/{id}
  -> mark previous active yak_evaluations where sourceEntryId == id as superseded
  -> create GRP rows for observed group indicators
  -> create person rows for individual items touched during the activity
```

### Group evaluation

```txt
create/update group_evaluations/{id}
  -> mark previous active yak_evaluations where sourceEntryId == id as superseded
  -> create GRP rows for operator evaluation
  -> create GRP rows for group self-evaluation
```

## Monitoring Query Examples

### Latest value for a person and item

```js
db.collection("yak_evaluations")
  .where("structureId", "==", structureId)
  .where("anagraficaId", "==", anagraficaId)
  .where("itemId", "==", "ABI-03")
  .orderBy("recordedAt", "desc")
  .limit(1);
```

### Item trajectory during a period

```js
db.collection("yak_evaluations")
  .where("structureId", "==", structureId)
  .where("anagraficaId", "==", anagraficaId)
  .where("itemId", "==", "ABI-03")
  .where("recordedAt", ">=", periodStart)
  .where("recordedAt", "<=", periodEnd)
  .orderBy("recordedAt", "asc");
```

### Number of interventions touching an item in a period

```js
db.collection("yak_evaluations")
  .where("structureId", "==", structureId)
  .where("anagraficaId", "==", anagraficaId)
  .where("itemId", "==", "ABI-03")
  .where("source", "in", ["intervento", "attivita_gruppo_individuale"])
  .where("recordedAt", ">=", periodStart)
  .where("recordedAt", "<=", periodEnd);
```

### Group trajectory for a house

```js
db.collection("yak_evaluations")
  .where("structureId", "==", structureId)
  .where("subjectType", "==", "group")
  .where("itemId", "==", "GRP-02")
  .orderBy("recordedAt", "asc");
```

## Recommended Firestore Indexes

Add indexes for the access patterns above.

```json
{
  "indexes": [
    {
      "collectionGroup": "yak_evaluations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "structureId", "order": "ASCENDING" },
        { "fieldPath": "anagraficaId", "order": "ASCENDING" },
        { "fieldPath": "itemId", "order": "ASCENDING" },
        { "fieldPath": "recordedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "yak_evaluations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "structureId", "order": "ASCENDING" },
        { "fieldPath": "subjectType", "order": "ASCENDING" },
        { "fieldPath": "itemId", "order": "ASCENDING" },
        { "fieldPath": "recordedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "yak_evaluations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sourceEntryId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Firestore may request more indexes as reporting screens become richer. Add them from actual query errors when needed.

## Current App Alignment

The app already matches the proposed architecture in several important ways:

- Dedicated group-home collections exist in `src/actions/group-home.js`.
- Source forms are stored separately from analytical rows.
- `yak_evaluations` exists as the long-format evaluation stream.
- YAK rows preserve history: updating a source form supersedes previous active rows instead of deleting them.
- YAK item IDs are stable and centralized in `src/lib/group-home/catalog.js`.
- `house_profiles` uses `structureId` as the document ID, which is a good one-to-one pattern.
- `personal_projects` uses `{structureId}__{anagraficaId}`, which is practical for one active project per person per house.
- `personal_projects` also writes first-class `objectives` rows for goal reporting.
- `interventions`, `self_assessments`, `individual_monitorings`, `group_activities`, and `group_evaluations` all write derived YAK rows.
- Patto is correctly source-only today because it has no explicit scored YAK items.
- `yak_evaluations.value` is normalized to number/null with `isNotApplicable`.
- YAK-specific indexes are present in `firestore.indexes.json`.

Important remaining gaps:

1. The YAK item catalog is hard-coded. That is acceptable short term, but a Firestore mirror helps reporting, exports, and safe deprecation.
2. There is no dedicated `residencies` history collection. Current house context stores current data well but not full movement history.
3. The source document `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` is only partially represented through static rules/commitments; there is no dedicated editable source document or collection yet.
4. The app stores superseded YAK rows, but there is not yet a dedicated UI to inspect revision history for a single source form.

## Remaining Implementation Priorities

Recommended order:

1. Add `residencies` before supporting moves between houses as first-class history.
2. Add a Firestore-backed `yak_item_catalog` mirror if reporting/export/versioning needs stable catalog metadata outside the app bundle.
3. Decide whether `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` should become a first-class editable document.
4. Add a UI/read helper for YAK revision history if operators need to compare saved revisions of the same compiled form.

## Naming Conventions

Use collection names in English or established app names, but keep YAK source values and item IDs stable.

Recommended:

```txt
house_profiles
personal_projects
self_assessments
individual_monitorings
interventions
group_activities
group_evaluations
yak_evaluations
yak_item_catalog
objectives
residencies
```

Avoid renaming existing collections unless a migration is planned. The app already has useful names, so most work should be additive.

## Data Integrity Rules

- Never change the meaning of an existing YAK item ID.
- Never reuse deprecated item IDs.
- Soft-delete source forms if deletion is needed, and preserve derived `yak_evaluations` history by superseding old active rows instead of deleting them.
- Keep `sourceEntryId` mandatory for every derived evaluation row.
- Denormalize `projectId`, `structureId`, `areaId`, and `subjectType` into `yak_evaluations` for query speed.
- Treat `recordedAt` as the domain observation date. Use `createdAt` only for audit/write time.
- Prefer server actions or backend code for all writes so derived rows stay consistent.

## Summary

The best Firestore architecture is not a single giant document per person and not only normalized source tables. It is a two-layer model:

1. Source documents preserve the full professional and narrative record.
2. `yak_evaluations` provides the long-format analytical stream required by monitoring, trajectories, and reporting.

The current app is already close to this architecture. The most urgent correction is ensuring every source form that contains scored YAK items writes its derived evaluation rows consistently, especially interventions.
