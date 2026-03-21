# Safe Delete Anagrafica — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Add a safe delete action to the anagrafica list table. Only structure admins can delete. The delete is context-aware: if the record is shared with other structures, the action removes the current structure from the record without destroying it; if the current structure is the sole owner, the record is soft-deleted entirely. A type-to-confirm dialog ("ELIMINA") prevents accidental deletions.

---

## Behaviour

### Who can delete
- Delete is **admin-only**. The ⋮ menu's delete item is hidden for non-admin users.
- Admin status is resolved server-side in `AnagraficaPage` via `verifyStructureAdmin()` (which also passes for super-admins with role `'admin'`), wrapped in a try/catch — if either `requireUser()` or `verifyStructureAdmin()` throws (including Firestore errors), `isAdmin = false`. This silent failure mode is acceptable; a `console.error` should be added inside the catch for observability.
- `isAdmin` is passed as a prop to `AnagraficaTable`. This is a **UX convenience only, not a security boundary**.
- Both server actions independently call `verifyStructureAdmin()` as the first authorization step.

### Context-aware action — server-side branching
The client selects which action to call based on the `canBeAccessedBy` length from the serialized page data. Both server actions re-verify authoritative state inside a Firestore transaction to handle stale client data:

| Client condition | Action called | Server behaviour |
|---|---|---|
| `canBeAccessedBy.length > 1` | `removeStructureFromAnagrafica` | Transaction re-reads doc; if still `> 1` removes structure; if now `=== 1` returns `LAST_STRUCTURE` error |
| `canBeAccessedBy.length === 1` | `deleteAnagraficaAsAdmin` | Transaction re-reads doc; if `canBeAccessedBy.length > 1` (became shared), returns `SHARED_RECORD` error; otherwise soft-deletes |

> **Note on `structureIds` sync:** `canBeAccessedBy` and `structureIds` are always kept in sync. Any operation that removes from `canBeAccessedBy` must also remove from `structureIds` in the same transaction.

### Existing `deleteAnagrafica` action
The existing `deleteAnagrafica` public action has no admin check — it is an authenticated-user operation used internally. It is **not deprecated** by this feature but must not be wired up to any new UI. The new `deleteAnagraficaAsAdmin` is the admin-gated entry point for the delete table action.

### Confirmation dialog
Both paths use the same dialog with context-aware copy. The confirm button is disabled until the input value is exactly `"ELIMINA"`.

**Shared record (`canBeAccessedBy.length > 1`):**
- Title: "Rimuovi dalla struttura"
- Body: "Questa scheda è condivisa con altre strutture. Verrà rimossa solo dalla tua struttura e rimarrà accessibile alle altre."

**Sole owner (`canBeAccessedBy.length === 1`):**
- Title: "Elimina scheda"
- Body: "Questa operazione è irreversibile. La scheda di **[Nome Cognome]** verrà eliminata definitivamente."

---

## Components

### New: `DeleteAnagraficaDialog`
**Location:** `src/components/Anagrafica/DeleteAnagraficaDialog.jsx`

Props:
```
open: boolean
onOpenChange: (open: boolean) => void
anagrafica: { id: string, nome: string, cognome: string, canBeAccessedBy: string[] }
structureId: string
onSuccess: () => void
```

> **Prop flattening:** In `AnagraficaTable`, name data lives at `row.original.anagrafica.nome` / `row.original.anagrafica.cognome`. When setting `deleteTarget`, the table must flatten: `{ id: row.original.id, nome: row.original.anagrafica.nome, cognome: row.original.anagrafica.cognome, canBeAccessedBy: row.original.canBeAccessedBy }`.

Behaviour:
- Derives `isShared = anagrafica.canBeAccessedBy.length > 1` to select copy and action
- Controlled text input; confirm button disabled until value === `"ELIMINA"`
- Calls `deleteAnagraficaAsAdmin(anagraficaId, structureId)` or `removeStructureFromAnagrafica(anagraficaId, structureId)` accordingly
- Shows spinner on confirm button during the async call
- Both actions return plain objects `{ success: true, message }` or `{ error: true, message }` — parse as-is (no `JSON.parse`)
- On success: calls `onSuccess()`, closes dialog, shows success toast
- On error (including `LAST_STRUCTURE`, `SHARED_RECORD`): shows toast with the server-returned message; does not close dialog

### Updated: `AnagraficaTable.js`
- Imports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from shadcn/ui
- Imports `useRouter` from `next/navigation`
- **Replaces** the current `renderRowActions` block (bare `<div>` with `<Link>` + non-functional `<HousePlus>`) entirely with a single ⋮ `DropdownMenu` per row
- The `HousePlus` placeholder is **dropped** — it has no implementation and is not part of this feature
- Menu items: **Visualizza** (existing link behaviour) + separator + **Elimina** (destructive styling, admin-only)
- State: `const [deleteTarget, setDeleteTarget] = useState(null)` — shape: `{ id, nome, cognome, canBeAccessedBy }` (flattened)
- `onSuccess` callback: `router.refresh()` to re-run the server component and remove the deleted/unshared row from the table
- Accepts new `isAdmin: boolean` prop

### Updated: `page.js` (AnagraficaPage)
```js
import { requireUser, verifyStructureAdmin } from '@/utils/server-auth';

let isAdmin = false;
try {
  const { userUid } = await requireUser();
  await verifyStructureAdmin({ userUid, structureId });
  isAdmin = true;
} catch (err) {
  console.error('[ANAGRAFICA_PAGE] isAdmin check failed:', err);
  isAdmin = false;
}
```
Passes `isAdmin` and `structureId` to `AnagraficaTable`.

---

## Server Actions

Both actions live in `src/actions/anagrafica/anagrafica.js`. Both return plain objects (not JSON-stringified), consistent with the existing `deleteAnagrafica` / `deleteAnagraficaInternal` pattern. Read actions in this file use `JSON.stringify`; mutation actions do not.

### `deleteAnagraficaAsAdmin` (new)
```
1. requireUser() → userUid
2. verifyStructureAdmin({ userUid, structureId }) — throws if not admin
3. Firestore transaction:
   a. Read anagrafica doc → throw NOT_FOUND if missing or already deleted
   b. If canBeAccessedBy.length > 1 → throw SHARED_RECORD error
      (record became shared after dialog was opened)
   c. Soft-delete: set { deleted: true, deletedAt: now, deletedBy: userUid }
4. invalidateAnagraficaCaches(anagraficaId, canBeAccessedBy)
5. Audit log via logDataDelete({ softDelete: true, ... })
6. Return { success: true, message: 'Scheda eliminata con successo' }
```

> Note: `deleteAnagraficaInternal` internally calls `verifyUserPermissions` (a weaker membership check). Since `verifyStructureAdmin` was already called above, this secondary check will pass for admins. The double-check is harmless but expected.

### `removeStructureFromAnagrafica` (new)
```
1. requireUser() → userUid
2. verifyStructureAdmin({ userUid, structureId }) — throws if not admin
3. Firestore transaction:
   a. Read anagrafica doc → throw NOT_FOUND if missing or deleted
   b. Verify structureId is in canBeAccessedBy → throw if not
   c. If canBeAccessedBy.length === 1 → throw LAST_STRUCTURE error
   d. arrayRemove structureId from canBeAccessedBy
   e. arrayRemove structureId from structureIds  ← keeps both fields in sync
4. Outside transaction — cleanup anagrafica_data:
   Query anagrafica_data where anagraficaId == anagraficaId AND structureId == structureId
   If found → hard delete the document
   If not found → skip silently (older records may not have this doc)
5. invalidateAnagraficaCaches(anagraficaId, [structureId])
6. Audit log via logDataDelete({ softDelete: false, details: { action: 'removed_from_structure', structureId } })
7. Return { success: true, message: 'Struttura rimossa con successo' }
```

---

## Data flow

```
AnagraficaPage (server)
  ├─ getData(structureId)                   → rows[]
  ├─ requireUser + verifyStructureAdmin     → isAdmin: boolean
  └─ <AnagraficaTable rows isAdmin structureId />
        ├─ deleteTarget: { id, nome, cognome, canBeAccessedBy } | null
        └─ ⋮ DropdownMenu (per row)
              └─ Elimina [admin only]
                    → setDeleteTarget(flattenedRow)
                    └─ <DeleteAnagraficaDialog anagrafica={deleteTarget} structureId />
                          ├─ isShared → removeStructureFromAnagrafica(id, structureId)
                          └─ sole owner → deleteAnagraficaAsAdmin(id, structureId)
                                └─ onSuccess → router.refresh()
```

---

## Error handling

| Scenario | Server response | UI behaviour |
|---|---|---|
| Unauthenticated | throws | Toast with message |
| Not admin | throws | Toast with message |
| Record not found / already deleted | `NOT_FOUND` / `ALREADY_DELETED` | Toast with message |
| `structureId` not in `canBeAccessedBy` | error | Toast with message |
| Record became sole-owner (LAST_STRUCTURE) | `{ error: true, message }` | Toast: "Sei l'unica struttura. Usa elimina definitiva." |
| Record became shared (SHARED_RECORD) | `{ error: true, message }` | Toast: "La scheda è ora condivisa. Ricarica la pagina." |
| Network / unknown error | caught → generic message | Generic toast |

---

## Out of scope

- Bulk delete (select multiple rows)
- Hard delete / restore from deleted state
- Non-admin delete paths
- HousePlus / add housing feature (dropped from row actions)
