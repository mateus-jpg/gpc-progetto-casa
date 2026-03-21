# Reminder Button + PDF Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a standalone reminder button (no access required) and a PDF export button to the anagrafica detail page.

**Architecture:** Two independent features both added to the action button group on the anagrafica page. The reminder creates a Firestore document in the existing `reminders` collection. The PDF is generated client-side using `@react-pdf/renderer`, fetching history lazily on click.

**Tech Stack:** Next.js 14 App Router, Firebase Admin SDK, `@react-pdf/renderer`, shadcn/ui Dialog, Tailwind CSS, `date-fns` (already installed), `sonner` (already installed for toasts)

**Design doc:** `docs/plans/2026-02-24-reminder-and-pdf-export-design.md`

---

## Task 1: Install @react-pdf/renderer

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install the package**

```bash
npm install @react-pdf/renderer
```

Expected: package added to `dependencies` in `package.json`, no errors.

**Step 2: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds. If it fails with SSR-related errors (canvas, etc.), add this to `next.config.js`:

```js
// next.config.js - inside the config object:
experimental: {
  // existing experimental config if any
},
// Add this at the top level if @react-pdf causes SSR issues:
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals = [...(config.externals || []), '@react-pdf/renderer'];
  }
  return config;
},
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @react-pdf/renderer for PDF export"
```

---

## Task 2: Create `createReminderAction` server action

**Files:**
- Create: `src/actions/anagrafica/reminders.js`

**Context:** The `reminders` Firestore collection already exists and is used by `createAccessInternal`. Standalone reminders have `linkedToAccess: false` and `accessId: null`. File upload follows the same pattern as `createAccessInternal` in `src/actions/anagrafica/access.js` (base64 decode → size check → MIME check → magic number check → UUID storage path).

**Step 1: Create the file**

```js
'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import path from 'path';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES, validateFileSignature } from '@/utils/fileValidation';
import { logDataCreate } from '@/utils/audit';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/**
 * Create a standalone reminder (not linked to an access record).
 *
 * @param {Object} payload
 * @param {string} payload.anagraficaId
 * @param {string} payload.structureId
 * @param {string} payload.serviceType  - tipoAccesso label (e.g. "Legale")
 * @param {string} payload.date         - ISO string, the reminder datetime
 * @param {string|null} payload.dataScadenza - ISO string, optional expiry
 * @param {string|null} payload.enteRiferimento
 * @param {string|null} payload.note
 * @param {Object|null} payload.file    - { name, creationDate, expirationDate, base64, type, size }
 */
export async function createReminderAction(payload) {
  const { userUid } = await requireUser();

  const {
    anagraficaId,
    structureId,
    serviceType,
    date,
    dataScadenza = null,
    enteRiferimento = null,
    note = null,
    file = null,
  } = payload;

  if (!anagraficaId || !structureId || !serviceType || !date) {
    throw new Error('Missing required fields');
  }

  // Permission check via parent anagrafica
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];
  await verifyUserPermissions({ userUid, allowedStructures });

  // Handle optional file upload
  let uploadedFile = null;
  if (file && file.base64) {
    const matches = file.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = file.type;
    let buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(file.base64, 'base64');
    }

    if (buffer.length > FILE_SIZE_LIMIT) {
      throw new Error(`File exceeds size limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }
    if (!validateFileSignature(buffer, mimeType)) {
      throw new Error(`File content does not match claimed type ${mimeType}`);
    }

    const fileExt = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
    const storagePath = `files/${anagraficaId}/reminders/${randomUUID()}${fileExt}`;

    const fileRef = adminStorage.bucket().file(storagePath);
    await fileRef.save(buffer, { contentType: mimeType, resumable: false });

    uploadedFile = {
      nome: file.name,
      nomeOriginale: file.name,
      tipo: mimeType,
      dimensione: file.size,
      path: storagePath,
      dataCreazione: file.creationDate ? new Date(file.creationDate).toISOString() : new Date().toISOString(),
      dataScadenza: file.expirationDate ? new Date(file.expirationDate).toISOString() : null,
    };
  }

  const reminderRef = adminDb.collection('reminders').doc();
  const reminderData = {
    anagraficaId,
    structureId,
    accessId: null,
    serviceType,
    date,
    dataScadenza: dataScadenza || null,
    note: note || null,
    enteRiferimento: enteRiferimento || null,
    file: uploadedFile,
    createdBy: userUid,
    createdAt: new Date().toISOString(),
    status: 'pending',
    linkedToAccess: false,
  };

  await reminderRef.set(reminderData);

  await logDataCreate({
    actorUid: userUid,
    resourceType: 'reminders',
    resourceId: reminderRef.id,
    structureId,
    details: { anagraficaId, serviceType, linkedToAccess: false }
  });

  return { success: true, reminderId: reminderRef.id };
}
```

**Step 2: Verify the file has no syntax errors**

```bash
node --input-type=module < /dev/null  # just check the file exists and is importable
npm run lint
```

Expected: No lint errors.

**Step 3: Commit**

```bash
git add src/actions/anagrafica/reminders.js
git commit -m "feat: add createReminderAction server action for standalone reminders"
```

---

## Task 3: Create `ReminderDialog` client component

**Files:**
- Create: `src/components/Anagrafica/ReminderDialog.jsx`

**Context:** Follow the exact pattern of `AccessDialog.jsx` (Dialog + DialogTrigger + DialogContent + form). Access types come from `@/components/Anagrafica/AccessDialog/AccessTypes`. File upload uses `convertFileToBase64` from `@/utils/fileUtils` (same as `useAccessForm`). Use `sonner` toast for feedback.

**Fields:**
- **Tipo** — `<select>` over `AccessTypes` (value = `type.label` to match how reminders store `serviceType`)
- **Data** — `<input type="date">`
- **Ora** — `<input type="time">`
- **Data scadenza documento** — `<input type="date">` (optional)
- **Ente di riferimento** — `<input type="text">` (optional)
- **Note** — `<textarea>` (optional)
- **Allegato** — `<input type="file">` single file, with two extra date inputs (dataCreazione, dataScadenza)

**Step 1: Create the component**

```jsx
"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AccessTypes } from "@/components/Anagrafica/AccessDialog/AccessTypes";
import { createReminderAction } from "@/actions/anagrafica/reminders";
import { convertFileToBase64 } from "@/utils/fileUtils";

export default function ReminderDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    serviceType: AccessTypes[0]?.label || "",
    date: "",
    time: "",
    dataScadenza: "",
    enteRiferimento: "",
    note: "",
  });

  const [fileData, setFileData] = useState(null); // { file, dataCreazione, dataScadenza }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFileData(null);
      return;
    }
    setFileData({ file: selected, dataCreazione: "", dataScadenza: "" });
  };

  const handleReset = () => {
    setForm({
      serviceType: AccessTypes[0]?.label || "",
      date: "",
      time: "",
      dataScadenza: "",
      enteRiferimento: "",
      note: "",
    });
    setFileData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) {
      toast.error("Inserisci la data del promemoria");
      return;
    }

    setLoading(true);
    try {
      // Build ISO datetime from date + time
      const dateTime = form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(`${form.date}T00:00`).toISOString();

      let filePayload = null;
      if (fileData?.file) {
        const base64 = await convertFileToBase64(fileData.file);
        filePayload = {
          name: fileData.file.name,
          type: fileData.file.type,
          size: fileData.file.size,
          base64,
          creationDate: fileData.dataCreazione || null,
          expirationDate: fileData.dataScadenza || null,
        };
      }

      await createReminderAction({
        anagraficaId,
        structureId,
        serviceType: form.serviceType,
        date: dateTime,
        dataScadenza: form.dataScadenza ? new Date(form.dataScadenza).toISOString() : null,
        enteRiferimento: form.enteRiferimento || null,
        note: form.note || null,
        file: filePayload,
      });

      toast.success("Promemoria salvato");
      setOpen(false);
      handleReset();
    } catch (err) {
      console.error(err);
      toast.error("Errore durante il salvataggio del promemoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Promemoria
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Promemoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tipo *</label>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.serviceType}
              onChange={(e) => handleChange("serviceType", e.target.value)}
              required
            >
              {AccessTypes.map((t) => (
                <option key={t.value} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Data + Ora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Data *</label>
              <input
                type="date"
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ora</label>
              <input
                type="time"
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
              />
            </div>
          </div>

          {/* Data scadenza */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Data scadenza documento</label>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.dataScadenza}
              onChange={(e) => handleChange("dataScadenza", e.target.value)}
            />
          </div>

          {/* Ente */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Ente di riferimento</label>
            <input
              type="text"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.enteRiferimento}
              onChange={(e) => handleChange("enteRiferimento", e.target.value)}
              placeholder="Es. Prefettura, ASL..."
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Note</label>
            <textarea
              className="border rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Allegato */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Allegato</label>
            <input
              type="file"
              className="text-sm"
              onChange={handleFileChange}
            />
            {fileData && (
              <div className="grid grid-cols-2 gap-3 pl-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Data creazione documento</label>
                  <input
                    type="date"
                    className="border rounded-md px-2 py-1 text-xs bg-background"
                    value={fileData.dataCreazione}
                    onChange={(e) => setFileData((prev) => ({ ...prev, dataCreazione: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Scadenza documento</label>
                  <input
                    type="date"
                    className="border rounded-md px-2 py-1 text-xs bg-background"
                    value={fileData.dataScadenza}
                    onChange={(e) => setFileData((prev) => ({ ...prev, dataScadenza: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Promemoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Lint check**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/Anagrafica/ReminderDialog.jsx
git commit -m "feat: add ReminderDialog client component for standalone reminders"
```

---

## Task 4: Create `AnagraficaPdfDocument` component

**Files:**
- Create: `src/components/Anagrafica/AnagraficaPdfDocument.jsx`

**Context:** This is a `@react-pdf/renderer` document (NOT a React DOM component — it uses `Document`, `Page`, `View`, `Text`, `StyleSheet` from `@react-pdf/renderer`, not HTML elements). It receives `anagrafica`, `accesses` (array), and `historyEntries` (array) as props. Notes stored in Firestore are HTML strings — strip them using a simple regex (no DOM available in PDF context). Dates formatted using `date-fns/format` + `it` locale (already installed).

The PDF sections:
1. **Header** — title, full name, generation date
2. **Dati Anagrafici** — labeled fields in two-column grid
3. **Accessi** — one block per access, sorted newest first. Each access shows its services as a list.
4. **Cronologia Modifiche Anagrafica** — history entries newest first, with before/after field diffs. **No accessi history.**

**Step 1: Create the component**

```jsx
"use client";

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Simple HTML stripper safe for non-DOM context (PDF renderer)
function stripHtmlSimple(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatPdfDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return format(d, "dd MMMM yyyy", { locale: it });
  } catch {
    return "-";
  }
}

function formatPdfDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return format(d, "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  } catch {
    return "-";
  }
}

function formatFirestoreTimestamp(ts) {
  if (!ts) return "-";
  if (ts._seconds || ts.seconds) {
    return format(new Date((ts._seconds || ts.seconds) * 1000), "dd/MM/yyyy", { locale: it });
  }
  return "-";
}

const COLORS = {
  primary: "#1e40af",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  sectionBg: "#f9fafb",
  divider: "#d1d5db",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    marginBottom: 20,
    borderBottom: `2px solid ${COLORS.primary}`,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 9,
    color: COLORS.muted,
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  // Two-column grid for anagrafica fields
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  fieldItem: {
    width: "48%",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    color: COLORS.text,
  },
  // Access block
  accessBlock: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: COLORS.sectionBg,
    borderLeft: `3px solid ${COLORS.primary}`,
    borderRadius: 2,
  },
  accessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  accessDate: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  accessOperator: {
    fontSize: 9,
    color: COLORS.muted,
  },
  serviceBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: `1px solid ${COLORS.border}`,
  },
  serviceRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  serviceLabel: {
    fontSize: 9,
    color: COLORS.muted,
    width: 110,
    flexShrink: 0,
  },
  serviceValue: {
    fontSize: 9,
    color: COLORS.text,
    flex: 1,
  },
  // History
  historyEntry: {
    marginBottom: 12,
  },
  historyMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 3,
  },
  historyGroup: {
    paddingLeft: 8,
    marginTop: 3,
  },
  historyGroupTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  historyChange: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  historyFieldLabel: {
    fontSize: 8,
    color: COLORS.muted,
    width: 100,
    flexShrink: 0,
  },
  historyBefore: {
    fontSize: 8,
    color: "#991b1b",
    flex: 1,
    marginRight: 4,
  },
  historyArrow: {
    fontSize: 8,
    color: COLORS.muted,
    marginRight: 4,
  },
  historyAfter: {
    fontSize: 8,
    color: "#166534",
    flex: 1,
  },
  emptyText: {
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: "italic",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
});

const GROUP_LABELS = {
  anagrafica: "Dati Personali",
  nucleoFamiliare: "Nucleo Familiare",
  legaleAbitativa: "Situazione Legale e Abitativa",
  lavoroFormazione: "Lavoro e Formazione",
  vulnerabilita: "Vulnerabilità",
  referral: "Referral",
};

const FIELD_LABELS = {
  nome: "Nome", cognome: "Cognome", sesso: "Sesso",
  dataDiNascita: "Data di Nascita", luogoDiNascita: "Luogo di Nascita",
  cittadinanza: "Cittadinanza", comuneDiDomicilio: "Comune di Domicilio",
  telefono: "Telefono", email: "Email",
  nucleo: "Tipo Nucleo", nucleoTipo: "Composizione Nucleo", figli: "Numero Figli",
  situazioneLegale: "Situazione Legale", situazioneAbitativa: "Situazione Abitativa",
  situazioneLavorativa: "Situazione Lavorativa",
  titoloDiStudioOrigine: "Titolo di Studio (Origine)",
  titoloDiStudioItalia: "Titolo di Studio (Italia)",
  conoscenzaItaliano: "Conoscenza Italiano",
  vulnerabilita: "Vulnerabilità", intenzioneItalia: "Intenzione Italia",
  paeseDestinazione: "Paese di Destinazione",
  referral: "Referral", referralAltro: "Referral (Altro)",
};

function formatFieldValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "object") {
    if (value.seconds || value._seconds) {
      return formatFirestoreTimestamp(value);
    }
    return JSON.stringify(value);
  }
  return String(value) || "-";
}

function isEmptyValue(val) {
  if (val === null || val === undefined || val === "" || val === 0) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

// ── Sub-components ────────────────────────────────────────────────

function AnagraficaSection({ anagrafica }) {
  const a = anagrafica.anagrafica || {};
  const fields = [
    ["Nome", a.nome],
    ["Cognome", a.cognome],
    ["Sesso", a.sesso],
    ["Data di Nascita", a.dataDiNascita ? formatFirestoreTimestamp(a.dataDiNascita) : "-"],
    ["Luogo di Nascita", a.luogoDiNascita],
    ["Cittadinanza", Array.isArray(a.cittadinanza) ? a.cittadinanza.join(", ") : a.cittadinanza],
    ["Comune di Domicilio", a.comuneDiDomicilio],
    ["Telefono", a.telefono],
    ["Email", a.email],
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DATI ANAGRAFICI</Text>
      <View style={styles.fieldGrid}>
        {fields.map(([label, value]) => (
          <View key={label} style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value || "-"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ServiceRow({ label, value }) {
  if (!value || value === "-") return null;
  return (
    <View style={styles.serviceRow}>
      <Text style={styles.serviceLabel}>{label}:</Text>
      <Text style={styles.serviceValue}>{value}</Text>
    </View>
  );
}

function AccessesSection({ accesses }) {
  const sorted = [...(accesses || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        ACCESSI ({sorted.length})
      </Text>
      {sorted.length === 0 ? (
        <Text style={styles.emptyText}>Nessun accesso registrato.</Text>
      ) : (
        sorted.map((acc, i) => (
          <View key={acc.id || i} style={styles.accessBlock}>
            <View style={styles.accessHeader}>
              <Text style={styles.accessDate}>
                {formatPdfDateTime(acc.createdAt)}
              </Text>
              <Text style={styles.accessOperator}>
                {acc.createdByEmail || acc.createdBy || ""}
              </Text>
            </View>
            {(acc.services || []).map((svc, j) => (
              <View key={j} style={styles.serviceBlock}>
                <ServiceRow label="Tipo" value={svc.tipoAccesso} />
                <ServiceRow
                  label="Sottocategorie"
                  value={Array.isArray(svc.sottoCategorie) ? svc.sottoCategorie.join(", ") : svc.sottoCategorie}
                />
                <ServiceRow label="Classificazione" value={svc.classificazione} />
                <ServiceRow label="Ente di riferimento" value={svc.enteRiferimento} />
                <ServiceRow label="Note" value={stripHtmlSimple(svc.note)} />
                <ServiceRow label="Promemoria" value={svc.reminderDate ? formatPdfDateTime(svc.reminderDate) : null} />
                {svc.files && svc.files.length > 0 && (
                  <ServiceRow
                    label="File allegati"
                    value={svc.files.map(f => f.nome || f.nomeOriginale).join(", ")}
                  />
                )}
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function HistorySection({ entries }) {
  const sorted = [...(entries || [])].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
  );

  const changeTypeLabels = { create: "Creazione", update: "Modifica", delete: "Eliminazione" };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CRONOLOGIA MODIFICHE ANAGRAFICA</Text>
      {sorted.length === 0 ? (
        <Text style={styles.emptyText}>Nessuna modifica registrata.</Text>
      ) : (
        sorted.map((entry) => {
          const groupEntries = Object.entries(entry.changes || {});
          return (
            <View key={entry.id} style={styles.historyEntry}>
              <Text style={styles.historyMeta}>
                {formatPdfDateTime(entry.changedAt)} · {changeTypeLabels[entry.changeType] || entry.changeType} · {entry.changedByMail || entry.changedBy || "Sconosciuto"}
              </Text>
              {groupEntries.map(([groupName, { before, after }]) => {
                const allKeys = new Set([
                  ...Object.keys(before || {}),
                  ...Object.keys(after || {}),
                ]);
                const changedFields = Array.from(allKeys).filter((key) => {
                  const bv = before?.[key];
                  const av = after?.[key];
                  if (isEmptyValue(bv) && isEmptyValue(av)) return false;
                  return JSON.stringify(bv) !== JSON.stringify(av);
                });
                if (changedFields.length === 0) return null;
                return (
                  <View key={groupName} style={styles.historyGroup}>
                    <Text style={styles.historyGroupTitle}>
                      {GROUP_LABELS[groupName] || groupName}
                    </Text>
                    {changedFields.map((field) => (
                      <View key={field} style={styles.historyChange}>
                        <Text style={styles.historyFieldLabel}>
                          {FIELD_LABELS[field] || field}
                        </Text>
                        <Text style={styles.historyBefore}>
                          {formatFieldValue(before?.[field])}
                        </Text>
                        <Text style={styles.historyArrow}>→</Text>
                        <Text style={styles.historyAfter}>
                          {formatFieldValue(after?.[field])}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Main Document ─────────────────────────────────────────────────

export function AnagraficaPdfDocument({ anagrafica, accesses, historyEntries }) {
  const nome = anagrafica?.anagrafica?.nome || "";
  const cognome = anagrafica?.anagrafica?.cognome || "";
  const fullName = `${nome} ${cognome}`.trim();
  const today = format(new Date(), "dd/MM/yyyy", { locale: it });

  return (
    <Document
      title={`Scheda Anagrafica - ${fullName}`}
      author="GPC"
      subject="Scheda Anagrafica"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SCHEDA ANAGRAFICA</Text>
          <Text style={styles.headerSubtitle}>{fullName}</Text>
          <Text style={styles.headerMeta}>Generato il: {today}</Text>
        </View>

        {/* Section 1: Dati Anagrafici */}
        <AnagraficaSection anagrafica={anagrafica} />

        {/* Section 2: Accessi */}
        <AccessesSection accesses={accesses} />

        {/* Section 3: Cronologia Modifiche */}
        <HistorySection entries={historyEntries} />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GPC - Scheda Anagrafica</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Pagina ${pageNumber} di ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}
```

**Step 2: Lint check**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/Anagrafica/AnagraficaPdfDocument.jsx
git commit -m "feat: add AnagraficaPdfDocument react-pdf component"
```

---

## Task 5: Create `DownloadPdfButton` client component

**Files:**
- Create: `src/components/Anagrafica/DownloadPdfButton.jsx`

**Context:** This is a `"use client"` component that wraps the download action. It imports `pdf` from `@react-pdf/renderer` (which gives a blob from a Document), then uses `URL.createObjectURL` to trigger a browser download. It fetches history lazily on click — only once (then caches it in state). Shows a loading spinner on the button during generation.

**Important Next.js caveat:** `@react-pdf/renderer` may fail if imported at module level in SSR context. Use a dynamic import inside the click handler or ensure the component is client-only. Since this is already `"use client"`, direct imports are safe.

**Step 1: Create the component**

```jsx
"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAnagraficaHistory } from "@/actions/anagrafica/history";

export default function DownloadPdfButton({ anagrafica, accesses, anagraficaId, structureId }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Lazy-load @react-pdf/renderer to avoid SSR issues
      const [{ pdf }, { AnagraficaPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/Anagrafica/AnagraficaPdfDocument"),
      ]);

      // Fetch history on click (not on page load)
      const historyRaw = await getAnagraficaHistory(anagraficaId, structureId, 100, null);
      const historyData = JSON.parse(historyRaw);
      const historyEntries = historyData.entries || [];

      // Generate PDF
      const doc = (
        <AnagraficaPdfDocument
          anagrafica={anagrafica}
          accesses={accesses}
          historyEntries={historyEntries}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const nome = anagrafica?.anagrafica?.nome || "anagrafica";
      const cognome = anagrafica?.anagrafica?.cognome || "";
      const filename = `scheda-${nome}-${cognome}-${new Date().toISOString().slice(0, 10)}.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Errore durante la generazione del PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading}>
      <Download className="w-4 h-4 mr-2" />
      {loading ? "Generazione..." : "Scarica PDF"}
    </Button>
  );
}
```

**Step 2: Lint check**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/Anagrafica/DownloadPdfButton.jsx
git commit -m "feat: add DownloadPdfButton client component for anagrafica PDF export"
```

---

## Task 6: Wire buttons into the anagrafica page

**Files:**
- Modify: `src/app/(portal)/[structureId]/anagrafica/[id]/page.js`

**Context:** This is a server component. `ReminderDialog` and `DownloadPdfButton` are client components. The page already has a `div.flex.gap-2` containing `ShareAnagraficaDialog` and `AccessDialog` (lines 156–170). Add the two new buttons to this group.

`DownloadPdfButton` needs: `anagrafica`, `accesses` (= `anagraficaAccesses.accessi`), `anagraficaId` (= `anagrafica.id`), `structureId`.

`ReminderDialog` needs: `anagraficaId` (= `anagrafica.id`), `structureId`.

**Step 1: Add the two imports** at the top of the file (after existing imports):

```js
import ReminderDialog from "@/components/Anagrafica/ReminderDialog";
import DownloadPdfButton from "@/components/Anagrafica/DownloadPdfButton";
```

**Step 2: Add the two buttons** inside the `div.flex.gap-2` (lines 156–170 in the current file). Place them **before** `ShareAnagraficaDialog`:

```jsx
<div className="flex gap-2">
  <Button variant="outline" asChild>
    <Link href={`/${structureId}/anagrafica/${anagrafica.id}/files`}>
      <FolderOpen className="w-4 h-4 mr-2" />
      Files & Documents
    </Link>
  </Button>
  <ReminderDialog
    anagraficaId={anagrafica.id}
    structureId={structureId}
  />
  <DownloadPdfButton
    anagrafica={anagrafica}
    accesses={anagraficaAccesses?.accessi || []}
    anagraficaId={anagrafica.id}
    structureId={structureId}
  />
  <ShareAnagraficaDialog
    anagraficaId={anagrafica.id}
    structureId={structureId}
    anagraficaName={`${anagrafica.anagrafica?.nome || ''} ${anagrafica.anagrafica?.cognome || ''}`.trim()}
  />
  <AccessDialog anagraficaId={anagrafica.id} structureId={structureId} />
</div>
```

**Step 3: Build to verify no type/import errors**

```bash
npm run build
```

Expected: Build succeeds. If `@react-pdf/renderer` throws a build error related to SSR/canvas, add this to `next.config.js` (see Task 1 Step 2 fallback).

**Step 4: Manual smoke test**
1. Open an anagrafica detail page in the browser
2. Verify "Promemoria" button appears and opens the dialog
3. Fill in the form and submit — check Firestore `reminders` collection for the new document
4. Verify "Scarica PDF" button appears and triggers a download
5. Open the downloaded PDF — verify all three sections are present with correct data

**Step 5: Commit**

```bash
git add src/app/(portal)/[structureId]/anagrafica/[id]/page.js
git commit -m "feat: add Promemoria and Scarica PDF buttons to anagrafica detail page"
```

---

## Summary of files touched

| File | Action |
|------|--------|
| `src/actions/anagrafica/reminders.js` | Created |
| `src/components/Anagrafica/ReminderDialog.jsx` | Created |
| `src/components/Anagrafica/AnagraficaPdfDocument.jsx` | Created |
| `src/components/Anagrafica/DownloadPdfButton.jsx` | Created |
| `src/app/(portal)/[structureId]/anagrafica/[id]/page.js` | Modified |
| `package.json` + `package-lock.json` | Modified (new dep) |
