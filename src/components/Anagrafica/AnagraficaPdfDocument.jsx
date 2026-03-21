"use client";

import {
  Circle,
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Simple HTML stripper safe for non-DOM context (PDF renderer)
function stripHtmlSimple(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    return format(new Date((ts._seconds || ts.seconds) * 1000), "dd/MM/yyyy", {
      locale: it,
    });
  }
  if (typeof ts === "string") {
    try {
      return format(new Date(ts), "dd/MM/yyyy", { locale: it });
    } catch {
      return "-";
    }
  }
  return "-";
}

const COLORS = {
  text: "#000000",
  muted: "#9ca3af",
  border: "#e5e7eb",
  sectionBg: "#ffffff",
  white: "#ffffff",
  black: "#000000",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
  },
  // Letterhead
  letterheadBand: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "2px solid #111827",
    marginBottom: 0,
  },
  letterheadLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMark: {
    width: 52,
    height: 26,
    marginRight: 10,
  },
  structureName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  letterheadSubtitle: {
    fontSize: 8,
    color: COLORS.muted,
  },
  letterheadRight: {
    alignItems: "flex-end",
  },
  docType: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  docDateLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  // Subject strip
  subjectStrip: {
    paddingHorizontal: 40,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottom: "1px solid #e5e7eb",
    marginBottom: 24,
    backgroundColor: COLORS.sectionBg,
  },
  subjectLabel: {
    fontSize: 7,
    color: COLORS.muted,
    marginBottom: 3,
  },
  subjectName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  contentArea: {
    paddingHorizontal: 40,
  },
  headerMeta: {
    fontSize: 9,
    color: COLORS.muted,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1px solid #d1d5db",
  },
  subSectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    marginTop: 12,
    marginBottom: 5,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  fieldItem: {
    width: "48%",
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 7,
    color: COLORS.muted,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: COLORS.text,
  },
  accessBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: COLORS.sectionBg,
    borderLeft: "2px solid #d1d5db",
  },
  accessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  accessDate: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  accessOperator: {
    fontSize: 9,
    color: COLORS.muted,
  },
  serviceBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #e5e7eb",
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
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #e5e7eb",
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
  nome: "Nome",
  cognome: "Cognome",
  sesso: "Sesso",
  dataDiNascita: "Data di Nascita",
  luogoDiNascita: "Luogo di Nascita",
  cittadinanza: "Cittadinanza",
  comuneDiDomicilio: "Comune di Domicilio",
  telefono: "Telefono",
  email: "Email",
  nucleo: "Tipo Nucleo",
  nucleoTipo: "Composizione Nucleo",
  figli: "Numero Figli",
  situazioneLegale: "Situazione Legale",
  situazioneAbitativa: "Situazione Abitativa",
  situazioneLavorativa: "Situazione Lavorativa",
  titoloDiStudioOrigine: "Titolo di Studio (Origine)",
  titoloDiStudioItalia: "Titolo di Studio (Italia)",
  conoscenzaItaliano: "Conoscenza Italiano",
  vulnerabilita: "Vulnerabilità",
  intenzioneItalia: "Intenzione Italia",
  paeseDestinazione: "Paese di Destinazione",
  referral: "Referral",
  referralAltro: "Referral (Altro)",
};

function formatFieldValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "object") {
    if (value.seconds || value._seconds) return formatFirestoreTimestamp(value);
    return JSON.stringify(value);
  }
  return String(value) || "-";
}

function isEmptyValue(val) {
  if (val === null || val === undefined || val === "" || val === 0) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

function AnagraficaSection({ anagrafica }) {
  const a = anagrafica.anagrafica || {};
  const fields = [
    ["Nome", a.nome],
    ["Cognome", a.cognome],
    ["Sesso", a.sesso],
    [
      "Data di Nascita",
      a.dataDiNascita ? formatFirestoreTimestamp(a.dataDiNascita) : "-",
    ],
    ["Luogo di Nascita", a.luogoDiNascita],
    [
      "Cittadinanza",
      Array.isArray(a.cittadinanza)
        ? a.cittadinanza.join(", ")
        : a.cittadinanza,
    ],
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

function AnagraficaDataSection({ anagrafica }) {
  const nucleo = anagrafica.nucleoFamiliare || {};
  const legale = anagrafica.legaleAbitativa || {};
  const lavoro = anagrafica.lavoroFormazione || {};
  const vuln = anagrafica.vulnerabilita || {};
  const ref = anagrafica.referral || {};

  const isFamiglia = nucleo.nucleo === "famiglia";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>INFORMAZIONI AGGIUNTIVE</Text>

      {/* Nucleo Familiare */}
      <Text style={styles.subSectionTitle}>Nucleo Familiare</Text>
      <View style={styles.fieldGrid}>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Composizione</Text>
          <Text style={styles.fieldValue}>
            {nucleo.nucleo === "singolo"
              ? "Persona singola"
              : nucleo.nucleo === "famiglia"
                ? "Nucleo familiare"
                : "-"}
          </Text>
        </View>
        {isFamiglia && (
          <>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Tipologia nucleo</Text>
              <Text style={styles.fieldValue}>{nucleo.nucleoTipo || "-"}</Text>
            </View>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Numero figli minori</Text>
              <Text style={styles.fieldValue}>
                {nucleo.figli?.toString() ?? "0"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Situazione Legale e Abitativa */}
      <Text style={styles.subSectionTitle}>Situazione Legale e Abitativa</Text>
      <View style={styles.fieldGrid}>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Situazione legale</Text>
          <Text style={styles.fieldValue}>
            {legale.situazioneLegale || "-"}
          </Text>
        </View>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Situazione abitativa</Text>
          <Text style={styles.fieldValue}>
            {Array.isArray(legale.situazioneAbitativa)
              ? legale.situazioneAbitativa.join(", ") || "-"
              : legale.situazioneAbitativa || "-"}
          </Text>
        </View>
      </View>

      {/* Lavoro e Formazione */}
      <Text style={styles.subSectionTitle}>Lavoro e Formazione</Text>
      <View style={styles.fieldGrid}>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Situazione lavorativa</Text>
          <Text style={styles.fieldValue}>
            {lavoro.situazioneLavorativa || "-"}
          </Text>
        </View>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Titolo di studio (paese d'origine)</Text>
          <Text style={styles.fieldValue}>
            {lavoro.titoloDiStudioOrigine || "-"}
          </Text>
        </View>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Titolo di studio (Italia)</Text>
          <Text style={styles.fieldValue}>
            {lavoro.titoloDiStudioItalia || "-"}
          </Text>
        </View>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Conoscenza italiano</Text>
          <Text style={styles.fieldValue}>
            {lavoro.conoscenzaItaliano || "-"}
          </Text>
        </View>
      </View>

      {/* Vulnerabilità */}
      <Text style={styles.subSectionTitle}>Vulnerabilità e Prospettive</Text>
      <View style={styles.fieldGrid}>
        <View style={[styles.fieldItem, { width: "98%" }]}>
          <Text style={styles.fieldLabel}>Vulnerabilità</Text>
          <Text style={styles.fieldValue}>
            {Array.isArray(vuln.vulnerabilita) && vuln.vulnerabilita.length > 0
              ? vuln.vulnerabilita.join(", ")
              : "Nessuna"}
          </Text>
        </View>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Intenzione di fermarsi in Italia</Text>
          <Text style={styles.fieldValue}>
            {vuln.intenzioneItalia || "-"}
          </Text>
        </View>
        {vuln.intenzioneItalia === "NO" && (
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Paese di destinazione</Text>
            <Text style={styles.fieldValue}>
              {vuln.paeseDestinazione || "-"}
            </Text>
          </View>
        )}
      </View>

      {/* Referral */}
      <Text style={styles.subSectionTitle}>Come ci ha conosciuto</Text>
      <View style={styles.fieldGrid}>
        <View style={styles.fieldItem}>
          <Text style={styles.fieldLabel}>Fonte</Text>
          <Text style={styles.fieldValue}>{ref.referral || "-"}</Text>
        </View>
        {ref.referralAltro && (
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Dettaglio</Text>
            <Text style={styles.fieldValue}>{ref.referralAltro}</Text>
          </View>
        )}
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
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACCESSI ({sorted.length})</Text>
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
              // biome-ignore lint/suspicious/noArrayIndexKey: services have no stable id
              <View key={j} style={styles.serviceBlock}>
                <ServiceRow label="Tipo" value={svc.tipoAccesso} />
                <ServiceRow
                  label="Sottocategorie"
                  value={
                    Array.isArray(svc.sottoCategorie)
                      ? svc.sottoCategorie.join(", ")
                      : svc.sottoCategorie
                  }
                />
                <ServiceRow
                  label="Classificazione"
                  value={svc.classificazione}
                />
                <ServiceRow
                  label="Ente di riferimento"
                  value={svc.enteRiferimento}
                />
                <ServiceRow label="Note" value={stripHtmlSimple(svc.note)} />
                <ServiceRow
                  label="Promemoria"
                  value={
                    svc.reminderDate
                      ? formatPdfDateTime(svc.reminderDate)
                      : null
                  }
                />
                {svc.files && svc.files.length > 0 && (
                  <ServiceRow
                    label="File allegati"
                    value={svc.files
                      .map((f) => f.nome || f.nomeOriginale)
                      .join(", ")}
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
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
  );

  const changeTypeLabels = {
    create: "Creazione",
    update: "Modifica",
    delete: "Eliminazione",
  };

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
                {formatPdfDateTime(entry.changedAt)} ·{" "}
                {changeTypeLabels[entry.changeType] || entry.changeType} ·{" "}
                {entry.changedByMail || entry.changedBy || "Sconosciuto"}
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
                        <Text style={styles.historyArrow}>{">"}</Text>
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

export function AnagraficaPdfDocument({
  anagrafica,
  accesses,
  historyEntries,
  structureName,
}) {
  const nome = anagrafica?.anagrafica?.nome || "";
  const cognome = anagrafica?.anagrafica?.cognome || "";
  const fullName = `${nome} ${cognome}`.trim();
  const today = format(new Date(), "dd/MM/yyyy", { locale: it });
  const displayStructure = structureName || "GPC";

  return (
    <Document
      title={`Scheda Anagrafica - ${fullName}`}
      author={displayStructure}
      subject="Scheda Anagrafica"
    >
      <Page size="A4" style={styles.page}>
        {/* Letterhead band */}
        <View style={styles.letterheadBand}>
          <View style={styles.letterheadLeft}>
            <Svg
              viewBox="0 0 345.84 174.76"
              style={styles.logoMark}
            >
              <Path
                d="m1.09,114.92L114.93,1.08c.69-.69,1.62-1.07,2.59-1.07h107.13c3.27,0,4.9,3.95,2.59,6.26L59.84,173.69c-1.43,1.43-3.75,1.43-5.19,0L1.07,120.11c-1.43-1.43-1.43-3.75,0-5.19h.02Z"
                fill={COLORS.text}
              />
              <Path
                d="m294.87,56.17l49.89-49.91c2.31-2.31.67-6.26-2.59-6.26h-99.8c-3.27,0-4.9,3.95-2.59,6.26l49.91,49.91c1.43,1.43,3.76,1.43,5.19,0h-.01Z"
                fill={COLORS.text}
              />
              <Circle cx="233.51" cy="58.77" r="18.7" fill={COLORS.text} />
            </Svg>
            <View>
              <Text style={styles.structureName}>{displayStructure}</Text>
              <Text style={styles.letterheadSubtitle}>
                Gestione Prese in Carico
              </Text>
            </View>
          </View>
          <View style={styles.letterheadRight}>
            <Text style={styles.docType}>Documento</Text>
            <Text style={styles.docType}>Scheda Anagrafica</Text>
            <Text style={styles.docDateLabel}>Generato il: {today}</Text>
          </View>
        </View>

        {/* Subject strip */}
        <View style={styles.subjectStrip}>
          <Text style={styles.subjectLabel}>INTESTATARIO</Text>
          <Text style={styles.subjectName}>{fullName}</Text>
        </View>

        <View style={styles.contentArea}>
          <AnagraficaSection anagrafica={anagrafica} />
          <AnagraficaDataSection anagrafica={anagrafica} />
          <AccessesSection accesses={accesses} />
          <HistorySection entries={historyEntries} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{displayStructure} — Scheda Anagrafica</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
