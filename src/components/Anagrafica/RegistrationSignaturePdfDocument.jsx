"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    color: "#111827",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottom: "2px solid #1f2937",
  },
  eyebrow: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  metaBox: {
    flex: 1,
    border: "1px solid #d1d5db",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  metaLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1px solid #e5e7eb",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  field: {
    width: "48%",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    padding: 7,
    minHeight: 42,
  },
  fieldFull: {
    width: "100%",
  },
  fieldLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 10,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
  },
  infoBox: {
    border: "1px solid #d1d5db",
    borderRadius: 4,
    backgroundColor: "#f9fafb",
    padding: 10,
    marginTop: 8,
  },
  signatureSection: {
    marginTop: 14,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 16,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 28,
  },
  signatureLine: {
    borderTop: "1px solid #111827",
    paddingTop: 4,
    fontSize: 8,
    color: "#6b7280",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    fontSize: 8,
    color: "#6b7280",
  },
});

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value?._seconds) {
    return new Date(value._seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(value, includeTime = false) {
  const parsed = parseDate(value);
  if (!parsed) return "-";

  return includeTime
    ? format(parsed, "dd MMMM yyyy 'alle' HH:mm", { locale: it })
    : format(parsed, "dd/MM/yyyy", { locale: it });
}

function formatFieldValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "object") {
    if (value._seconds) {
      return formatDateValue(value);
    }
    return JSON.stringify(value);
  }

  const trimmed = String(value).trim();
  return trimmed || "-";
}

function PdfField({ label, value, full = false }) {
  return (
    <View style={[styles.field, full ? styles.fieldFull : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatFieldValue(value)}</Text>
    </View>
  );
}

export function RegistrationSignaturePdfDocument({
  anagrafica,
  structureName,
  generatedAt = new Date(),
}) {
  const person = anagrafica?.anagrafica || {};
  const family = anagrafica?.nucleoFamiliare || {};
  const legal = anagrafica?.legaleAbitativa || {};
  const work = anagrafica?.lavoroFormazione || {};
  const vulnerability = anagrafica?.vulnerabilita || {};
  const referral = anagrafica?.referral || {};
  const fullName =
    [person.nome, person.cognome].filter(Boolean).join(" ") || "Persona";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Modulo stampabile di registrazione</Text>
          <Text style={styles.title}>Scheda di presa in carico</Text>
          <Text style={styles.subtitle}>
            Documento da stampare, far firmare e archiviare nei file della
            persona.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Struttura</Text>
              <Text style={styles.metaValue}>{structureName || "-"}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Persona</Text>
              <Text style={styles.metaValue}>{fullName}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Generato il</Text>
              <Text style={styles.metaValue}>
                {formatDateValue(generatedAt, true)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dati anagrafici</Text>
          <View style={styles.grid}>
            <PdfField label="Nome" value={person.nome} />
            <PdfField label="Cognome" value={person.cognome} />
            <PdfField label="Sesso" value={person.sesso} />
            <PdfField
              label="Data di nascita"
              value={formatDateValue(person.dataDiNascita)}
            />
            <PdfField label="Luogo di nascita" value={person.luogoDiNascita} />
            <PdfField label="Cittadinanza" value={person.cittadinanza} />
            <PdfField
              label="Comune di domicilio"
              value={person.comuneDiDomicilio}
            />
            <PdfField label="Telefono" value={person.telefono} />
            <PdfField label="Email" value={person.email} full />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contesto generale</Text>
          <View style={styles.grid}>
            <PdfField label="Tipo nucleo" value={family.nucleo} />
            <PdfField label="Composizione nucleo" value={family.nucleoTipo} />
            <PdfField label="Numero figli" value={family.figli} />
            <PdfField
              label="Situazione legale"
              value={legal.situazioneLegale}
            />
            <PdfField
              label="Situazione abitativa"
              value={legal.situazioneAbitativa}
              full
            />
            <PdfField
              label="Situazione lavorativa"
              value={work.situazioneLavorativa}
            />
            <PdfField
              label="Titolo di studio (origine)"
              value={work.titoloDiStudioOrigine}
            />
            <PdfField
              label="Titolo di studio (Italia)"
              value={work.titoloDiStudioItalia}
            />
            <PdfField
              label="Conoscenza italiano"
              value={work.conoscenzaItaliano}
            />
            <PdfField
              label="Vulnerabilità"
              value={vulnerability.vulnerabilita}
              full
            />
            <PdfField
              label="Intenzione in Italia"
              value={vulnerability.intenzioneItalia}
            />
            <PdfField
              label="Paese di destinazione"
              value={vulnerability.paeseDestinazione}
            />
            <PdfField label="Referral" value={referral.referral} full />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conferma dati e firma</Text>
          <Text style={styles.paragraph}>
            La persona conferma insieme all&apos;operatore che i dati riportati
            in questo modulo corrispondono alle informazioni raccolte durante la
            registrazione, ne prende visione e firma il presente riepilogo da
            archiviare nel fascicolo digitale associato alla propria scheda.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.paragraph}>
              Integrare questo modulo con l&apos;informativa privacy ufficiale
              della struttura e con eventuali riferimenti di protocollo o timbro
              previsti dalla vostra procedura interna.
            </Text>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.grid}>
              <PdfField
                label="Data firma"
                value="........................................"
              />
              <PdfField
                label="Riferimento / protocollo"
                value="........................................"
              />
            </View>

            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>
                  Firma della persona presa in carico
                </Text>
                <Text style={styles.signatureLine}>
                  Nome e firma leggibile
                </Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Firma operatore</Text>
                <Text style={styles.signatureLine}>
                  Nome, cognome e firma
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{structureName || "Struttura"}</Text>
          <Text>Documento generato dal sistema GPC</Text>
        </View>
      </Page>
    </Document>
  );
}
