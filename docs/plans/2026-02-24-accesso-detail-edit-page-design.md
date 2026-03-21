# Accesso Detail & Edit Page — Design

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Create a dedicated page to view and edit a single accesso (service access record) for an anagrafica. The page lives at a new route, follows the same server-first pattern as the anagrafica edit page, and includes full history tracking mirroring the anagrafica history system.

---

## Route

```
/{structureId}/anagrafica/{anagraficaId}/accessi/{accessId}
```

Entry point: a link icon added to each row in `AccessInfo.jsx`.

---

## User Flow

1. User clicks the link icon on an accesso row in the anagrafica detail page.
2. A dedicated page loads showing all services in the accesso (read-only view).
3. User clicks **"Modifica"** — the page switches to edit mode using the existing `AccessServicesForm`, pre-populated with the current data.
4. User edits services (subcategories, notes, files, reminders, classification, referral entity).
5. User clicks **"Salva"** — changes are persisted, a history entry is written, caches are invalidated, and the page returns to view mode with a success toast.
6. A **history timeline** at the bottom of the page shows all past changes to the accesso.

---

## Architecture

```
Server (page.js)
  ├── getAccessByIdAction(accessId, anagraficaId)   ← new
  └── passes data → <AccessDetailClient />

<AccessDetailClient /> (client component)
  ├── view mode:  read-only display of all services + file download/delete
  ├── edit mode:  <AccessServicesForm /> pre-populated via useAccessForm(categories, initialData)
  │     └── save → updateAccessAction({ accessId, anagraficaId, services, structureId })  ← new
  └── bottom:     <AccessHistoryTimeline accessId={accessId} anagraficaId={anagraficaId} />  ← new
```

---

## Data Model Changes

### New Firestore subcollection: `accessi/{accessId}/history`

Same structure as `anagrafica/{id}/history`:

```js
{
  anagraficaId: string,        // for cross-referencing
  changedAt: Timestamp,
  changedBy: string,           // userUid
  changedByMail: string,
  changedByStructure: string,
  changeType: "create" | "update",
  changedGroups: ["services"],
  changes: {
    services: {
      before: Array | null,    // null on create
      after: Array             // new services array
    }
  }
}
```

---

## New Server Actions (`src/actions/anagrafica/access.js`)

### `getAccessByIdAction(accessId, anagraficaId)`
- Fetch the single accesso document by ID.
- Verify permission via the parent anagrafica's `canBeAccessedBy`.
- Audit log: `logDataAccess` for `'accessi'`.
- Return the full document (serialized JSON).

### `updateAccessAction({ accessId, anagraficaId, services, structureId })`
- Read the current accesso document (capture `before` snapshot).
- Process new services: upload new files (same logic as `createAccessInternal`), soft-delete removed files from the `files` collection.
- Write updated `services[]` array to the accesso document.
- Write history entry to `accessi/{accessId}/history` with `changeType: "update"`, before/after.
- Invalidate caches: `invalidateAccessiCache(anagraficaId)` + `invalidateFilesCache(anagraficaId)`.
- Audit log: `logDataUpdate` for `'accessi'`.

### `getAccessHistoryAction(accessId, anagraficaId)`
- Verify permission via the parent anagrafica.
- Fetch `accessi/{accessId}/history` ordered by `changedAt desc`.
- Return serialized entries.

### History write in `createAccessInternal` (modify existing)
- After saving the accesso document, write a history entry with `changeType: "create"`, `before: null`, `after: processedServices`.

---

## Hook Changes (`src/hooks/useAccessForm.js`)

Add optional `initialData` parameter:

```js
export function useAccessForm(categories = null, initialData = null)
```

When `initialData` is provided (array of existing services), a mapper converts it into the tab-keyed form state:

```
services[{ tipoAccesso: "Legale", sottoCategorie: [...], note: "...", files: [...] }]
→
{ "Legale": { subCategories: [...], content: "...", existingFiles: [...], newFiles: [], ... } }
```

**Key distinction**: existing files (`existingFiles`) are kept separate from new uploads (`newFiles`) so `updateAccessAction` can tell them apart:
- `existingFiles` — files already in storage; can be individually marked for deletion.
- `newFiles` — files to be uploaded on save.

---

## New Components

### `src/components/Anagrafica/AccessDetailClient.jsx`
Client component that manages the view/edit toggle. In view mode renders a read-only service list with file download/delete. In edit mode renders `<AccessServicesForm />` pre-populated. Calls `updateAccessAction` on save.

### `src/components/Anagrafica/AccessHistoryTimeline.jsx`
Similar to `HistoryTimeline.jsx` but fetches from `getAccessHistoryAction`. Renders a collapsible timeline showing date, operator, structure, change type, and a before/after services diff.

---

## Modified Components

### `src/components/Anagrafica/AccessInfo.jsx`
Add a link icon (`ExternalLink` from lucide-react) on each row that navigates to `/{structureId}/anagrafica/{anagraficaId}/accessi/{accessId}`.

---

## File Handling in Edit Mode

### Existing files (per service)
- Displayed as a list with **download** (calls `getAccessFileUrl`) and **delete** buttons.
- Delete marks the file in local state (`markedForDeletion: true`).
- On save: soft-delete the `files` collection document (`deleted: true`) for each marked file.

### New files
- Added via the existing `Dropzone` component.
- Processed on save identically to `createAccessInternal` (validate, upload to Storage, create `files` collection document).

---

## Files to Create / Modify

| Action | File |
|--------|------|
| **Create** | `src/app/(portal)/[structureId]/anagrafica/[id]/accessi/[accessId]/page.js` |
| **Create** | `src/components/Anagrafica/AccessDetailClient.jsx` |
| **Create** | `src/components/Anagrafica/AccessHistoryTimeline.jsx` |
| **Modify** | `src/actions/anagrafica/access.js` |
| **Modify** | `src/hooks/useAccessForm.js` |
| **Modify** | `src/components/Anagrafica/AccessInfo.jsx` |

---

## Security & Consistency

- All server actions use `requireUser()` + `verifyUserPermissions()` with the anagrafica's `canBeAccessedBy` — never cached.
- File upload validation (size, MIME type, magic number) reused from `createAccessInternal`.
- Storage paths reuse the existing `files/{anagraficaId}/accessi/{accessId}/...` structure.
- History writes use graceful failure (same pattern as `createHistoryEntry` — errors logged but don't break the main operation).
- Cache invalidation uses existing `invalidateAccessiCache` + `invalidateFilesCache`.
