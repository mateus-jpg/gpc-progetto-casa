# Accesso Detail & Edit Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a dedicated page at `/{structureId}/anagrafica/{anagraficaId}/accessi/{accessId}` that lets operators view, edit (with full file management), and review history of a single accesso record.

**Architecture:** Server component fetches the accesso and passes it to a client component that handles view/edit toggle. Edit mode pre-populates the existing `AccessServicesForm` via a new `initialData` param on the `useAccessForm` hook. All mutations write a history entry to `accessi/{accessId}/history` (same schema as anagrafica history), invalidate caches, and show a success toast — no post-dialog. Rich-text notes are displayed using the existing `stripHtml` utility (same pattern as `AccessInfo.jsx` which uses `sanitizedNote`).

**Tech Stack:** Next.js 14 App Router, Firebase Admin SDK, shadcn/ui, Tailwind CSS, Sonner (toasts), Lucide React icons, `@tabler/icons-react`.

---

## Task 1: Add `getAccessByIdAction` server action

**Files:**
- Modify: `src/actions/anagrafica/access.js`

### Step 1: Add the action at the bottom of `access.js`

```js
/**
 * Get a single accesso record by ID.
 * Verifies the calling user has permission via the parent anagrafica.
 */
export async function getAccessByIdAction(accessId, anagraficaId) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId) throw new Error('Missing parameters');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  await verifyUserPermissions({ userUid, allowedStructures });

  const accessSnap = await adminDb.collection('accessi').doc(accessId).get();
  if (!accessSnap.exists) throw new Error('Accesso not found');

  const data = accessSnap.data();
  if (data.anagraficaId !== anagraficaId) throw new Error('Access record does not belong to this anagrafica');

  await logDataAccess({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    details: { anagraficaId }
  });

  return JSON.stringify({ id: accessSnap.id, ...data });
}
```

### Step 2: Verify the build compiles

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
```
Expected: no errors referencing `access.js`.

### Step 3: Commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc
git add src/actions/anagrafica/access.js
git commit -m "feat(accessi): add getAccessByIdAction server action"
```

---

## Task 2: Add history write to `createAccessInternal`

**Files:**
- Modify: `src/actions/anagrafica/access.js`

The accesso history uses subcollection `accessi/{accessId}/history`. Schema mirrors anagrafica history exactly.

### Step 1: Add the history write inside `createAccessInternal`, just before the `invalidateAccessiCache` call

Find this line in `createAccessInternal`:
```js
  // Invalidate caches after creating new access
  invalidateAccessiCache(anagraficaId);
```

Insert the following block immediately before it:
```js
  // Write history entry for creation (graceful failure — does not break main flow)
  try {
    await adminDb.collection('accessi').doc(accessId).collection('history').add({
      anagraficaId,
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: null,
      changedByStructure: structureId,
      changeType: 'create',
      changedGroups: ['services'],
      changes: {
        services: { before: null, after: processedServices }
      }
    });
  } catch (histErr) {
    console.error('Failed to write accesso history (create):', histErr);
  }
```

### Step 2: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/actions/anagrafica/access.js
git commit -m "feat(accessi): write history entry on access creation"
```

---

## Task 3: Add `updateAccessAction` server action

**Files:**
- Modify: `src/actions/anagrafica/access.js`

### Step 1: Ensure `logDataUpdate` is imported at the top of `access.js`

The existing import line is:
```js
import { logDataCreate, logDataAccess, logFileAccess } from '@/utils/audit';
```
Change it to:
```js
import { logDataCreate, logDataAccess, logFileAccess, logDataUpdate } from '@/utils/audit';
```

### Step 2: Add `updateAccessAction` at the bottom of `access.js`

Services payload items contain:
- `existingFiles`: already-stored file metadata to keep (not deleted)
- `deletedFilePaths`: storage paths of files to soft-delete
- `files`: new file objects with `base64`, `name`, `type`, `size`

```js
/**
 * Update an existing accesso record.
 * Handles uploading new files, soft-deleting removed files, and writing history.
 */
export async function updateAccessAction({ accessId, anagraficaId, services, structureId }) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId || !services) throw new Error('Missing required fields');

  // Permission check via parent anagrafica
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  // Load current doc for before-snapshot
  const accessRef = adminDb.collection('accessi').doc(accessId);
  const accessSnap = await accessRef.get();
  if (!accessSnap.exists) throw new Error('Accesso not found');

  const currentData = accessSnap.data();
  if (currentData.anagraficaId !== anagraficaId) throw new Error('Access record does not belong to this anagrafica');

  const beforeServices = currentData.services || [];
  const existingStructureIds = currentData.structureIds || allowedStructures;

  // Soft-delete files marked for removal from the files collection
  const allDeletedPaths = services.flatMap(svc => svc.deletedFilePaths || []);
  for (const filePath of allDeletedPaths) {
    const filesQuery = await adminDb.collection('files')
      .where('path', '==', filePath)
      .where('anagraficaId', '==', anagraficaId)
      .limit(1)
      .get();
    if (!filesQuery.empty) {
      await filesQuery.docs[0].ref.update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userUid
      });
    }
  }

  // Process each service: keep existing files, upload new files
  const processedServices = await Promise.all(services.map(async (svc, index) => {
    // Find or create target folder (same logic as createAccessInternal)
    let targetFolderName = svc.tipoAccesso || 'Documenti';
    let targetFolder = null;
    try {
      const folderQuery = await adminDb.collection('folders')
        .where('anagraficaId', '==', anagraficaId)
        .where('nome', '==', targetFolderName)
        .where('deleted', '==', false)
        .limit(1)
        .get();
      if (!folderQuery.empty) {
        targetFolder = { id: folderQuery.docs[0].id, ...folderQuery.docs[0].data() };
      } else {
        const newFolderResult = await createFolderInternal({
          anagraficaId,
          nome: targetFolderName,
          parentFolderId: null,
          structureId,
          userUid,
          userEmail: null
        });
        if (newFolderResult.success) targetFolder = newFolderResult.folder;
      }
    } catch (err) {
      console.error('Error finding/creating folder on update:', err);
    }
    const targetFolderId = targetFolder?.id || null;

    // Kept existing files (not deleted)
    const keptFiles = (svc.existingFiles || []).filter(
      f => !(svc.deletedFilePaths || []).includes(f.path)
    );

    // Upload new files (same validation as createAccessInternal)
    const newlyUploadedFiles = [];
    for (const fileItem of (svc.files || [])) {
      let buffer;
      let originalName = fileItem.name;
      let mimeType = fileItem.type;
      let size = fileItem.size;

      if (fileItem.base64) {
        const matches = fileItem.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(fileItem.base64, 'base64');
        }
      }
      if (!buffer) continue;

      if (buffer.length > FILE_SIZE_LIMIT) throw new Error(`File ${originalName} exceeds size limit`);
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Error(`File type ${mimeType} not allowed`);
      if (!validateFileSignature(buffer, mimeType)) throw new Error(`File ${originalName} content does not match type`);

      const fileExt = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
      const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${randomUUID()}${fileExt}`;

      const fileRef = adminStorage.bucket().file(storagePath);
      await fileRef.save(buffer, { contentType: mimeType, resumable: false });

      const fileMetadata = {
        nome: fileItem.name || originalName,
        nomeOriginale: originalName,
        tipo: mimeType,
        dimensione: size,
        path: storagePath,
        dataCreazione: fileItem.creationDate ? new Date(fileItem.creationDate).toISOString() : new Date().toISOString(),
        dataScadenza: fileItem.expirationDate ? new Date(fileItem.expirationDate).toISOString() : null,
      };
      newlyUploadedFiles.push(fileMetadata);

      if (targetFolderId) {
        const fileDocRef = adminDb.collection('files').doc();
        await fileDocRef.set({
          nome: fileMetadata.nome,
          nomeOriginale: fileMetadata.nomeOriginale,
          tipo: fileMetadata.tipo,
          dimensione: fileMetadata.dimensione,
          path: fileMetadata.path,
          anagraficaId,
          folderId: targetFolderId,
          accessoId: accessId,
          category: targetFolder?.category || null,
          tags: [],
          dataDocumento: fileItem.creationDate ? new Date(fileItem.creationDate) : new Date(),
          dataCreazione: new Date(),
          dataScadenza: fileItem.expirationDate ? new Date(fileItem.expirationDate) : null,
          structureIds: existingStructureIds,
          uploadedByStructure: structureId,
          uploadedBy: userUid,
          uploadedByEmail: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          deletedAt: null,
          deletedBy: null,
          lastAccessedAt: null,
          accessCount: 0
        });
      }
    }

    return {
      tipoAccesso: svc.tipoAccesso || null,
      sottoCategorie: svc.sottoCategorie ?? null,
      altro: svc.altro ?? null,
      note: svc.note?.trim() || null,
      classificazione: svc.classificazione ?? null,
      enteRiferimento: svc.enteRiferimento ?? null,
      files: [...keptFiles, ...newlyUploadedFiles],
      reminderDate: svc.reminderDate ?? null,
      reminderId: svc.reminderId ?? null,
    };
  }));

  // Persist the update
  await accessRef.update({
    services: processedServices,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
    updatedByStructure: structureId,
  });

  // Write history entry (graceful failure)
  try {
    await accessRef.collection('history').add({
      anagraficaId,
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: null,
      changedByStructure: structureId,
      changeType: 'update',
      changedGroups: ['services'],
      changes: {
        services: { before: beforeServices, after: processedServices }
      }
    });
  } catch (histErr) {
    console.error('Failed to write accesso history (update):', histErr);
  }

  invalidateAccessiCache(anagraficaId);
  invalidateFilesCache(anagraficaId);

  await logDataUpdate({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    structureId,
    changedFields: ['services'],
    details: { anagraficaId }
  });

  return { success: true, accessId };
}
```

### Step 3: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/actions/anagrafica/access.js
git commit -m "feat(accessi): add updateAccessAction with file management and history"
```

---

## Task 4: Add `getAccessHistoryAction` server action

**Files:**
- Modify: `src/actions/anagrafica/access.js`

### Step 1: Add at the bottom of `access.js`

```js
/**
 * Get history entries for a single accesso record.
 */
export async function getAccessHistoryAction(accessId, anagraficaId) {
  const { userUid } = await requireUser();

  if (!accessId || !anagraficaId) throw new Error('Missing parameters');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  const historySnap = await adminDb
    .collection('accessi')
    .doc(accessId)
    .collection('history')
    .orderBy('changedAt', 'desc')
    .limit(50)
    .get();

  const entries = historySnap.docs.map(doc => {
    const data = doc.data();
    const changedAt = data.changedAt?.toDate?.() || new Date(data.changedAt);
    return {
      id: doc.id,
      ...JSON.parse(JSON.stringify(data)),
      changedAt: changedAt instanceof Date ? changedAt.toISOString() : changedAt
    };
  });

  return JSON.stringify({ entries });
}
```

### Step 2: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/actions/anagrafica/access.js
git commit -m "feat(accessi): add getAccessHistoryAction"
```

---

## Task 5: Extend `useAccessForm` hook with `initialData` support

**Files:**
- Modify: `src/hooks/useAccessForm.js`

### Step 1: Replace the full file with the extended version

Key additions:
1. `initialData` parameter — array of existing service objects from Firestore
2. `mapInitialDataToState()` — converts `services[]` into the tab-keyed form state
3. `existingFiles` and `deletedFilePaths` per service type slot
4. `markFileForDeletion(typeVal, filePath)` helper exported from the hook

```js
import { useState, useCallback, useMemo, useEffect } from 'react';
import { AccessTypes as DefaultAccessTypes } from '@/components/Anagrafica/AccessDialog/AccessTypes';
import { convertFileToBase64 } from '@/utils/fileUtils';

function createBlankTypeState() {
    return {
        subCategories: [],
        altroText: "",
        content: "",           // rich-text notes (HTML)
        files: [],             // new files to upload
        existingFiles: [],     // files already in storage
        deletedFilePaths: [],  // storage paths marked for deletion on save
        classification: "",
        referralEntity: "",
        reminderDate: null,
        reminderTime: "",
    };
}

function createInitialState(categories) {
    return (categories || DefaultAccessTypes).reduce((acc, type) => {
        acc[type.value] = createBlankTypeState();
        return acc;
    }, {});
}

/**
 * Map existing services array (from Firestore) into the tab-keyed form state.
 * tipoAccesso is stored as the label string (e.g. "Legale"), matched against category labels.
 */
function mapInitialDataToState(categories, initialData) {
    const state = createInitialState(categories);

    for (const svc of (initialData || [])) {
        const matchedType = (categories || DefaultAccessTypes).find(
            t => t.label === svc.tipoAccesso || t.value === svc.tipoAccesso
        );
        if (!matchedType) continue;

        state[matchedType.value] = {
            subCategories: Array.isArray(svc.sottoCategorie)
                ? svc.sottoCategorie
                : svc.sottoCategorie ? [svc.sottoCategorie] : [],
            altroText: svc.altro || "",
            content: svc.note || "",
            files: [],
            existingFiles: Array.isArray(svc.files) ? svc.files : [],
            deletedFilePaths: [],
            classification: svc.classificazione || "",
            referralEntity: svc.enteRiferimento || "",
            reminderDate: svc.reminderDate ? new Date(svc.reminderDate) : null,
            reminderTime: svc.reminderDate
                ? new Date(svc.reminderDate).toTimeString().slice(0, 5)
                : "",
        };
    }

    return state;
}

export function useAccessForm(categories = null, initialData = null) {
    const accessTypes = useMemo(() => {
        return categories && categories.length > 0 ? categories : DefaultAccessTypes;
    }, [categories]);

    const [accessState, setAccessState] = useState(() =>
        initialData && initialData.length > 0
            ? mapInitialDataToState(accessTypes, initialData)
            : createInitialState(accessTypes)
    );

    // Add slots for newly added category types (e.g. after a custom subcategory is added)
    useEffect(() => {
        setAccessState((prevState) => {
            const newState = { ...prevState };
            let hasChanges = false;
            for (const type of accessTypes) {
                if (!newState[type.value]) {
                    newState[type.value] = createBlankTypeState();
                    hasChanges = true;
                }
            }
            return hasChanges ? newState : prevState;
        });
    }, [accessTypes]);

    const updateAccessField = useCallback((typeVal, field, value) => {
        setAccessState((prev) => ({
            ...prev,
            [typeVal]: { ...prev[typeVal], [field]: value },
        }));
    }, []);

    /** Mark an existing file for deletion on next save. Removes it from existingFiles immediately. */
    const markFileForDeletion = useCallback((typeVal, filePath) => {
        setAccessState((prev) => {
            const current = prev[typeVal];
            if (!current) return prev;
            return {
                ...prev,
                [typeVal]: {
                    ...current,
                    deletedFilePaths: [...current.deletedFilePaths, filePath],
                    existingFiles: current.existingFiles.filter(f => f.path !== filePath),
                }
            };
        });
    }, []);

    const resetAccessForm = useCallback(() => {
        setAccessState(
            initialData && initialData.length > 0
                ? mapInitialDataToState(accessTypes, initialData)
                : createInitialState(accessTypes)
        );
    }, [accessTypes, initialData]);

    const isAccessTypeValid = useCallback((typeVal) => {
        const s = accessState[typeVal];
        if (!s) return false;
        if (s.subCategories.length > 0) {
            if (s.subCategories.includes("Altro") && !s.altroText.trim()) return false;
            return true;
        }
        return false;
    }, [accessState]);

    const getValidAccessTypes = useCallback(() => {
        return accessTypes.filter((t) => isAccessTypeValid(t.value));
    }, [accessTypes, isAccessTypeValid]);

    const prepareAccessPayload = useCallback(async () => {
        const validTypes = getValidAccessTypes();
        return await Promise.all(validTypes.map(async (type) => {
            const state = accessState[type.value];
            const cleanedState = { tipoAccesso: type.label };

            if (state.subCategories.length > 0) cleanedState.sottoCategorie = state.subCategories;
            if (state.subCategories.includes("Altro") && state.altroText.trim())
                cleanedState.altro = state.altroText.trim();
            if (state.content.trim()) cleanedState.note = state.content.trim();
            if (state.classification) cleanedState.classificazione = state.classification;
            if (state.referralEntity) cleanedState.enteRiferimento = state.referralEntity;

            // Pass existing files and deletion list to the server action
            cleanedState.existingFiles = state.existingFiles || [];
            cleanedState.deletedFilePaths = state.deletedFilePaths || [];

            // New files to upload
            if (state.files.length > 0) {
                cleanedState.files = await Promise.all(state.files.map(async (f) => {
                    const base64 = await convertFileToBase64(f.file);
                    return {
                        name: f.name,
                        creationDate: f.creationDate instanceof Date ? f.creationDate.toISOString() : f.creationDate,
                        expirationDate: f.expirationDate instanceof Date ? f.expirationDate.toISOString() : f.expirationDate,
                        base64,
                        type: f.file.type,
                        size: f.file.size
                    };
                }));
            } else {
                cleanedState.files = [];
            }

            if (state.reminderDate) {
                const date = new Date(state.reminderDate);
                if (state.reminderTime) {
                    const [hours, minutes] = state.reminderTime.split(':');
                    date.setHours(parseInt(hours), parseInt(minutes));
                }
                cleanedState.reminderDate = date.toISOString();
            }

            return cleanedState;
        }));
    }, [accessState, getValidAccessTypes]);

    return {
        accessState,
        updateAccessField,
        markFileForDeletion,
        resetAccessForm,
        isAccessTypeValid,
        getValidAccessTypes,
        prepareAccessPayload
    };
}
```

### Step 2: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/hooks/useAccessForm.js
git commit -m "feat(accessi): extend useAccessForm with initialData and file deletion support"
```

---

## Task 6: Create `AccessHistoryTimeline` component

**Files:**
- Create: `src/components/Anagrafica/AccessHistoryTimeline.jsx`

Notes are displayed as plain text (via `stripHtml`) — never rendered as raw HTML.

### Step 1: Create the file

```jsx
"use client";

import React, { useState, useEffect } from "react";
import { getAccessHistoryAction } from "@/actions/anagrafica/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IconChevronDown, IconChevronRight, IconHistory } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { stripHtml } from "@/utils/htmlSanitizer";

function formatValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.map(v => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ServiceDiff({ before, after }) {
  const beforeServices = before || [];
  const afterServices = after || [];

  return (
    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
      <div>
        <p className="font-medium text-xs text-muted-foreground uppercase mb-2">Prima</p>
        {beforeServices.length === 0 ? (
          <p className="text-muted-foreground italic text-xs">Nessun servizio</p>
        ) : (
          beforeServices.map((svc, i) => (
            <div key={i} className="bg-red-50 border border-red-200 rounded p-2 mb-2">
              <p className="font-medium text-xs">{svc.tipoAccesso || "-"}</p>
              {svc.sottoCategorie?.length > 0 && (
                <p className="text-xs text-muted-foreground">{formatValue(svc.sottoCategorie)}</p>
              )}
              {svc.note && (
                <p className="text-xs mt-1 line-clamp-2">{stripHtml(svc.note)}</p>
              )}
            </div>
          ))
        )}
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground uppercase mb-2">Dopo</p>
        {afterServices.map((svc, i) => (
          <div key={i} className="bg-green-50 border border-green-200 rounded p-2 mb-2">
            <p className="font-medium text-xs">{svc.tipoAccesso || "-"}</p>
            {svc.sottoCategorie?.length > 0 && (
              <p className="text-xs text-muted-foreground">{formatValue(svc.sottoCategorie)}</p>
            )}
            {svc.note && (
              <p className="text-xs mt-1 line-clamp-2">{stripHtml(svc.note)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const date = new Date(entry.changedAt);

  const changeTypeLabel = entry.changeType === "create" ? "Creazione" : "Modifica";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg text-left transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IconHistory className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={entry.changeType === "create" ? "default" : "secondary"} className="text-xs">
                {changeTypeLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(date, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {entry.changedByMail || entry.changedBy || "Sistema"}
              {entry.changedByStructure && ` · ${entry.changedByStructure}`}
            </p>
          </div>
          {open
            ? <IconChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <IconChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          {entry.changes?.services && (
            <ServiceDiff
              before={entry.changes.services.before}
              after={entry.changes.services.after}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AccessHistoryTimeline({ accessId, anagraficaId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessId || !anagraficaId) return;
    getAccessHistoryAction(accessId, anagraficaId)
      .then(raw => {
        const parsed = JSON.parse(raw);
        setEntries(parsed.entries || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessId, anagraficaId]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconHistory className="w-5 h-5" />
          Cronologia Modifiche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading && <p className="text-sm text-muted-foreground px-4">Caricamento...</p>}
        {error && <p className="text-sm text-destructive px-4">Errore: {error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground px-4">Nessuna modifica registrata.</p>
        )}
        {!loading && entries.map(entry => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}
```

### Step 2: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/components/Anagrafica/AccessHistoryTimeline.jsx
git commit -m "feat(accessi): add AccessHistoryTimeline component"
```

---

## Task 7: Create `AccessDetailClient` component

**Files:**
- Create: `src/components/Anagrafica/AccessDetailClient.jsx`

Notes are displayed using `stripHtml` — no raw HTML rendering.

### Step 1: Create the file

```jsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PencilIcon, X, FileIcon, Download, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { updateAccessAction, getAccessFileUrl } from "@/actions/anagrafica/access";
import { getStructureCategories, addSubcategoryToStructure } from "@/actions/admin/structure";
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import AccessHistoryTimeline from "@/components/Anagrafica/AccessHistoryTimeline";
import { useAccessForm } from "@/hooks/useAccessForm";
import { stripHtml } from "@/utils/htmlSanitizer";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("it-IT");
}

function FileRow({ file, anagraficaId, onDelete, editMode }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await getAccessFileUrl({ anagraficaId, filePath: file.path });
      if (res.success && res.url) window.open(res.url, "_blank");
      else toast.error("Impossibile recuperare il file.");
    } catch {
      toast.error("Errore durante il download.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 truncate">{file.nome || file.nomeOriginale}</span>
      <span className="text-xs text-muted-foreground">{formatDate(file.dataCreazione)}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} disabled={downloading}>
        {downloading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Download className="w-3 h-3" />}
      </Button>
      {editMode && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive/90"
          onClick={() => onDelete(file.path)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function ServiceReadView({ service, anagraficaId }) {
  const strippedNote = service.note ? stripHtml(service.note) : null;
  const subcategories = Array.isArray(service.sottoCategorie)
    ? service.sottoCategorie
    : service.sottoCategorie ? [service.sottoCategorie] : [];

  return (
    <div className="space-y-3">
      {subcategories.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Sottocategorie</span>
          <div className="flex flex-wrap gap-1">
            {subcategories.map((s, i) => (
              <Badge key={i} variant="secondary">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {service.classificazione && (
        <div>
          <span className="text-xs text-muted-foreground block">Classificazione</span>
          <p className="text-sm">{service.classificazione}</p>
        </div>
      )}
      {service.enteRiferimento && (
        <div>
          <span className="text-xs text-muted-foreground block">Ente di riferimento</span>
          <p className="text-sm">{service.enteRiferimento}</p>
        </div>
      )}
      {strippedNote && (
        <div>
          <span className="text-xs text-muted-foreground block">Note</span>
          <p className="text-sm whitespace-pre-wrap">{strippedNote}</p>
        </div>
      )}
      {service.reminderDate && (
        <div>
          <span className="text-xs text-muted-foreground block">Promemoria</span>
          <p className="text-sm">{formatDate(service.reminderDate)}</p>
        </div>
      )}
      {service.files?.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">File allegati</span>
          <div className="border rounded-md px-3 py-1">
            {service.files.map((f, i) => (
              <FileRow key={i} file={f} anagraficaId={anagraficaId} editMode={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccessDetailClient({ accesso, anagraficaId, structureId, anagraficaName }) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  const {
    accessState,
    updateAccessField,
    markFileForDeletion,
    resetAccessForm,
    getValidAccessTypes,
    prepareAccessPayload,
  } = useAccessForm(categories, accesso.services);

  const enterEditMode = useCallback(async () => {
    if (!categoriesFetched && structureId) {
      setCategoriesLoading(true);
      try {
        const cats = await getStructureCategories(structureId);
        setCategories(cats);
        setCategoriesFetched(true);
      } catch {
        setCategoriesFetched(true);
      } finally {
        setCategoriesLoading(false);
      }
    }
    setEditMode(true);
  }, [categoriesFetched, structureId]);

  const handleCancel = () => {
    resetAccessForm();
    setEditMode(false);
  };

  const handleSave = async () => {
    const validTypes = getValidAccessTypes();
    if (validTypes.length === 0) {
      toast.error("Seleziona almeno una sottocategoria prima di salvare.");
      return;
    }
    setSaving(true);
    try {
      const servicesPayload = await prepareAccessPayload();
      await updateAccessAction({ accessId: accesso.id, anagraficaId, services: servicesPayload, structureId });
      toast.success("Accesso aggiornato con successo.");
      setEditMode(false);
      router.refresh();
    } catch (err) {
      toast.error("Errore durante il salvataggio: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewSubcategory = useCallback(async (categoryValue, newSubcategory) => {
    try {
      const result = await addSubcategoryToStructure(structureId, categoryValue, newSubcategory);
      if (result.success && !result.alreadyExists) {
        toast.success(`Sottocategoria "${newSubcategory}" aggiunta`);
      }
    } catch {
      toast.error("Errore durante l'aggiunta della sottocategoria");
    }
  }, [structureId]);

  return (
    <div className="w-full mx-auto px-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${structureId}/anagrafica/${anagraficaId}`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {anagraficaName}
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Dettaglio Accesso</h1>
          <Badge variant="outline" className="text-xs text-muted-foreground font-mono hidden sm:inline-flex">
            {accesso.id}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button onClick={enterEditMode} disabled={categoriesLoading}>
              {categoriesLoading
                ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                : <PencilIcon className="w-4 h-4 mr-1" />}
              Modifica
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Creato il</span>
            <p className="font-medium">{formatDate(accesso.createdAt)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Struttura</span>
            <p className="font-medium">{accesso.createdByStructure || "-"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Operatore</span>
            <p className="font-medium">{accesso.createdBy || "-"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Servizi</span>
            <p className="font-medium">{accesso.services?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* View mode: read-only service list */}
      {!editMode && (
        <div className="space-y-4">
          {(accesso.services || []).map((svc, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {svc.tipoAccesso || "Servizio"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceReadView service={svc} anagraficaId={anagraficaId} />
              </CardContent>
            </Card>
          ))}
          {(!accesso.services || accesso.services.length === 0) && (
            <p className="text-sm text-muted-foreground">Nessun servizio registrato per questo accesso.</p>
          )}
        </div>
      )}

      {/* Edit mode: pre-populated form */}
      {editMode && (
        <Card>
          <CardContent className="pt-4">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <AccessServicesForm
                state={accessState}
                onChange={updateAccessField}
                showClassification
                showReferralEntity
                categories={categories}
                onNewSubcategory={handleNewSubcategory}
                existingFilesRenderer={(typeValue) => {
                  const existing = accessState[typeValue]?.existingFiles || [];
                  if (existing.length === 0) return null;
                  return (
                    <div className="mb-3 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">File esistenti</p>
                      <div className="border rounded-md px-3 py-1">
                        {existing.map((f, i) => (
                          <FileRow
                            key={i}
                            file={f}
                            anagraficaId={anagraficaId}
                            editMode
                            onDelete={(filePath) => markFileForDeletion(typeValue, filePath)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* History timeline */}
      <AccessHistoryTimeline accessId={accesso.id} anagraficaId={anagraficaId} />
    </div>
  );
}
```

### Step 2: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/components/Anagrafica/AccessDetailClient.jsx
git commit -m "feat(accessi): add AccessDetailClient view/edit component"
```

---

## Task 8: Add `existingFilesRenderer` prop to `AccessServicesForm`

**Files:**
- Modify: `src/components/Anagrafica/AccessServicesForm.jsx`

### Step 1: Add the prop to the destructured parameters

Find the function signature:
```jsx
export default function AccessServicesForm({
    state,
    onChange,
    showClassification = false,
    showReferralEntity = false,
    categories = null,
    onNewSubcategory = null,
}) {
```

Replace with:
```jsx
export default function AccessServicesForm({
    state,
    onChange,
    showClassification = false,
    showReferralEntity = false,
    categories = null,
    onNewSubcategory = null,
    existingFilesRenderer = null,
}) {
```

### Step 2: Call the renderer inside the Files section of each `TabsContent`

Find this exact block inside the map over `accessTypes` (inside `TabsContent`):
```jsx
                        {/* Files */}
                        <div className="space-y-2">
                            <Label>Allegati</Label>
                            <Dropzone
```

Replace it with:
```jsx
                        {/* Files */}
                        <div className="space-y-2">
                            <Label>Allegati</Label>
                            {existingFilesRenderer && existingFilesRenderer(type.value)}
                            <Dropzone
```

### Step 3: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/components/Anagrafica/AccessServicesForm.jsx
git commit -m "feat(accessi): add existingFilesRenderer prop to AccessServicesForm"
```

---

## Task 9: Create the accesso detail page (server component)

**Files:**
- Create: `src/app/(portal)/[structureId]/anagrafica/[id]/accessi/[accessId]/page.js`

### Step 1: Create the directory

```bash
mkdir -p "/Users/mramos/Documents/OneBridge/GPC/gpc/src/app/(portal)/[structureId]/anagrafica/[id]/accessi/[accessId]"
```

### Step 2: Create `page.js`

```js
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAccessByIdAction } from "@/actions/anagrafica/access";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import AccessDetailClient from "@/components/Anagrafica/AccessDetailClient";

export default async function AccessDetailPage({ params }) {
  const { structureId, id: anagraficaId, accessId } = await params;

  const headersList = await headers();
  const userUid = headersList.get("x-user-uid");
  if (!userUid) return notFound();

  let accesso;
  let anagrafica;

  try {
    const raw = await getAccessByIdAction(accessId, anagraficaId);
    accesso = JSON.parse(raw);
  } catch {
    return notFound();
  }

  try {
    const raw = await getAnagrafica(anagraficaId, structureId);
    anagrafica = JSON.parse(raw);
  } catch {
    return notFound();
  }

  if (!anagrafica) return notFound();

  const anagraficaName = `${anagrafica.anagrafica?.nome || ""} ${anagrafica.anagrafica?.cognome || ""}`.trim();

  return (
    <AccessDetailClient
      accesso={accesso}
      anagraficaId={anagraficaId}
      structureId={structureId}
      anagraficaName={anagraficaName}
    />
  );
}
```

### Step 3: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add "src/app/(portal)/[structureId]/anagrafica/[id]/accessi/[accessId]/page.js"
git commit -m "feat(accessi): add accesso detail page route"
```

---

## Task 10: Add row link to `AccessInfo`

**Files:**
- Modify: `src/components/Anagrafica/AccessInfo.jsx`

### Step 1: Add imports at the top of the file

After the existing imports add:
```js
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
```

### Step 2: Read `structureId` from URL params inside the component

Inside the `AccessInfo` component body, after the `React.useState` call, add:
```js
  const params = useParams();
  const structureId = params?.structureId;
```

### Step 3: Add the link column as the first entry in the `columns` array

```js
      {
        id: "detailLink",
        header: "",
        size: 48,
        enableSorting: false,
        Cell: ({ row }) => {
          const { accessId, anagraficaId } = row.original;
          if (!accessId || !anagraficaId || !structureId) return null;
          return (
            <a
              href={`/${structureId}/anagrafica/${anagraficaId}/accessi/${accessId}`}
              className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              title="Apri dettaglio accesso"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          );
        },
      },
```

### Step 4: Build check + commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run build 2>&1 | tail -20
git add src/components/Anagrafica/AccessInfo.jsx
git commit -m "feat(accessi): add link to detail page from access table"
```

---

## Task 11: Final end-to-end verification

### Step 1: Start dev server

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc && npm run dev
```

### Step 2: Manual test checklist

1. Open an anagrafica that has at least one existing accesso.
2. In the accessi table, click the `ExternalLink` icon → should navigate to `/{structureId}/anagrafica/{id}/accessi/{accessId}`.
3. **View mode**: metadata card shows date, structure, operator. Each service card shows subcategories, notes (as plain text), files.
4. Click a file's **Download** icon → file opens in a new tab.
5. Click **Modifica** → page switches to edit mode, `AccessServicesForm` tabs appear pre-populated (correct subcategories checked, notes filled).
6. Verify: existing files appear above the Dropzone in each service tab.
7. Change a subcategory or note → click **Salva modifiche** → success toast, back to view mode with updated data.
8. **History timeline** at the bottom shows a "Modifica" entry. Expand it → before/after service diff is visible.
9. Delete an existing file in edit mode (trash icon) → save → file row disappears from view mode.
10. Create a brand-new accesso from the anagrafica page → navigate to its detail page → history shows a "Creazione" entry.
11. Click **Annulla** in edit mode → form resets to original data, no changes persisted.

### Step 3: Final summary commit

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc
git commit --allow-empty -m "feat(accessi): accesso detail/edit page complete"
```
