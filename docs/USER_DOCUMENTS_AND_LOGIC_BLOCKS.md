# User Documents, Cards, Access Paths, and Logic Blocks

**Project:** GPC Progetto Casa  
**Created:** 2026-05-10  
**Scope:** Current implementation in `gpc-progetto-casa`, checked against the source documents in `doc in revisione/` and the implemented Next.js/Firebase code.

This document explains where user/guest information is registered, which UI card or document owns it, how an operator reaches it, and which backend logic stores or derives the data.

## Source Documents Reviewed

The repository contains the Progetto Casa source documents in `doc in revisione/`:

| Source document | Implemented area |
| --- | --- |
| `00_YAK_INDICE_ITEM_GESTIONALE.docx` | YAK item catalog in `src/lib/group-home/catalog.js` |
| `01_1_CASA_SCHEDA_CASA.docx` | `Scheda Casa`, route `/{structureId}/scheda-casa` |
| `01_2_CASA_ANALISI_APP.docx` | App/data architecture notes, especially YAK reporting |
| `02_1_OSPITE_PATTO_ACCOGLIENZA.docx` | `Patto di Accoglienza`, route `/{structureId}/anagrafica/{id}/patto` |
| `02_2_OSPITE_AUTOVALUTAZIONE.docx` | `Autovalutazione`, route `/{structureId}/anagrafica/{id}/autovalutazione` |
| `02_3_OSPITE_MONITORAGGIO.docx` | `Monitoraggio Individuale`, route `/{structureId}/anagrafica/{id}/monitoraggio` |
| `02_4_OSPITE_PROGETTO_PERSONALIZZATO.docx` | `Progetto Personalizzato`, route `/{structureId}/anagrafica/{id}/progetto-personalizzato` |
| `02_5_OSPITE_SCHEDA_INTERVENTO.docx` | `Diario Interventi`, route `/{structureId}/anagrafica/{id}/interventi` |
| `03_1_GRUPPO_DIARIO_GRUPPO.docx` | `Attivita di gruppo`, embedded on `/{structureId}` |
| `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` | Partially present as static commitments/rules; no dedicated editable card/page yet |
| `Struttura doc _ Gestionale.docx` | Overall document structure/reference |

## How Operators Access The Main Areas

| Area | Access path | Main component/action |
| --- | --- | --- |
| Structure home / Casa | Sidebar `Casa` or `/{structureId}` | `src/app/(portal)/[structureId]/page.jsx`, `HouseHomeClient` |
| Anagrafica list | Sidebar `Anagrafica` or `/{structureId}/anagrafica` | `AnagraficaTable` |
| New house guest | `/{structureId}/new` | `new/page.jsx`, `createRegistrationDraft` |
| Guest detail card | From anagrafica table or `/{structureId}/anagrafica/{id}` | `anagrafica/[id]/page.js` |
| Guest files | Guest detail `Opzioni` -> `File e documenti` | `anagrafica/[id]/files/page.js` |
| House documents | Sidebar `Documenti Casa` or `/{structureId}/documenti` | `documenti/page.js` |
| Patto, project, monitoring, interventions | Guest detail `Percorso persona` buttons or mobile action button | Group-home pages under `anagrafica/[id]/...` |
| Reminders, accessi, PDF, sharing | Guest detail `Opzioni` popover | `AnagraficaOptionsMenu` |
| Structure admin cards | Sidebar admin block, visible to structure admins | `/{structureId}/admin/...` |

## Card And Document Map

### 1. Nuovo Accesso Casa / Anagrafica

**Access:** `/{structureId}/new`  
**Primary data:** `anagrafica/{anagraficaId}` plus `anagrafica_data/{anagraficaId}__{structureId}`  
**Main files:** `src/app/(portal)/[structureId]/new/page.jsx`, `src/features/anagrafica/form/*`, `src/actions/anagrafica/*`

| UI card | Registered information | Stored in |
| --- | --- | --- |
| `Informazioni Anagrafiche` / personal info | surname, name, sex, birth date, birth place, citizenship, domicile municipality, phone, email | `anagrafica.anagrafica` |
| `Nucleo Familiare` | single/family, family type, number of minor children | `anagrafica_data.nucleoFamiliare` |
| `Situazione Legale e Abitativa` | legal status, housing status array | `anagrafica_data.legaleAbitativa` |
| `Lavoro e Formazione` | work status, education in origin country, education in Italy, Italian language level | `anagrafica_data.lavoroFormazione` |
| `Vulnerabilita e Prospettive` | vulnerability flags, intention to stay in Italy, destination country | `anagrafica_data.vulnerabilita` |
| `Come ci ha conosciuto` | referral source and custom referral text | `anagrafica_data.referral` |
| `Contesto Casa` | reference operator, assigned room/space, entry date, exit date, journey notes | `anagrafica_data.contestoCasa` |
| `Privacy` / registration completion | paper notice collected, signature date, reference, notes, signed file metadata | `anagrafica.privacy` |
| `Note Operatori` | internal notes visible to authorized operators | `anagrafica.internalNotes` |

Creation checks that a reference operator and entry date are present before saving. The server splits global identity data from structure-specific data and prevents automatic linking if another active record with the same fiscal code exists outside the current structure.

### 2. Scheda Persona

**Access:** `/{structureId}/anagrafica/{id}`  
**Primary data:** merged read from `anagrafica` and the current structure's `anagrafica_data`  
**Main file:** `src/app/(portal)/[structureId]/anagrafica/[id]/page.js`

| Card/section | Information shown or changed |
| --- | --- |
| `Informazioni Anagrafiche` | global identity fields: name, sex, date/place of birth, citizenship, domicile, phone, email |
| `Note Operatori` | edit/save internal operator notes through `updateAnagrafica` |
| `Altre Informazioni` accordion | family, legal/housing, work/training, vulnerabilities, referral, house context, registration/privacy metadata |
| `Promemoria` | upcoming/past reminders linked to the person and optionally to an access/file |
| `Accessi` | services registered for the person, with type, subcategories, classification, referral entity, notes, files, date, reminder, operator |
| `Storico` | merged history of anagrafica changes, accessi, reminders, and files |
| `Percorso persona` buttons | Patto, Progetto Personalizzato, Autovalutazione, Monitoraggio, Diario Interventi |
| `Opzioni` menu | edit card, file browser, complete registration if pending, reminder, PDF, access registration, sharing |

### 3. File E Documenti - Person

**Access:** `/{structureId}/anagrafica/{id}/files` through `Opzioni` -> `File e documenti`  
**Collections:** `files`, `folders`  
**Storage path:** `files/{anagraficaId}/...`  
**Main files:** `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js`, `src/actions/files/files.js`, `src/actions/files/folders.js`

Registered file metadata includes display name, original filename, MIME type, size, storage path, anagrafica ID, optional access ID, category, tags, expiration date, structure access fields, uploader metadata, soft-delete fields, last accessed date, and access count.

Folders are hierarchical. Default category folders are based on the historical categories: `DOCUMENT`, `IDENTITY`, `LEGAL`, `MEDICAL`, `EMPLOYMENT`, `EDUCATION`, `HOUSING`, `FINANCIAL`, `OTHER`.

### 4. Documenti Casa - Structure

**Access:** sidebar `Documenti Casa`, route `/{structureId}/documenti`  
**Collections:** `structureFiles`, `structureFolders`  
**Storage path:** `structure-files/{structureId}/...`  
**Main files:** `src/app/(portal)/[structureId]/documenti/page.js`, `src/actions/files/structure-files.js`, `src/actions/files/structure-folders.js`

This area stores house/structure-level documents that are not tied to a single guest. It supports folder creation, upload, move, delete, refresh, grid/list views, and signed URL downloads.

### 5. Scheda Casa

**Access:** structure home `Scheda casa` button or `/{structureId}/scheda-casa`  
**Collection/document:** `house_profiles/{structureId}`  
**Main files:** `src/app/(portal)/[structureId]/scheda-casa/page.jsx`, `HouseProfileManager`, `upsertHouseProfile`

| Card | Registered information |
| --- | --- |
| `Dati dell'abitazione` | address, operator name, compilation date, active residents |
| `Contratto di abitazione` | contract type, owner, rent/sublease holders, start/end date, deposit, monthly rent, payment method, due day, deadlines |
| `Sicurezza e utenze` | electrical switch, gas valve, water valve, water/electricity/gas counters, utility holders/vendors/customer codes/POD/PDR/service number, TARI, internet/phone, bill receiver/payer |
| `Spese ed elettrodomestici` | condominium costs, extraordinary expenses, cash fund, appliances, appliance ownership, presence/functioning, notes |
| `Manutenzione e spazi comuni` | boiler/conditioner technicians and contacts, next intervention, useful contacts, emergency reporting contact, common spaces, quiet hours, waste schedule, cleaning rules, final notes |

On save, the app also refreshes the current resident IDs from active anagrafica access to the structure.

### 6. Patto Di Accoglienza

**Access:** guest detail `Patto di Accoglienza`, route `/{structureId}/anagrafica/{id}/patto`  
**Collection:** `patti_accoglienza`  
**Main files:** `PattoAccoglienzaManager`, `createPattoEntry`, `updatePattoEntry`

| Section | Registered information |
| --- | --- |
| `0 - Prerequisiti per l'accoglienza` | accepts patto, accepts regulation, has documents, has income |
| `1 - Dati delle parti` | person name/contacts, service name/contacts, operator, destination house, start/end dates |
| `2 - Quota e modalita di pagamento` | required/agreed monthly quota, payment due day, payment method, custom method |
| `3 - Impegni nella convivenza` | notes about cohabitation duties |
| `4 - Relazione con vicinato` | neighborhood notes |
| `5 - Cura degli spazi` | space-care notes |
| `6 - Impegni del servizio` | static service commitments shown in the form |
| `7 - Firma del patto` | person/operator signature names and dates |

Patto is stored as a source document only. It does not currently create YAK evaluation rows.

### 7. Progetto Personalizzato

**Access:** guest detail `Progetto Personalizzato`, route `/{structureId}/anagrafica/{id}/progetto-personalizzato`  
**Primary document:** `personal_projects/{structureId}__{anagraficaId}`  
**Derived collection:** `objectives`  
**Main files:** `PersonalProjectManager`, `upsertPersonalProject`, `replaceObjectiveRows`

| Card | Registered information |
| --- | --- |
| `Dati identificativi` | guest name, operator, compilation date, planned review date |
| `Parte 1 - Osservazioni condivise` | observations by area: `PER`, `ABI`, `ECO`, `REL` |
| `Come mi sento` | strengths, difficulties, aspirations |
| `Documenti e dati essenziali` | documents owned, mother tongue, other languages, income types, average monthly income |
| `Parte 2 - Azioni condivise` | goals by area, linked YAK item IDs, timeframe, success indicators, other goals |
| `Condivisione e firma` | guest/operator signature names, shared date, next review date |

Saving the project rewrites derived rows in `objectives`, one per goal. Those rows support objective-level reporting by structure, person, status, area, and linked YAK items.

### 8. Autovalutazione

**Access:** guest detail `Autovalutazione`, route `/{structureId}/anagrafica/{id}/autovalutazione`  
**Collection:** `self_assessments`  
**Derived collection:** `yak_evaluations` with source `autovalutazione`  
**Main files:** `AssessmentEntryManager`, `createSelfAssessmentEntry`, `updateSelfAssessmentEntry`

| Card | Registered information |
| --- | --- |
| Header/metadata | operator, service, sequence number, compilation date, review date, previous date/reference date, general notes |
| `Dati essenziali` | documents owned, mother tongue, other languages, income types, average monthly income |
| `Uno sguardo d'insieme` | what the person feels strong in, wants to improve, needs help with |
| `Osservazioni qualitative` | qualitative fields shared with monitoraggio |
| `Valutazione sintetica e prossimi passi` | status, motivation, next actions, due dates, linked YAK items, sharing/signature fields |
| Area cards: `PER`, `ABI`, `ECO`, `REL` | one value/note per YAK item, using the person-facing scale `0`, `1`, `2`, `3`, `N/A` |

On save, the app deletes previous `yak_evaluations` rows for the same source entry and recreates one row per answered YAK item.

### 9. Monitoraggio Individuale

**Access:** guest detail `Monitoraggio Individuale`, route `/{structureId}/anagrafica/{id}/monitoraggio`  
**Collection:** `individual_monitorings`  
**Derived collection:** `yak_evaluations` with source `monitoraggio`  
**Main files:** `AssessmentEntryManager`, `createIndividualMonitoringEntry`, `updateIndividualMonitoringEntry`

Monitoraggio uses the same manager as Autovalutazione with operator-facing labels and the monitoring scale. It stores the same metadata, essential data, overview, qualitative notes, synthetic evaluation, next actions, signatures, and `PER/ABI/ECO/REL` item responses.

### 10. Diario Interventi

**Access:** guest detail `Diario Interventi`, route `/{structureId}/anagrafica/{id}/interventi`  
**Collection:** `interventions`  
**Derived collection:** `yak_evaluations` with source `intervento`  
**Main files:** `InterventionManager`, `createInterventionEntry`, `updateInterventionEntry`

Registered information includes intervention date, start time, duration, progressive number, operator, intervention type, location, people present, up to 3 touched YAK items with value/note, linked goals, diary/narrative, next steps for person and operator, equipe notes, and next appointment.

### 11. Attivita Di Gruppo

**Access:** structure home `Nuova attivita di gruppo` or collapsible `Attivita di gruppo` section on `/{structureId}`  
**Collection:** `group_activities`  
**Derived collection:** `yak_evaluations` with sources `attivita_gruppo` and `attivita_gruppo_individuale`  
**Main files:** `HouseHomeClient`, `GroupActivitiesManager`, `createGroupActivityEntry`, `updateGroupActivityEntry`

Registered information includes date/time, progressive number, operator, location, activity type, participants, activity description, group GRP responses, individual YAK items touched for participants, educator notes, next group commitments, next operator commitments, and next activity date.

### 12. Valutazioni Di Gruppo

**Access:** structure home `Nuova valutazione di gruppo` or collapsible `Valutazioni di gruppo` section on `/{structureId}`  
**Collection:** `group_evaluations`  
**Derived collection:** `yak_evaluations` with sources `valutazione_gruppo` and `autovalutazione_gruppo`  
**Main files:** `HouseHomeClient`, `GroupEvaluationsManager`, `createGroupEvaluationEntry`, `updateGroupEvaluationEntry`

Registered information includes evaluation date, operator/educator, period label, follow-up date, operator GRP responses, group self-responses, general progress, strengths, critical issues, synthetic evaluation, and agreed actions.

### 13. Accessi

**Access:** guest detail `Opzioni` -> `Registra accesso`; list appears in `Visualizza / Nascondi Accessi`  
**Collection:** `accessi`; uploaded files also create rows in `files`  
**Main files:** `AccessDialog`, `AccessServicesForm`, `src/actions/anagrafica/access.js`

Accessi register service-oriented work outside the Progetto Casa YAK source forms. Stored service data includes service type, subcategories, classification, referral entity, notes, files, reminder date, operator, and creation metadata.

Current service categories include legal, work, housing, education/training, health, administrative/fiscal, and social/segretariato services.

### 14. Promemoria

**Access:** guest detail `Opzioni` -> `Nuovo promemoria`; visible in `Promemoria` card  
**Collection:** `reminders`  
**Main files:** `ReminderDialog`, `AnagraficaReminders`, `src/actions/anagrafica/reminders.js`

Promemoria store date/time, service type, referral entity, note, optional linked access, optional file, and operator metadata. The UI separates upcoming and past reminders and highlights today/tomorrow/7-day urgency.

## YAK Item Catalog And Scoring

YAK item IDs are centralized in `src/lib/group-home/catalog.js`.

| Area | Meaning | Item range |
| --- | --- | --- |
| `PER` | personal care, health, language, emotional wellbeing, motivation | `PER-01` to `PER-09` |
| `ABI` | housing autonomy, shared spaces, appliances, meals, waste, cohabitation | `ABI-01` to `ABI-07` |
| `ECO` | money, bills, documents, work, punctuality, skills | `ECO-01` to `ECO-07` |
| `REL` | house relationships, operators, external network, mobility, services, territory | `REL-01` to `REL-06` |
| `GRP` | group collaboration, listening, conflict, rules, belonging | `GRP-01` to `GRP-05` |

Evaluation values are normalized into `yak_evaluations` as number `0` to `3`, with `isNotApplicable: true` and `value: null` for `N/A`.

## Logic Blocks

### Authentication And Authorization

- `src/middleware.js` verifies sessions and sends identity in request headers.
- `requireUser()` reads `x-user-uid` server-side.
- `verifyUserPermissions()` checks super admin, project access, structure access, or allowed structure intersection.
- `requireAnagraficaAccess()` checks record existence, soft deletion, allowed structures, and optional structure scope.
- Firestore client rules allow limited reads of own operator/project/structure context only; all other data operations go through Admin SDK server actions.
- Storage rules deny direct client read/write; files are accessed through signed URLs from server actions.

### Anagrafica Split Data Model

- Global identity data lives in `anagrafica`.
- Structure-specific situation data lives in `anagrafica_data`.
- The canonical structure data document ID is `{anagraficaId}__{structureId}`.
- Reads merge global and structure data for the current structure.
- Updates route field groups to the correct collection and create history entries.

### Progetto Casa Source Documents

- Source forms are kept as complete documents: `house_profiles`, `patti_accoglienza`, `personal_projects`, `self_assessments`, `individual_monitorings`, `interventions`, `group_activities`, `group_evaluations`.
- Input normalization happens in `src/actions/group-home.js` before write.
- Create/update uses scoped document guards when editing existing entries.
- `revalidateGroupHomePaths()` refreshes affected pages after writes.

### Derived Reporting Streams

- `yak_evaluations` is the long-format stream for item-level analysis.
- On update, rows for the same `sourceEntryId` are deleted and rebuilt.
- `objectives` is rebuilt from `personal_projects.goalsByArea`.
- Monitoring evidence helpers read `yak_evaluations` and build latest value, trajectory, touch count, and silent item data.

### File And Folder Management

- Person files: `files` and `folders`.
- Structure files: `structureFiles` and `structureFolders`.
- Uploads validate file size/type, write metadata to Firestore, and write binary data to Cloud Storage.
- Downloads use server-generated signed URLs.
- Folder operations use structure/anagrafica permission checks and soft delete semantics.

### History, Audit, And Cache

- Anagrafica changes are written to history entries.
- Accesses, reminders, and files are merged into the visible timeline.
- Audit utilities log create/read/update/delete/file access operations.
- Cache tags in `src/lib/cache.js` invalidate anagrafica, accessi, files, folders, structure files, users, and statistics as needed.

## Errors And Findings

### Tooling Results

Commands run on 2026-05-10:

| Command | Result |
| --- | --- |
| `npm run build` | Passed. Next.js compiled successfully and generated all listed routes. |
| `npm run lint` | Failed. Biome reported 10 errors and 2 warnings. |

### Biome Errors To Fix

| File | Finding |
| --- | --- |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | `rootFolders` is declared but unused. |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | Imports are not sorted and formatter would change the lucide import. |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | Three native `<button>` elements are missing explicit `type="button"`. |
| `src/components/Files/FileList/MobileFileList.jsx` | `cn` import is unused. |
| `src/components/Files/FileList/MobileFileList.jsx` | Two skeleton maps use array index keys. |
| `src/components/Files/FileList/MobileFileList.jsx` | Formatter would reflow several long JSX lines. |
| `src/components/Files/Breadcrumbs/FolderBreadcrumbs.jsx` | Imports are not sorted. |
| `src/components/Files/Breadcrumbs/FolderBreadcrumbs.jsx` | `useEffect` dependency list includes `breadcrumbs`, which Biome flags as unnecessary. |

The lint failures are concentrated in the mobile file browser and breadcrumb components. They do not currently block `next build`, but they should be corrected before a clean CI or formatting pass.

### Product / Documentation Gaps

| Area | Gap |
| --- | --- |
| `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` | No dedicated editable route or collection was found. Some rules/commitments appear in Patto and Scheda Casa, but the document is not represented as its own card. |
| `docs/YAK_FIRESTORE_ARCHITECTURE.md` | The `Current App Alignment` section is partially stale. The code now writes intervention YAK rows, does not write Patto YAK rows, creates `objectives`, and stores numeric YAK values with `isNotApplicable`. |
| `residencies` | The architecture doc recommends a residency history collection, but the implementation still mainly stores current house context in `anagrafica_data.contestoCasa`. Moves between houses are not first-class historical records yet. |
| YAK catalog persistence | The YAK catalog is hard-coded in `catalog.js`; there is no Firestore `yak_item_catalog` mirror yet. This is acceptable short term but limits external reporting/versioning. |
| Worktree state | The repository has many modified and new files. Treat the current state as an active working branch before committing or deploying. |

## Quick Operator Workflow

1. Select the house/structure from the structure switcher.
2. Open `Anagrafica` to search or create a guest.
3. Use `Nuovo Accesso Casa` to register the person and house context.
4. Open the guest detail card for normal profile data, files, reminders, accessi, and PDF/share actions.
5. Use `Percorso persona` for Patto, Progetto Personalizzato, Autovalutazione, Monitoraggio, and Diario Interventi.
6. Use the `Casa` page for Scheda Casa, Attivita di Gruppo, and Valutazioni di Gruppo.
7. Use `Documenti Casa` for files belonging to the house rather than one specific guest.
