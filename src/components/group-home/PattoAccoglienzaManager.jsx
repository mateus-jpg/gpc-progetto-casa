"use client";

import { Loader2, PencilLine, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createPattoEntry, updatePattoEntry } from "@/actions/group-home";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

const CONVIVENZA_ITEMS = [
  "Parlare con i coinquilini in modo calmo e rispettoso, senza urlare, minacciare o insultare.",
  "Ascoltare gli altri e chiedere aiuto all'operatore di riferimento se nasce un problema o un litigio.",
  "Tenere in ordine gli spazi e gli oggetti di uso comune.",
  "Chiedere il permesso prima di utilizzare spazi o oggetti di uso individuale altrui.",
  "Rispettare gli orari condivisi della casa (silenzio, uso cucina, bagno, spazi comuni).",
  "Contribuire ogni giorno alla pulizia e all'ordine degli spazi comuni.",
  "Rispettare i turni di pulizia e di ordine concordati.",
  "Contribuire alle spese dell'appartamento secondo gli accordi presi.",
];

const VICINATO_ITEMS = [
  "Rispettare il silenzio negli orari stabiliti, soprattutto la sera e la notte.",
  "Evitare comportamenti che possano disturbare i vicini (musica alta, urla, rumori forti).",
  "Evitare situazioni di conflitto con i vicini (panni stesi, uso di cortili, garage, raccolta differenziata).",
  "Comunicare tempestivamente all'operatore eventuali lamentele o difficoltà con il vicinato.",
  "Rispettare la gestione dei rifiuti come da regolamento comunale.",
];

const CURA_SPAZI_ITEMS = [
  "Riparare i danni eventualmente causati.",
  "Avvisare subito il referente della casa se qualcosa non funziona (luce, acqua, caldaia, bagno, ecc.).",
  "Decidere insieme cosa fare (ad esempio chiamare un tecnico).",
  "Essere disponibili a collaborare con i manutentori.",
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(anagraficaName = "") {
  return {
    destinationHouse: "",
    endDate: "",
    monthlyQuotaAgreed: "",
    monthlyQuotaRequired: "",
    notesCuraSpazi: "",
    notesConvivenza: "",
    notesVicinato: "",
    operatorSignatureDate: "",
    operatorSignatureName: "",
    paymentDueDay: "",
    paymentMethod: "",
    paymentMethodOther: "",
    personContacts: "",
    personName: anagraficaName,
    personSignatureDate: "",
    personSignatureName: anagraficaName,
    prerequisites: {
      acceptsPatto: false,
      acceptsRegolamento: false,
      hasDocuments: false,
      hasIncome: false,
    },
    serviceContacts: "",
    serviceName: "",
    startDate: getTodayDate(),
  };
}

function createFormFromEntry(entry, anagraficaName = "") {
  if (!entry) return createEmptyForm(anagraficaName);
  return {
    destinationHouse: entry.destinationHouse || "",
    endDate: formatDateForInput(entry.endDate),
    monthlyQuotaAgreed: entry.monthlyQuotaAgreed ?? "",
    monthlyQuotaRequired: entry.monthlyQuotaRequired ?? "",
    notesCuraSpazi: entry.notesCuraSpazi || "",
    notesConvivenza: entry.notesConvivenza || "",
    notesVicinato: entry.notesVicinato || "",
    operatorSignatureDate: formatDateForInput(entry.operatorSignatureDate),
    operatorSignatureName: entry.operatorSignatureName || "",
    paymentDueDay: entry.paymentDueDay || "",
    paymentMethod: entry.paymentMethod || "",
    paymentMethodOther: entry.paymentMethodOther || "",
    personContacts: entry.personContacts || "",
    personName: entry.personName || anagraficaName,
    personSignatureDate: formatDateForInput(entry.personSignatureDate),
    personSignatureName: entry.personSignatureName || anagraficaName,
    prerequisites: {
      acceptsPatto: Boolean(entry.prerequisites?.acceptsPatto),
      acceptsRegolamento: Boolean(entry.prerequisites?.acceptsRegolamento),
      hasDocuments: Boolean(entry.prerequisites?.hasDocuments),
      hasIncome: Boolean(entry.prerequisites?.hasIncome),
    },
    serviceContacts: entry.serviceContacts || "",
    serviceName: entry.serviceName || "",
    startDate: formatDateForInput(entry.startDate) || getTodayDate(),
  };
}

const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function CommitmentList({ items }) {
  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-foreground">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PattoAccoglienzaManager({
  anagraficaId,
  anagraficaName,
  initialEntries = [],
  structureId,
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = formData !== null;

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handlePrerequisiteChange = (key, value) => {
    setFormData((current) => ({
      ...current,
      prerequisites: { ...current.prerequisites, [key]: value },
    }));
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(createEmptyForm(anagraficaName));
    requestAnimationFrame(() => {
      document
        .getElementById("patto-form-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData(createFormFromEntry(entry, anagraficaName));
    requestAnimationFrame(() => {
      document
        .getElementById("patto-form-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleCancel = () => {
    setFormData(null);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = editingId
        ? await updatePattoEntry(structureId, anagraficaId, editingId, formData)
        : await createPattoEntry(structureId, anagraficaId, formData);

      if (!result.success) {
        toast.error("Salvataggio non riuscito");
        return;
      }

      const nextEntries = editingId
        ? entries.map((e) => (e.id === result.entry.id ? result.entry : e))
        : [result.entry, ...entries];

      nextEntries.sort(
        (a, b) =>
          new Date(b.startDate || b.updatedAt || 0).getTime() -
          new Date(a.startDate || a.updatedAt || 0).getTime(),
      );

      setEntries(nextEntries);
      toast.success(editingId ? "Patto aggiornato" : "Patto salvato");
      setFormData(null);
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio del patto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header card */}
      <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Patto di Accoglienza</CardTitle>
              <CardDescription className="mt-1">
                Documento firmato all'ingresso nel progetto. Definisce gli
                impegni reciproci tra la persona accolta e il servizio.
              </CardDescription>
            </div>
            {!isEditing && (
              <Button type="button" onClick={openNew} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo patto
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{anagraficaName}</Badge>
          <Badge variant="secondary">{entries.length} patti registrati</Badge>
        </CardContent>
      </Card>

      {/* Inline form */}
      {isEditing && (
        <div id="patto-form-anchor">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 0. Prerequisiti */}
            <Card>
              <CardHeader>
                <SectionTitle>0 · Prerequisiti per l'accoglienza</SectionTitle>
                <CardDescription>
                  Verificare prima della firma del patto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    key: "hasIncome",
                    label:
                      "Ha un reddito minimo o sussidio che permette di mantenersi e pagare la quota mensile.",
                  },
                  {
                    key: "hasDocuments",
                    label:
                      "È in regola con i documenti (identità, permesso di soggiorno o pratica in corso).",
                  },
                  {
                    key: "acceptsPatto",
                    label:
                      "Ha compreso e accetta di firmare il Patto di Accoglienza.",
                  },
                  {
                    key: "acceptsRegolamento",
                    label: "Ha accettato e firmato il Regolamento della casa.",
                  },
                ].map(({ key, label }) => (
                  <Label
                    key={key}
                    className="flex items-start gap-3 font-normal"
                  >
                    <Checkbox
                      checked={formData.prerequisites[key]}
                      onCheckedChange={(checked) =>
                        handlePrerequisiteChange(key, Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm">{label}</span>
                  </Label>
                ))}
              </CardContent>
            </Card>

            {/* 1. Dati delle parti */}
            <Card>
              <CardHeader>
                <SectionTitle>1 · Dati delle parti</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="patto-personName">
                      Nome e cognome (persona accolta)
                    </Label>
                    <Input
                      id="patto-personName"
                      value={formData.personName}
                      onChange={(e) =>
                        handleChange("personName", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-personContacts">
                      Contatti (persona accolta)
                    </Label>
                    <Input
                      id="patto-personContacts"
                      placeholder="Telefono, email…"
                      value={formData.personContacts}
                      onChange={(e) =>
                        handleChange("personContacts", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-serviceName">
                      Nome del servizio / ente
                    </Label>
                    <Input
                      id="patto-serviceName"
                      value={formData.serviceName}
                      onChange={(e) =>
                        handleChange("serviceName", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-operatorName">
                      Operatore di riferimento
                    </Label>
                    <Input
                      id="patto-operatorName"
                      value={formData.operatorSignatureName}
                      onChange={(e) =>
                        handleChange("operatorSignatureName", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-serviceContacts">
                      Contatti servizio
                    </Label>
                    <Input
                      id="patto-serviceContacts"
                      value={formData.serviceContacts}
                      onChange={(e) =>
                        handleChange("serviceContacts", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-destinationHouse">
                      Abitazione di destinazione
                    </Label>
                    <Input
                      id="patto-destinationHouse"
                      value={formData.destinationHouse}
                      onChange={(e) =>
                        handleChange("destinationHouse", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-startDate">
                      Data inizio accoglienza
                    </Label>
                    <Input
                      id="patto-startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        handleChange("startDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-endDate">
                      Data fine accoglienza (se prevista)
                    </Label>
                    <Input
                      id="patto-endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Impegni economici */}
            <Card>
              <CardHeader>
                <SectionTitle>
                  2 · Impegni economici (persona accolta)
                </SectionTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="patto-quotaRequired">
                      Quota minima richiesta (€)
                    </Label>
                    <Input
                      id="patto-quotaRequired"
                      type="number"
                      min="0"
                      placeholder="Es. 300"
                      value={formData.monthlyQuotaRequired}
                      onChange={(e) =>
                        handleChange("monthlyQuotaRequired", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-quotaAgreed">
                      Quota concordata (€)
                    </Label>
                    <Input
                      id="patto-quotaAgreed"
                      type="number"
                      min="0"
                      value={formData.monthlyQuotaAgreed}
                      onChange={(e) =>
                        handleChange("monthlyQuotaAgreed", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-paymentDueDay">
                      Entro il giorno del mese
                    </Label>
                    <Input
                      id="patto-paymentDueDay"
                      placeholder="Es. 5"
                      value={formData.paymentDueDay}
                      onChange={(e) =>
                        handleChange("paymentDueDay", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patto-paymentMethod">
                      Modalità di pagamento
                    </Label>
                    <select
                      id="patto-paymentMethod"
                      className={SELECT_CLASS}
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        handleChange("paymentMethod", e.target.value)
                      }
                    >
                      <option value="">Seleziona</option>
                      {PAYMENT_METHOD_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.paymentMethod === "Altro" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="patto-paymentMethodOther">
                        Specifica modalità
                      </Label>
                      <Input
                        id="patto-paymentMethodOther"
                        value={formData.paymentMethodOther}
                        onChange={(e) =>
                          handleChange("paymentMethodOther", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Impegni convivenza */}
            <Card>
              <CardHeader>
                <SectionTitle>
                  3 · Impegni nella convivenza in casa
                </SectionTitle>
                <CardDescription>
                  Regole concordate sulla vita quotidiana in casa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommitmentList items={CONVIVENZA_ITEMS} />
                <div className="space-y-2">
                  <Label htmlFor="patto-notesConvivenza">
                    Note aggiuntive sulla convivenza
                  </Label>
                  <Textarea
                    id="patto-notesConvivenza"
                    rows={3}
                    placeholder="Regole specifiche di questa casa, accordi particolari…"
                    value={formData.notesConvivenza}
                    onChange={(e) =>
                      handleChange("notesConvivenza", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Impegni vicinato */}
            <Card>
              <CardHeader>
                <SectionTitle>
                  4 · Impegni nel rapporto con il vicinato
                </SectionTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommitmentList items={VICINATO_ITEMS} />
                <div className="space-y-2">
                  <Label htmlFor="patto-notesVicinato">Note sul vicinato</Label>
                  <Textarea
                    id="patto-notesVicinato"
                    rows={2}
                    placeholder="Specificità del contesto condominiale o del quartiere…"
                    value={formData.notesVicinato}
                    onChange={(e) =>
                      handleChange("notesVicinato", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. Cura spazi */}
            <Card>
              <CardHeader>
                <SectionTitle>5 · Impegni nella cura degli spazi</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommitmentList items={CURA_SPAZI_ITEMS} />
                <div className="space-y-2">
                  <Label htmlFor="patto-notesCuraSpazi">
                    Note sulla cura degli spazi
                  </Label>
                  <Textarea
                    id="patto-notesCuraSpazi"
                    rows={2}
                    placeholder="Accordi specifici su manutenzione, responsabilità…"
                    value={formData.notesCuraSpazi}
                    onChange={(e) =>
                      handleChange("notesCuraSpazi", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* 6. Impegni del servizio (read-only informational) */}
            <Card className="bg-muted/20">
              <CardHeader>
                <SectionTitle>6 · Impegni del servizio</SectionTitle>
                <CardDescription>
                  Il servizio si impegna a garantire questi standard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {[
                    "Garantire un riferimento educativo nel percorso di autonomia abitativa.",
                    "Costruire insieme un Progetto Personalizzato e rivederlo periodicamente.",
                    "Promuovere gli incontri di monitoraggio individuali e di gruppo.",
                    "Facilitare le relazioni interne all'abitazione e con il vicinato.",
                    "Orientare la persona all'utilizzo dei servizi del territorio.",
                    "Affiancare nella manutenzione e nella gestione dell'immobile.",
                    "Restare a disposizione per chiarimenti sul Patto e sul Regolamento.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 7. Firma */}
            <Card>
              <CardHeader>
                <SectionTitle>7 · Firma del patto</SectionTitle>
                <CardDescription>
                  Con la firma si dichiara di aver compreso il contenuto del
                  Patto e di impegnarsi a rispettarlo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Persona accolta</p>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="patto-personSigName">
                        Nome e cognome
                      </Label>
                      <Input
                        id="patto-personSigName"
                        value={formData.personSignatureName}
                        onChange={(e) =>
                          handleChange("personSignatureName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patto-personSigDate">
                        Data della firma
                      </Label>
                      <Input
                        id="patto-personSigDate"
                        type="date"
                        value={formData.personSignatureDate}
                        onChange={(e) =>
                          handleChange("personSignatureDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-medium">
                      Operatore di riferimento
                    </p>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="patto-opSigName">Nome e cognome</Label>
                      <Input
                        id="patto-opSigName"
                        value={formData.operatorSignatureName}
                        onChange={(e) =>
                          handleChange("operatorSignatureName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patto-opSigDate">Data della firma</Label>
                      <Input
                        id="patto-opSigDate"
                        type="date"
                        value={formData.operatorSignatureDate}
                        onChange={(e) =>
                          handleChange("operatorSignatureDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? "Aggiorna patto" : "Salva patto"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Annulla
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Storico patti</CardTitle>
          <CardDescription>
            I patti sono ordinati dal più recente al più vecchio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun patto di accoglienza ancora registrato per questa persona.
            </p>
          ) : (
            entries.map((entry) => {
              const allPrerequisites = entry.prerequisites
                ? Object.values(entry.prerequisites).every(Boolean)
                : false;
              const isSigned =
                entry.personSignatureDate && entry.operatorSignatureDate;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {formatDateLabel(entry.startDate)}
                      </Badge>
                      {entry.endDate ? (
                        <Badge variant="outline">
                          → {formatDateLabel(entry.endDate)}
                        </Badge>
                      ) : null}
                      {isSigned ? (
                        <Badge variant="outline">Firmato</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-amber-700"
                        >
                          Non firmato
                        </Badge>
                      )}
                      {allPrerequisites ? (
                        <Badge variant="outline">Prerequisiti ✓</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium">
                      {entry.personName || anagraficaName}
                    </p>
                    {entry.destinationHouse ? (
                      <p className="text-sm text-muted-foreground">
                        {entry.destinationHouse}
                        {entry.monthlyQuotaAgreed
                          ? ` · €${entry.monthlyQuotaAgreed}/mese`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleEdit(entry)}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Modifica
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
