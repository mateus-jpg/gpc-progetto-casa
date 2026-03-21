# Safe Delete Anagrafica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only safe delete action to the anagrafica list table, with a type-to-confirm dialog and context-aware behaviour (remove-from-structure vs full soft-delete).

**Architecture:** Four changes in dependency order: (1) add two new server actions, (2) create the confirmation dialog component, (3) replace the row actions in AnagraficaTable with a DropdownMenu that opens the dialog, (4) resolve admin status in the page server component and pass it down. No new routes or data schemas needed.

**Tech Stack:** Next.js 14 App Router, Firebase Admin SDK (Firestore), React, shadcn/ui (AlertDialog, DropdownMenu, Input, Button), sonner (toasts), lucide-react icons, `useRouter` for post-delete refresh.

**Spec:** `docs/superpowers/specs/2026-03-21-safe-delete-anagrafica-design.md`

---

## File Map

| Action | File |
|---|---|
| Modify | `src/actions/anagrafica/anagrafica.js` |
| Create | `src/components/Anagrafica/DeleteAnagraficaDialog.jsx` |
| Modify | `src/app/(portal)/[structureId]/anagrafica/AnagraficaTable.js` |
| Modify | `src/app/(portal)/[structureId]/anagrafica/page.js` |

---

## Task 1: Add server actions — `deleteAnagraficaAsAdmin` and `removeStructureFromAnagrafica`

**Files:**
- Modify: `src/actions/anagrafica/anagrafica.js`

### Context
`anagrafica.js` already imports `admin` (Firebase Admin SDK), `requireUser`, `verifyUserPermissions`, `invalidateAnagraficaCaches`, `logDataDelete`. You need to also import `verifyStructureAdmin` from `@/utils/server-auth`. Add both new exported functions after the existing `deleteAnagrafica` function (line ~719).

- [ ] **Step 1: Add `verifyStructureAdmin` to the existing `@/utils/server-auth` import (line 5)**

Current import (line 5):
```js
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
```
Change to (extend the same line — do NOT add a second import line):
```js
import { requireUser, verifyUserPermissions, verifyStructureAdmin } from '@/utils/server-auth';
```

- [ ] **Step 2: Add `deleteAnagraficaAsAdmin` after the existing `deleteAnagrafica` function**

```js
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
```

- [ ] **Step 3: Add `removeStructureFromAnagrafica` immediately after `deleteAnagraficaAsAdmin`**

```js
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

      if (!snap.exists || snap.data().deletedAt) {
        const e = new Error('Anagrafica non trovata');
        e.code = 'NOT_FOUND';
        throw e;
      }

      const data = snap.data();
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
```

- [ ] **Step 4: Verify lint passes**

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run lint
```
Expected: no errors in `anagrafica.js`.

- [ ] **Step 5: Commit**

```bash
git add src/actions/anagrafica/anagrafica.js
git commit -m "feat: add deleteAnagraficaAsAdmin and removeStructureFromAnagrafica server actions"
```

---

## Task 2: Create `DeleteAnagraficaDialog` component

**Files:**
- Create: `src/components/Anagrafica/DeleteAnagraficaDialog.jsx`

### Context
This is a shadcn/ui `AlertDialog` with a controlled text input. The dialog receives the full anagrafica row (flattened), derives whether the record is shared, and calls the appropriate server action. Both actions return plain `{ success, message }` or `{ error, message }` objects — no `JSON.parse` needed. On success it calls `onSuccess()` which will trigger `router.refresh()` in the parent.

The shadcn AlertDialog does not have a default "confirm" action button wired to close — use a plain `<Button>` in the footer instead of `<AlertDialogAction>` so you control the disabled/loading state manually.

- [ ] **Step 1: Create the file**

```jsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteAnagraficaAsAdmin,
  removeStructureFromAnagrafica,
} from '@/actions/anagrafica/anagrafica';

/**
 * Safe delete dialog for anagrafica records.
 *
 * - If canBeAccessedBy.length > 1 → removes current structure only
 * - If canBeAccessedBy.length === 1 → soft-deletes the full record
 *
 * Requires typing "ELIMINA" to unlock the confirm button.
 * Admin-only — the server actions enforce this independently.
 *
 * @param {boolean} open
 * @param {(open: boolean) => void} onOpenChange
 * @param {{ id: string, nome: string, cognome: string, canBeAccessedBy: string[] }} anagrafica
 * @param {string} structureId
 * @param {() => void} onSuccess - called after successful delete; parent should call router.refresh()
 */
export default function DeleteAnagraficaDialog({
  open,
  onOpenChange,
  anagrafica,
  structureId,
  onSuccess,
}) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!anagrafica) return null;

  const isShared = (anagrafica.canBeAccessedBy || []).length > 1;
  const fullName = `${anagrafica.nome || ''} ${anagrafica.cognome || ''}`.trim();
  const isConfirmed = confirmText === 'ELIMINA';

  const handleOpenChange = (next) => {
    if (!next) setConfirmText('');
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      const result = isShared
        ? await removeStructureFromAnagrafica(anagrafica.id, structureId)
        : await deleteAnagraficaAsAdmin(anagrafica.id, structureId);

      if (result.error) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      handleOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Errore durante l'operazione");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isShared ? 'Rimuovi dalla struttura' : 'Elimina scheda'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isShared
              ? 'Questa scheda è condivisa con altre strutture. Verrà rimossa solo dalla tua struttura e rimarrà accessibile alle altre.'
              : `Questa operazione è irreversibile. La scheda di ${fullName} verrà eliminata definitivamente.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm-input">
            Digita <strong>ELIMINA</strong> per confermare
          </Label>
          <Input
            id="delete-confirm-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINA"
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isShared ? 'Rimuovi' : 'Elimina'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run lint
```
Expected: no errors in `DeleteAnagraficaDialog.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Anagrafica/DeleteAnagraficaDialog.jsx
git commit -m "feat: add DeleteAnagraficaDialog component with type-to-confirm"
```

---

## Task 3: Update `AnagraficaTable.js` — replace row actions with DropdownMenu

**Files:**
- Modify: `src/app/(portal)/[structureId]/anagrafica/AnagraficaTable.js`

### Context
The current `renderRowActions` renders a `<div>` with a `<Link>` (View) and a `<HousePlus>` icon (unused placeholder). Replace this entirely with a shadcn DropdownMenu. The `HousePlus` icon is dropped.

The component needs:
- `isAdmin: boolean` prop (new)
- `deleteTarget` state to track which row opened the dialog
- `useRouter` for `router.refresh()` after delete
- `DeleteAnagraficaDialog` rendered once outside the table, controlled by `deleteTarget`

**Prop flattening:** The row data shape has `row.original.anagrafica.nome` and `row.original.anagrafica.cognome` — these must be flattened when setting `deleteTarget`. `canBeAccessedBy` is at `row.original.canBeAccessedBy`.

- [ ] **Step 1: Update imports**

At the top of `AnagraficaTable.js`, make these changes:

Remove from the lucide-react import: `HousePlus`
Add to the lucide-react import: `MoreVertical`, `Trash2`

Add new imports:
```js
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteAnagraficaDialog from '@/components/Anagrafica/DeleteAnagraficaDialog';
```

- [ ] **Step 2: Add `isAdmin` prop and new state/hooks inside the component**

The component currently starts with:
```js
export function AnagraficaTable({ rows, structureId }) {
```

Change to:
```js
export function AnagraficaTable({ rows, structureId, isAdmin = false }) {
```

After the existing `const [isExporting, setIsExporting] = useState(false);` line, add:
```js
const [deleteTarget, setDeleteTarget] = useState(null);
const router = useRouter();
```

- [ ] **Step 3: Replace `renderRowActions`**

Find the current `renderRowActions` block:
```jsx
renderRowActions={({ row }) => (
  <div className="flex gap-2 flex-row justify-around items-center ">
    <Link
      href={`/${structureId}/anagrafica/${row.original.id}`}
    >
      <View className="size-4" />
    </Link>
    <HousePlus className="size-4" />
  </div>
)}
```

Replace with:
```jsx
renderRowActions={({ row }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild>
        <Link href={`/${structureId}/anagrafica/${row.original.id}`}>
          <View className="mr-2 h-4 w-4" />
          Visualizza
        </Link>
      </DropdownMenuItem>
      {isAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() =>
              setDeleteTarget({
                id: row.original.id,
                nome: row.original.anagrafica?.nome || '',
                cognome: row.original.anagrafica?.cognome || '',
                canBeAccessedBy: row.original.canBeAccessedBy || [],
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Elimina
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

- [ ] **Step 4: Render the dialog once, outside the table**

In the return statement, just before the closing `</div>` of the component, add:
```jsx
<DeleteAnagraficaDialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteTarget(null);
  }}
  anagrafica={deleteTarget}
  structureId={structureId}
  onSuccess={() => {
    setDeleteTarget(null);
    router.refresh();
  }}
/>
```

- [ ] **Step 5: Verify lint passes**

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(portal\)/\[structureId\]/anagrafica/AnagraficaTable.js
git commit -m "feat: replace row actions with DropdownMenu, wire DeleteAnagraficaDialog"
```

---

## Task 4: Update `page.js` — resolve `isAdmin` server-side

**Files:**
- Modify: `src/app/(portal)/[structureId]/anagrafica/page.js`

### Context
`page.js` is a Next.js server component (no `'use client'`). It already imports `getData`. It needs to call `requireUser()` and `verifyStructureAdmin()` to determine if the current user is a structure admin. Both can throw — wrap in try/catch, default `isAdmin = false`. A `console.error` inside the catch makes silent failures observable in server logs.

`verifyStructureAdmin` requires `{ userUid, structureId }`. `requireUser()` returns `{ userUid, headers }`.

- [ ] **Step 1: Replace the full file contents**

```js
import { getData } from './data';
import { AnagraficaTable } from './AnagraficaTable';
import { requireUser, verifyStructureAdmin } from '@/utils/server-auth';

export default async function AnagraficaPage({ params }) {
  const { structureId } = await params;

  const rows = await getData(structureId);
  const data = JSON.parse(rows);

  let isAdmin = false;
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });
    isAdmin = true;
  } catch (err) {
    console.error('[ANAGRAFICA_PAGE] isAdmin check failed:', err);
  }

  return (
    <div className="p-4">
      <AnagraficaTable rows={data} structureId={structureId} isAdmin={isAdmin} />
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + build**

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run lint && npm run build
```
Expected: clean lint, successful build with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(portal\)/\[structureId\]/anagrafica/page.js
git commit -m "feat: resolve isAdmin server-side and pass to AnagraficaTable"
```

---

## Manual Verification Checklist

After all tasks are complete, verify in the browser with `npm run dev`:

- [ ] **Non-admin user:** open the anagrafica list — the ⋮ menu shows only "Visualizza", no "Elimina" item
- [ ] **Admin user — sole-owner record:** click ⋮ → Elimina → dialog title is "Elimina scheda" → confirm button disabled until typing "ELIMINA" exactly → after confirm the row disappears from the table
- [ ] **Admin user — shared record:** click ⋮ → Elimina → dialog title is "Rimuovi dalla struttura" → same type-to-confirm behaviour → record removed from table (still accessible in other structures)
- [ ] **Error path:** test with a stale tab (delete via another browser tab first) → second delete shows error toast, does not crash
- [ ] **Cancel:** open dialog, type something, click Annulla → dialog closes, input is cleared, no action performed
