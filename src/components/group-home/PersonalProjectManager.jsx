"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { upsertPersonalProject } from "@/actions/group-home";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ASSESSMENT_ITEMS_BY_AREA,
  createEmptyGoal,
  createEmptyGoalsByArea,
  DOCUMENT_OPTIONS,
  GROUP_HOME_AREAS,
  INCOME_OPTIONS,
} from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(anagraficaName) {
  return {
    actionsSharedAt: "",
    compilationDate: getTodayDate(),
    facts: {
      averageMonthlyIncome: "",
      documentsOwned: [],
      incomeTypes: [],
      motherTongue: "",
      otherLanguages: "",
    },
    feelings: {
      aspirations: "",
      difficulties: "",
      strengths: "",
    },
    goalsByArea: createEmptyGoalsByArea(),
    observations: {
      ABI: "",
      ECO: "",
      PER: "",
      REL: "",
    },
    observationsSharedAt: getTodayDate(),
    operatorName: "",
    otherGoals: "",
    plannedReviewDate: "",
    sharing: {
      guestName: anagraficaName || "",
      guestSignatureName: "",
      nextReviewAt: "",
      operatorSignatureName: "",
      sharedAt: "",
    },
  };
}

function createFormFromProject(project, anagraficaName) {
  if (!project) {
    return createEmptyForm(anagraficaName);
  }

  return {
    actionsSharedAt: formatDateForInput(project.actionsSharedAt),
    compilationDate:
      formatDateForInput(project.compilationDate) || getTodayDate(),
    facts: {
      averageMonthlyIncome: project.facts?.averageMonthlyIncome ?? "",
      documentsOwned: project.facts?.documentsOwned || [],
      incomeTypes: project.facts?.incomeTypes || [],
      motherTongue: project.facts?.motherTongue || "",
      otherLanguages: project.facts?.otherLanguages || "",
    },
    feelings: {
      aspirations: project.feelings?.aspirations || "",
      difficulties: project.feelings?.difficulties || "",
      strengths: project.feelings?.strengths || "",
    },
    goalsByArea: GROUP_HOME_AREAS.reduce((accumulator, area) => {
      const goals = project.goalsByArea?.[area.id];
      accumulator[area.id] =
        Array.isArray(goals) && goals.length > 0
          ? goals.map((goal) => ({
              goal: goal.goal || "",
              linkedItemIds: goal.linkedItemIds || [],
              timeframe: goal.timeframe || "",
              successIndicators: goal.successIndicators || "",
            }))
          : [createEmptyGoal()];
      return accumulator;
    }, {}),
    observations: {
      ABI: project.observations?.ABI || "",
      ECO: project.observations?.ECO || "",
      PER: project.observations?.PER || "",
      REL: project.observations?.REL || "",
    },
    observationsSharedAt:
      formatDateForInput(project.observationsSharedAt) || getTodayDate(),
    operatorName: project.operatorName || "",
    otherGoals: project.otherGoals || "",
    plannedReviewDate: formatDateForInput(project.plannedReviewDate),
    sharing: {
      guestName: project.sharing?.guestName || anagraficaName || "",
      guestSignatureName: project.sharing?.guestSignatureName || "",
      nextReviewAt: formatDateForInput(project.sharing?.nextReviewAt),
      operatorSignatureName: project.sharing?.operatorSignatureName || "",
      sharedAt: formatDateForInput(project.sharing?.sharedAt),
    },
  };
}

function toggleArrayValue(values, value) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function PersonalProjectManager({
  anagraficaId,
  anagraficaName,
  initialProject,
  structureId,
}) {
  const [formData, setFormData] = useState(() =>
    createFormFromProject(initialProject, anagraficaName),
  );
  const [loading, setLoading] = useState(false);
  const [savedProject, setSavedProject] = useState(initialProject);

  const linkedItemsByArea = useMemo(
    () =>
      Object.fromEntries(
        ASSESSMENT_ITEMS_BY_AREA.map((area) => [
          area.id,
          area.items.map((item) => ({
            id: item.id,
            label: item.operatorLabel,
          })),
        ]),
      ),
    [],
  );

  const setNestedValue = (section, field, value) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const updateGoal = (areaId, index, field, value) => {
    setFormData((current) => ({
      ...current,
      goalsByArea: {
        ...current.goalsByArea,
        [areaId]: current.goalsByArea[areaId].map((goal, goalIndex) =>
          goalIndex === index ? { ...goal, [field]: value } : goal,
        ),
      },
    }));
  };

  const toggleGoalLinkedItem = (areaId, index, itemId) => {
    setFormData((current) => ({
      ...current,
      goalsByArea: {
        ...current.goalsByArea,
        [areaId]: current.goalsByArea[areaId].map((goal, goalIndex) =>
          goalIndex === index
            ? {
                ...goal,
                linkedItemIds: toggleArrayValue(
                  goal.linkedItemIds || [],
                  itemId,
                ),
              }
            : goal,
        ),
      },
    }));
  };

  const addGoal = (areaId) => {
    setFormData((current) => ({
      ...current,
      goalsByArea: {
        ...current.goalsByArea,
        [areaId]: [...current.goalsByArea[areaId], createEmptyGoal()],
      },
    }));
  };

  const removeGoal = (areaId, index) => {
    setFormData((current) => {
      const nextGoals = current.goalsByArea[areaId].filter(
        (_, goalIndex) => goalIndex !== index,
      );
      return {
        ...current,
        goalsByArea: {
          ...current.goalsByArea,
          [areaId]: nextGoals.length > 0 ? nextGoals : [createEmptyGoal()],
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await upsertPersonalProject(
        structureId,
        anagraficaId,
        formData,
      );

      if (!result.success) {
        toast.error("Salvataggio non riuscito");
        return;
      }

      setSavedProject(result.project);
      setFormData(createFormFromProject(result.project, anagraficaName));
      toast.success("Progetto personalizzato aggiornato");
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio del progetto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
        <CardHeader>
          <CardTitle>Progetto Personalizzato</CardTitle>
          <CardDescription>
            Documento unico per persona e casa, compilabile in due momenti:
            osservazioni iniziali e azioni condivise.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{anagraficaName}</Badge>
          {savedProject?.updatedAt ? (
            <span>
              Ultimo aggiornamento: {formatDateLabel(savedProject.updatedAt)}
            </span>
          ) : (
            <span>Nuovo progetto da compilare</span>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dati identificativi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="project-guestName">Nome e cognome</Label>
              <Input
                id="project-guestName"
                value={formData.sharing.guestName}
                onChange={(event) =>
                  setNestedValue("sharing", "guestName", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-operatorName">
                Operatore di riferimento
              </Label>
              <Input
                id="project-operatorName"
                value={formData.operatorName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    operatorName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-compilationDate">Data compilazione</Label>
              <Input
                id="project-compilationDate"
                type="date"
                value={formData.compilationDate}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    compilationDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-plannedReviewDate">
                Data revisione prevista
              </Label>
              <Input
                id="project-plannedReviewDate"
                type="date"
                value={formData.plannedReviewDate}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    plannedReviewDate: event.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parte 1 · Osservazioni condivise</CardTitle>
            <CardDescription>
              Fotografia della situazione di partenza all'ingresso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-observationsSharedAt">
                  Data osservazioni condivise
                </Label>
                <Input
                  id="project-observationsSharedAt"
                  type="date"
                  value={formData.observationsSharedAt}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      observationsSharedAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {GROUP_HOME_AREAS.map((area) => (
              <div key={area.id} className="space-y-2">
                <Label htmlFor={`observation-${area.id}`}>
                  {area.emoji} {area.label}
                </Label>
                <Textarea
                  id={`observation-${area.id}`}
                  rows={4}
                  value={formData.observations[area.id]}
                  onChange={(event) =>
                    setNestedValue("observations", area.id, event.target.value)
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come mi sento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project-strengths">Mi sento capace di…</Label>
              <Textarea
                id="project-strengths"
                rows={6}
                value={formData.feelings.strengths}
                onChange={(event) =>
                  setNestedValue("feelings", "strengths", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-difficulties">
                Mi sento in difficoltà con…
              </Label>
              <Textarea
                id="project-difficulties"
                rows={6}
                value={formData.feelings.difficulties}
                onChange={(event) =>
                  setNestedValue("feelings", "difficulties", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-aspirations">Mi piacerebbe…</Label>
              <Textarea
                id="project-aspirations"
                rows={6}
                value={formData.feelings.aspirations}
                onChange={(event) =>
                  setNestedValue("feelings", "aspirations", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documenti e dati essenziali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Documenti in possesso</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DOCUMENT_OPTIONS.map((option) => (
                  <Label
                    key={option}
                    className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  >
                    <Checkbox
                      checked={formData.facts.documentsOwned.includes(option)}
                      onCheckedChange={() =>
                        setNestedValue(
                          "facts",
                          "documentsOwned",
                          toggleArrayValue(
                            formData.facts.documentsOwned,
                            option,
                          ),
                        )
                      }
                    />
                    <span>{option}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="project-motherTongue">Lingua madre</Label>
                <Input
                  id="project-motherTongue"
                  value={formData.facts.motherTongue}
                  onChange={(event) =>
                    setNestedValue("facts", "motherTongue", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="project-otherLanguages">
                  Altre lingue parlate
                </Label>
                <Input
                  id="project-otherLanguages"
                  value={formData.facts.otherLanguages}
                  onChange={(event) =>
                    setNestedValue(
                      "facts",
                      "otherLanguages",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-incomeValue">
                  Importo medio mensile (€)
                </Label>
                <Input
                  id="project-incomeValue"
                  type="number"
                  value={formData.facts.averageMonthlyIncome}
                  onChange={(event) =>
                    setNestedValue(
                      "facts",
                      "averageMonthlyIncome",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Entrate mensili</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {INCOME_OPTIONS.map((option) => (
                  <Label
                    key={option}
                    className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  >
                    <Checkbox
                      checked={formData.facts.incomeTypes.includes(option)}
                      onCheckedChange={() =>
                        setNestedValue(
                          "facts",
                          "incomeTypes",
                          toggleArrayValue(formData.facts.incomeTypes, option),
                        )
                      }
                    />
                    <span>{option}</span>
                  </Label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parte 2 · Azioni condivise</CardTitle>
            <CardDescription>
              Obiettivi concreti per area e tempi di lavoro condivisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-actionsSharedAt">
                  Data azioni condivise
                </Label>
                <Input
                  id="project-actionsSharedAt"
                  type="date"
                  value={formData.actionsSharedAt}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      actionsSharedAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {GROUP_HOME_AREAS.map((area) => (
              <div key={area.id} className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {area.emoji} {area.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {area.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addGoal(area.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi obiettivo
                  </Button>
                </div>

                {formData.goalsByArea[area.id].map((goal, index) => (
                  <div
                    key={`${area.id}-${index}`}
                    className="space-y-4 rounded-lg bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="secondary">Obiettivo {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeGoal(area.id, index)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Rimuovi
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Obiettivo (cosa)</Label>
                      <Textarea
                        rows={3}
                        value={goal.goal}
                        onChange={(event) =>
                          updateGoal(area.id, index, "goal", event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Item collegati</Label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {linkedItemsByArea[area.id].map((item) => (
                          <Label
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl border px-3 py-3"
                          >
                            <Checkbox
                              checked={goal.linkedItemIds.includes(item.id)}
                              onCheckedChange={() =>
                                toggleGoalLinkedItem(area.id, index, item.id)
                              }
                            />
                            <div>
                              <p className="font-medium">{item.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.label}
                              </p>
                            </div>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tempi</Label>
                        <Input
                          value={goal.timeframe}
                          onChange={(event) =>
                            updateGoal(
                              area.id,
                              index,
                              "timeframe",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Indicatori di risultato</Label>
                        <Input
                          value={goal.successIndicators}
                          onChange={(event) =>
                            updateGoal(
                              area.id,
                              index,
                              "successIndicators",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="project-otherGoals">
                Altri obiettivi trasversali
              </Label>
              <Textarea
                id="project-otherGoals"
                rows={5}
                value={formData.otherGoals}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    otherGoals: event.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condivisione e firma</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="project-guestSignatureName">
                Persona accolta (nome firma)
              </Label>
              <Input
                id="project-guestSignatureName"
                value={formData.sharing.guestSignatureName}
                onChange={(event) =>
                  setNestedValue(
                    "sharing",
                    "guestSignatureName",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-operatorSignatureName">
                Operatore di riferimento (nome firma)
              </Label>
              <Input
                id="project-operatorSignatureName"
                value={formData.sharing.operatorSignatureName}
                onChange={(event) =>
                  setNestedValue(
                    "sharing",
                    "operatorSignatureName",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-sharedAt">
                Data di condivisione del progetto
              </Label>
              <Input
                id="project-sharedAt"
                type="date"
                value={formData.sharing.sharedAt}
                onChange={(event) =>
                  setNestedValue("sharing", "sharedAt", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-nextReviewAt">Prossima revisione</Label>
              <Input
                id="project-nextReviewAt"
                type="date"
                value={formData.sharing.nextReviewAt}
                onChange={(event) =>
                  setNestedValue("sharing", "nextReviewAt", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button disabled={loading} type="submit">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salva progetto personalizzato
        </Button>
      </form>
    </div>
  );
}
