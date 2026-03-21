# Design: Standalone Reminder Button + PDF Export

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Two independent features for the anagrafica detail page:

1. **Standalone Reminder** — a button to create a reminder without creating an access record
2. **PDF Export** — a button to download a formatted document with all anagrafica data, accessi, and anagrafica change history

---

## Feature 1: Standalone Reminder

### Placement
A new "Promemoria" button added to the action button group in the anagrafica page header (`div.flex.gap-2` alongside "Files & Documents", "Condividi", "Nuovo Accesso" in `src/app/(portal)/[structureId]/anagrafica/[id]/page.js`).

### Component: `ReminderDialog`
Location: `src/components/Anagrafica/ReminderDialog.jsx`

A modal dialog (`"use client"`) with the following form fields:
- **Tipo** — dropdown using the same `AccessTypes` list from `@/components/Anagrafica/AccessDialog/AccessTypes`
- **Data + Ora** — date picker + time input (stored as ISO string)
- **Data scadenza documento** — optional expiration date
- **Ente di riferimento** — text input
- **Note** — textarea
- **Allegato** — single file upload with metadata:
  - Nome file
  - Data creazione documento
  - Data scadenza documento

### Server Action: `createReminderAction`
Location: `src/actions/anagrafica/reminders.js` (new file)

Saves to the existing `reminders` Firestore collection with this shape:
```js
{
  anagraficaId,
  structureId,
  accessId: null,
  serviceType,          // tipoAccesso label
  date,                 // reminderDate ISO string
  note,
  enteRiferimento,
  file: {               // optional, single file
    nome, nomeOriginale, tipo, dimensione,
    path,               // storage path: files/{anagraficaId}/reminders/{uuid}.ext
    dataCreazione, dataScadenza
  } | null,
  createdBy: userUid,
  createdAt: ISO string,
  status: 'pending',
  linkedToAccess: false
}
```

File upload follows the same security pattern as `createAccessInternal`:
- File size validation (FILE_SIZE_LIMIT)
- MIME type whitelist (ALLOWED_MIME_TYPES)
- Magic number validation (validateFileSignature)
- UUID-only storage path (no original filename in path)

Permission check: verify user has access to the anagrafica via `verifyUserPermissions`.

Cache invalidation: none needed (reminders are not currently displayed on the page).

### Out of scope (future)
Displaying standalone reminders on the anagrafica page or in a dedicated reminders list.

---

## Feature 2: PDF Export

### Placement
A "Scarica PDF" button added to the same action button group, rendered as a `"use client"` component (`DownloadPdfButton`) that receives data via props from the server page.

### Library
`@react-pdf/renderer` — client-side declarative PDF generation.

### Component: `DownloadPdfButton`
Location: `src/components/Anagrafica/DownloadPdfButton.jsx`

**Props:**
- `anagrafica` — full anagrafica object (already loaded on server page)
- `accesses` — array of access records (already loaded via `getAccessAction`)
- `anagraficaId` — string
- `structureId` — string

**Behavior on click:**
1. Fetch anagrafica history by calling `getAnagraficaHistory(anagraficaId, structureId, 100, null)` (lazy — only on click, not on page load)
2. Render the PDF document
3. Trigger browser download via `pdf(PdfDoc).save('anagrafica-nome-cognome.pdf')`
4. Show a loading state on the button while generating

### Component: `AnagraficaPdfDocument`
Location: `src/components/Anagrafica/AnagraficaPdfDocument.jsx`

A `@react-pdf/renderer` document component. **PDF sections:**

#### Header
- Title: "SCHEDA ANAGRAFICA"
- Full name (nome + cognome)
- Generation date: "Generato il: DD/MM/YYYY"

#### Section 1 — Dati Anagrafici
Labeled fields in a two-column grid:
- Nome, Cognome, Sesso, Data di Nascita
- Luogo di Nascita, Cittadinanza, Comune di Domicilio
- Telefono, Email

#### Section 2 — Accessi (N accessi)
Accessi sorted by `createdAt` descending. Each access is a block:
```
── 24 febbraio 2026 · mario@org.it ──────────────
  Tipo: Legale
  Sottocategorie: Permesso di soggiorno, Rinnovo
  Classificazione: Urgente
  Ente di riferimento: Prefettura
  Note: Testo delle note...
  Promemoria: 01/03/2026 ore 10:00
```
Each access block iterates over its `services` array.
File names are listed (download links not included in PDF).

#### Section 3 — Cronologia Modifiche Anagrafica
History entries sorted newest first. Each entry:
```
24 febbraio 2026 alle 14:30 · mario@org.it
  Dati Personali
    Nome: Mario → Mario Luigi
    Telefono: (vuoto) → +39 333 1234567
```
Only field-level diffs are shown (same logic as `HistoryTimeline` on screen).
**Accessi history is NOT included.**

### Data already available (no extra fetch needed)
- `anagrafica` — server prop
- `accesses` — server prop (passed as `anagraficaAccesses.accessi`)

### Single extra fetch (on click)
- `getAnagraficaHistory` — existing server action, fetches up to 100 entries

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/Anagrafica/ReminderDialog.jsx` | Create |
| `src/actions/anagrafica/reminders.js` | Create |
| `src/components/Anagrafica/DownloadPdfButton.jsx` | Create |
| `src/components/Anagrafica/AnagraficaPdfDocument.jsx` | Create |
| `src/app/(portal)/[structureId]/anagrafica/[id]/page.js` | Modify — add two buttons |

### Dependencies to install
- `@react-pdf/renderer`
