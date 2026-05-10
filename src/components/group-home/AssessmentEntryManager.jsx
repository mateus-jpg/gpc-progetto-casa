"use client";

import {
  ChevronDown,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createIndividualMonitoringEntry,
  createSelfAssessmentEntry,
  updateIndividualMonitoringEntry,
  updateSelfAssessmentEntry,
} from "@/actions/group-home";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSESSMENT_ITEMS,
  ASSESSMENT_ITEMS_BY_AREA,
  createEmptyAssessmentResponses,
  DOCUMENT_OPTIONS,
  INCOME_OPTIONS,
  MONITORING_SCALE,
  SELF_ASSESSMENT_SCALE,
} from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(variant) {
  return {
    compiledAt: getTodayDate(),
    facts: {
      averageMonthlyIncome: "",
      documentsOwned: [],
      incomeTypes: [],
      motherTongue: "",
      otherLanguages: "",
    },
    notes: "",
    operatorName: "",
    previousRecordedAt: "",
    projectReferenceAt: "",
    qualitative: {
      andamento: "",
      criticita: "",
      eventiSignificativi: "",
      puntiDiForza: "",
      relazioneProgetto: "",
    },
    responses: createEmptyAssessmentResponses(),
    reviewAt: "",
    sequenceNumber: "",
    serviceName: "",
    sharing: {
      equipeSharedAt: "",
      operatorSignatureName: "",
      personSharedAt: "",
    },
    selfOverview: {
      help: "",
      improve: "",
      strength: "",
    },
    synthetic: {
      motivation: "",
      status: "",
    },
    nextActions: [],
    variant,
  };
}

function countAnsweredResponses(entry) {
  const responses = entry?.responses || {};
  return Object.values(responses).filter((response) => response?.value).length;
}

function countAnsweredItemsForArea(responses, area) {
  return area.items.filter((item) => responses[item.id]?.value).length;
}

function toggleArrayValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function createEmptyNextAction() {
  return {
    action: "",
    dueAt: "",
    linkedItemIds: [],
    localId: globalThis.crypto?.randomUUID?.() || String(Date.now()),
  };
}

const CONFIG_BY_VARIANT = {
  monitoring: {
    createAction: createIndividualMonitoringEntry,
    createLabel: "Salva monitoraggio",
    description:
      "Scheda compilata dall'operatore con la stessa griglia item dell'autovalutazione.",
    editLabel: "Aggiorna monitoraggio",
    emptyState:
      "Nessun monitoraggio ancora registrato per questa persona in questa casa.",
    scaleOptions: MONITORING_SCALE,
    successCreate: "Monitoraggio salvato",
    successUpdate: "Monitoraggio aggiornato",
    title: "Monitoraggio Individuale",
    updateAction: updateIndividualMonitoringEntry,
  },
  self: {
    createAction: createSelfAssessmentEntry,
    createLabel: "Salva autovalutazione",
    description:
      "Scheda guidata con scala persona 0–3, salvata con gli stessi item del monitoraggio.",
    editLabel: "Aggiorna autovalutazione",
    emptyState:
      "Nessuna autovalutazione ancora registrata per questa persona in questa casa.",
    scaleOptions: SELF_ASSESSMENT_SCALE,
    successCreate: "Autovalutazione salvata",
    successUpdate: "Autovalutazione aggiornata",
    title: "Autovalutazione",
    updateAction: updateSelfAssessmentEntry,
  },
};

export function AssessmentEntryManager({
  anagraficaId,
  anagraficaName,
  initialEntries = [],
  structureId,
  variant,
}) {
  const config = CONFIG_BY_VARIANT[variant];
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyForm(variant));
  const [loading, setLoading] = useState(false);

  const introCount = useMemo(
    () => entries.filter((entry) => countAnsweredResponses(entry) > 0).length,
    [entries],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(createEmptyForm(variant));
  };

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const handleAddNextAction = () => {
    setFormData((current) => ({
      ...current,
      nextActions: [...current.nextActions, createEmptyNextAction()],
    }));
  };

  const handleRemoveNextAction = (index) => {
    setFormData((current) => ({
      ...current,
      nextActions: current.nextActions.filter((_, idx) => idx !== index),
    }));
  };

  const handleNextActionChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      nextActions: current.nextActions.map((action, idx) =>
        idx === index ? { ...action, [field]: value } : action,
      ),
    }));
  };

  const handleResponseChange = (itemId, field, value) => {
    setFormData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [itemId]: {
          ...current.responses[itemId],
          [field]: value,
        },
      },
    }));
  };

  const loadEntryForEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      compiledAt: formatDateForInput(entry.compiledAt),
      facts: {
        averageMonthlyIncome: entry.facts?.averageMonthlyIncome ?? "",
        documentsOwned: entry.facts?.documentsOwned || [],
        incomeTypes: entry.facts?.incomeTypes || [],
        motherTongue: entry.facts?.motherTongue || "",
        otherLanguages: entry.facts?.otherLanguages || "",
      },
      notes: entry.notes || "",
      operatorName: entry.operatorName || "",
      previousRecordedAt: formatDateForInput(entry.previousRecordedAt),
      projectReferenceAt: formatDateForInput(entry.projectReferenceAt),
      qualitative: {
        andamento: entry.qualitative?.andamento || "",
        criticita: entry.qualitative?.criticita || "",
        eventiSignificativi: entry.qualitative?.eventiSignificativi || "",
        puntiDiForza: entry.qualitative?.puntiDiForza || "",
        relazioneProgetto: entry.qualitative?.relazioneProgetto || "",
      },
      responses: ASSESSMENT_ITEMS.reduce((accumulator, item) => {
        const response = entry.responses?.[item.id] || {};
        accumulator[item.id] = {
          value: response.value || "",
          note: response.note || "",
        };
        return accumulator;
      }, {}),
      reviewAt: formatDateForInput(entry.reviewAt),
      sequenceNumber: entry.sequenceNumber || "",
      serviceName: entry.serviceName || "",
      sharing: {
        equipeSharedAt: formatDateForInput(entry.sharing?.equipeSharedAt),
        operatorSignatureName: entry.sharing?.operatorSignatureName || "",
        personSharedAt: formatDateForInput(entry.sharing?.personSharedAt),
      },
      selfOverview: {
        help: entry.selfOverview?.help || "",
        improve: entry.selfOverview?.improve || "",
        strength: entry.selfOverview?.strength || "",
      },
      synthetic: {
        motivation: entry.synthetic?.motivation || "",
        status: entry.synthetic?.status || "",
      },
      nextActions: Array.isArray(entry.nextActions)
        ? entry.nextActions.map((action) => ({
            action: action.action || "",
            dueAt: formatDateForInput(action.dueAt),
            linkedItemIds: action.linkedItemIds || [],
            localId:
              globalThis.crypto?.randomUUID?.() ||
              `${action.action}-${action.dueAt}`,
          }))
        : [],
      variant,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const action = editingId ? config.updateAction : config.createAction;
      const result = editingId
        ? await action(structureId, anagraficaId, editingId, formData)
        : await action(structureId, anagraficaId, formData);

      if (!result.success) {
        toast.error("Salvataggio non riuscito");
        return;
      }

      const nextEntries = editingId
        ? entries.map((entry) =>
            entry.id === result.entry.id ? result.entry : entry,
          )
        : [result.entry, ...entries];

      nextEntries.sort(
        (left, right) =>
          new Date(right.compiledAt || right.updatedAt || 0).getTime() -
          new Date(left.compiledAt || left.updatedAt || 0).getTime(),
      );

      setEntries(nextEntries);
      toast.success(editingId ? config.successUpdate : config.successCreate);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Si è verificato un errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{anagraficaName}</Badge>
          <span>{introCount} compilazioni registrate</span>
          {editingId ? (
            <Badge variant="outline">Modalità modifica attiva</Badge>
          ) : null}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Modifica compilazione" : "Nuova compilazione"}
            </CardTitle>
            <CardDescription>
              I valori vengono salvati con ID stabili e restano disponibili
              nello storico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor={`${variant}-operatorName`}>
                  {variant === "self"
                    ? "Operatore / servizio"
                    : "Operatore di riferimento"}
                </Label>
                <Input
                  id={`${variant}-operatorName`}
                  value={formData.operatorName}
                  onChange={(event) =>
                    handleChange("operatorName", event.target.value)
                  }
                />
              </div>

              {variant === "self" ? (
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-serviceName`}>
                    Servizio / contesto
                  </Label>
                  <Input
                    id={`${variant}-serviceName`}
                    value={formData.serviceName}
                    onChange={(event) =>
                      handleChange("serviceName", event.target.value)
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-sequenceNumber`}>
                    Numero progressivo monitoraggio
                  </Label>
                  <Input
                    id={`${variant}-sequenceNumber`}
                    placeholder="1° / 2° / 3°"
                    value={formData.sequenceNumber}
                    onChange={(event) =>
                      handleChange("sequenceNumber", event.target.value)
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={`${variant}-compiledAt`}>
                  Data compilazione
                </Label>
                <Input
                  id={`${variant}-compiledAt`}
                  type="date"
                  value={formData.compiledAt}
                  onChange={(event) =>
                    handleChange("compiledAt", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${variant}-reviewAt`}>
                  Data revisione prevista
                </Label>
                <Input
                  id={`${variant}-reviewAt`}
                  type="date"
                  value={formData.reviewAt}
                  onChange={(event) =>
                    handleChange("reviewAt", event.target.value)
                  }
                />
              </div>

              {variant === "monitoring" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-previousRecordedAt`}>
                      Data rilevazione precedente
                    </Label>
                    <Input
                      id={`${variant}-previousRecordedAt`}
                      type="date"
                      value={formData.previousRecordedAt}
                      onChange={(event) =>
                        handleChange("previousRecordedAt", event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-projectReferenceAt`}>
                      Progetto Personalizzato di riferimento
                    </Label>
                    <Input
                      id={`${variant}-projectReferenceAt`}
                      type="date"
                      value={formData.projectReferenceAt}
                      onChange={(event) =>
                        handleChange("projectReferenceAt", event.target.value)
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${variant}-notes`}>Note generali</Label>
              <Textarea
                id={`${variant}-notes`}
                rows={4}
                value={formData.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {variant === "self" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Dati essenziali</CardTitle>
                <CardDescription>
                  Campi fattuali YAK raccolti insieme alla persona.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-motherTongue`}>
                      Lingua madre
                    </Label>
                    <Input
                      id={`${variant}-motherTongue`}
                      value={formData.facts.motherTongue}
                      onChange={(event) =>
                        handleNestedChange(
                          "facts",
                          "motherTongue",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-otherLanguages`}>
                      Altre lingue parlate
                    </Label>
                    <Input
                      id={`${variant}-otherLanguages`}
                      value={formData.facts.otherLanguages}
                      onChange={(event) =>
                        handleNestedChange(
                          "facts",
                          "otherLanguages",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-averageIncome`}>
                      Importo medio mensile (€)
                    </Label>
                    <Input
                      id={`${variant}-averageIncome`}
                      min="0"
                      type="number"
                      value={formData.facts.averageMonthlyIncome}
                      onChange={(event) =>
                        handleNestedChange(
                          "facts",
                          "averageMonthlyIncome",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Documenti in possesso</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {DOCUMENT_OPTIONS.map((option) => (
                        <Label
                          key={option}
                          className="flex items-center gap-2 font-normal"
                        >
                          <Checkbox
                            checked={formData.facts.documentsOwned.includes(
                              option,
                            )}
                            onCheckedChange={() =>
                              handleNestedChange(
                                "facts",
                                "documentsOwned",
                                toggleArrayValue(
                                  formData.facts.documentsOwned,
                                  option,
                                ),
                              )
                            }
                          />
                          {option}
                        </Label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Entrate mensili</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {INCOME_OPTIONS.map((option) => (
                        <Label
                          key={option}
                          className="flex items-center gap-2 font-normal"
                        >
                          <Checkbox
                            checked={formData.facts.incomeTypes.includes(
                              option,
                            )}
                            onCheckedChange={() =>
                              handleNestedChange(
                                "facts",
                                "incomeTypes",
                                toggleArrayValue(
                                  formData.facts.incomeTypes,
                                  option,
                                ),
                              )
                            }
                          />
                          {option}
                        </Label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uno sguardo d'insieme</CardTitle>
                <CardDescription>
                  Domande finali per leggere il quadro complessivo con la
                  persona.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-strength`}>
                    Il mio punto di forza principale è
                  </Label>
                  <Textarea
                    id={`${variant}-strength`}
                    rows={3}
                    value={formData.selfOverview.strength}
                    onChange={(event) =>
                      handleNestedChange(
                        "selfOverview",
                        "strength",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-improve`}>
                    La cosa che vorrei migliorare di più è
                  </Label>
                  <Textarea
                    id={`${variant}-improve`}
                    rows={3}
                    value={formData.selfOverview.improve}
                    onChange={(event) =>
                      handleNestedChange(
                        "selfOverview",
                        "improve",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-help`}>
                    Qualcosa che mi aiuterebbe molto in questo momento
                  </Label>
                  <Textarea
                    id={`${variant}-help`}
                    rows={3}
                    value={formData.selfOverview.help}
                    onChange={(event) =>
                      handleNestedChange(
                        "selfOverview",
                        "help",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {variant === "monitoring" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Osservazioni qualitative</CardTitle>
                <CardDescription>
                  Sintesi narrativa del periodo di monitoraggio.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  ["andamento", "Andamento generale"],
                  ["puntiDiForza", "Punti di forza"],
                  ["criticita", "Criticità"],
                  ["eventiSignificativi", "Eventi significativi"],
                  [
                    "relazioneProgetto",
                    "Relazione con progetto personalizzato",
                  ],
                ].map(([field, label]) => (
                  <div
                    key={field}
                    className={
                      field === "relazioneProgetto"
                        ? "space-y-2 md:col-span-2"
                        : "space-y-2"
                    }
                  >
                    <Label htmlFor={`${variant}-${field}`}>{label}</Label>
                    <Textarea
                      id={`${variant}-${field}`}
                      rows={3}
                      value={formData.qualitative[field]}
                      onChange={(event) =>
                        handleNestedChange(
                          "qualitative",
                          field,
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valutazione sintetica e prossimi passi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Andamento rispetto alla rilevazione precedente</Label>
                  <RadioGroup
                    className="grid gap-2 sm:grid-cols-3"
                    value={formData.synthetic.status}
                    onValueChange={(value) =>
                      handleNestedChange("synthetic", "status", value)
                    }
                  >
                    {["Miglioramento", "Stabilità", "Peggioramento"].map(
                      (option) => (
                        <Label
                          key={option}
                          className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-3"
                        >
                          <RadioGroupItem value={option} />
                          {option}
                        </Label>
                      ),
                    )}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant}-syntheticMotivation`}>
                    Motivazione sintetica
                  </Label>
                  <Textarea
                    id={`${variant}-syntheticMotivation`}
                    rows={3}
                    value={formData.synthetic.motivation}
                    onChange={(event) =>
                      handleNestedChange(
                        "synthetic",
                        "motivation",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Prossimi passi operativi</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNextAction}
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi azione
                    </Button>
                  </div>
                  {formData.nextActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nessuna azione inserita.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.nextActions.map((action, index) => (
                        <div
                          key={action.localId}
                          className="space-y-3 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid flex-1 gap-3 md:grid-cols-[1fr_12rem]">
                              <div className="space-y-2">
                                <Label>Azione</Label>
                                <Input
                                  value={action.action}
                                  onChange={(event) =>
                                    handleNextActionChange(
                                      index,
                                      "action",
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Entro quando</Label>
                                <Input
                                  type="date"
                                  value={action.dueAt}
                                  onChange={(event) =>
                                    handleNextActionChange(
                                      index,
                                      "dueAt",
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveNextAction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {ASSESSMENT_ITEMS_BY_AREA.map((area) =>
                              area.items.map((item) => (
                                <Label
                                  key={item.id}
                                  className="flex items-center gap-2 text-sm font-normal"
                                >
                                  <Checkbox
                                    checked={action.linkedItemIds.includes(
                                      item.id,
                                    )}
                                    onCheckedChange={() =>
                                      handleNextActionChange(
                                        index,
                                        "linkedItemIds",
                                        toggleArrayValue(
                                          action.linkedItemIds,
                                          item.id,
                                        ),
                                      )
                                    }
                                  />
                                  {item.id}
                                </Label>
                              )),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-signature`}>
                      Operatore che ha compilato
                    </Label>
                    <Input
                      id={`${variant}-signature`}
                      value={formData.sharing.operatorSignatureName}
                      onChange={(event) =>
                        handleNestedChange(
                          "sharing",
                          "operatorSignatureName",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-equipeSharedAt`}>
                      Condivisione in équipe
                    </Label>
                    <Input
                      id={`${variant}-equipeSharedAt`}
                      type="date"
                      value={formData.sharing.equipeSharedAt}
                      onChange={(event) =>
                        handleNestedChange(
                          "sharing",
                          "equipeSharedAt",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant}-personSharedAt`}>
                      Restituzione alla persona
                    </Label>
                    <Input
                      id={`${variant}-personSharedAt`}
                      type="date"
                      value={formData.sharing.personSharedAt}
                      onChange={(event) =>
                        handleNestedChange(
                          "sharing",
                          "personSharedAt",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {ASSESSMENT_ITEMS_BY_AREA.map((area) => {
          const answeredCount = countAnsweredItemsForArea(
            formData.responses,
            area,
          );

          return (
            <Collapsible key={area.id} defaultOpen>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <button
                      className="group flex w-full items-start justify-between gap-4 text-left"
                      type="button"
                    >
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {area.emoji} {area.label}
                        </CardTitle>
                        <CardDescription>{area.description}</CardDescription>
                        <Badge variant="outline">
                          {answeredCount}/{area.items.length} item compilati
                        </Badge>
                      </div>
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {area.items.map((item) => {
                      const response = formData.responses[item.id] || {
                        value: "",
                        note: "",
                      };

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-muted/20 p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.id}</Badge>
                            <p className="font-medium">
                              {variant === "self"
                                ? item.personLabel
                                : item.operatorLabel}
                            </p>
                          </div>

                          <p className="mb-4 text-sm text-muted-foreground">
                            {variant === "self"
                              ? item.operatorLabel
                              : item.description}
                          </p>

                          <RadioGroup
                            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                            value={response.value}
                            onValueChange={(value) =>
                              handleResponseChange(item.id, "value", value)
                            }
                          >
                            {config.scaleOptions.map((option) => (
                              <Label
                                key={option.value}
                                className="flex cursor-pointer items-start gap-3 rounded-md border bg-background px-3 py-3"
                              >
                                <RadioGroupItem value={option.value} />
                                <span className="font-medium">
                                  {"emoji" in option ? `${option.emoji} ` : ""}
                                  {option.label}
                                </span>
                              </Label>
                            ))}
                          </RadioGroup>

                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`${variant}-${item.id}-note`}>
                              Nota su {item.id}
                            </Label>
                            <Textarea
                              id={`${variant}-${item.id}-note`}
                              rows={2}
                              value={response.note}
                              onChange={(event) =>
                                handleResponseChange(
                                  item.id,
                                  "note",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 shadow-[0_-12px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur lg:-mx-6 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {countAnsweredResponses({ responses: formData.responses })} item
              compilati in questa scheda
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={loading} type="submit">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? config.editLabel : config.createLabel}
              </Button>
              <Button
                disabled={loading}
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Storico compilazioni</CardTitle>
          <CardDescription>
            Le schede sono ordinate dalla più recente alla più vecchia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{config.emptyState}</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {formatDateLabel(entry.compiledAt)}
                    </Badge>
                    <Badge variant="outline">
                      {countAnsweredResponses(entry)} item compilati
                    </Badge>
                    {entry.sequenceNumber ? (
                      <Badge variant="outline">{entry.sequenceNumber}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium">
                    {entry.operatorName || "Operatore non indicato"}
                  </p>
                  {entry.notes ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadEntryForEdit(entry)}
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
