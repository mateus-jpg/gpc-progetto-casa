"use client";

import { Loader2, PencilLine, Plus, RotateCcw } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import {
  createGroupEvaluationEntry,
  updateGroupEvaluationEntry,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyGrpResponses,
  GRP_ITEMS,
  GRP_SCALE,
} from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm() {
  return {
    agreedActions: "",
    criticalIssues: "",
    evaluatedAt: getTodayDate(),
    followUpAt: "",
    groupSelfResponses: createEmptyGrpResponses(),
    grpResponses: createEmptyGrpResponses(),
    notes: "",
    operatorName: "",
    periodLabel: "",
    puntiDiForza: "",
    valutazioneSintetica: "",
  };
}

function createFormFromEntry(entry) {
  if (!entry) return createEmptyForm();

  const grpResponses = createEmptyGrpResponses();
  const groupSelfResponses = createEmptyGrpResponses();
  if (entry.grpResponses) {
    for (const item of GRP_ITEMS) {
      const saved = entry.grpResponses[item.id] || {};
      grpResponses[item.id] = {
        value: saved.value || "",
        note: saved.note || "",
      };
    }
  }
  if (entry.groupSelfResponses) {
    for (const item of GRP_ITEMS) {
      const saved = entry.groupSelfResponses[item.id] || {};
      groupSelfResponses[item.id] = {
        value: saved.value || "",
        note: saved.note || "",
      };
    }
  }

  return {
    agreedActions: entry.agreedActions || "",
    criticalIssues: entry.criticalIssues || "",
    evaluatedAt: formatDateForInput(entry.evaluatedAt) || getTodayDate(),
    followUpAt: formatDateForInput(entry.followUpAt),
    groupSelfResponses,
    grpResponses,
    notes: entry.notes || "",
    operatorName: entry.operatorName || "",
    periodLabel: entry.periodLabel || "",
    puntiDiForza: entry.puntiDiForza || "",
    valutazioneSintetica: entry.valutazioneSintetica || "",
  };
}

export const GroupEvaluationsManager = forwardRef(
  function GroupEvaluationsManager({ initialEntries = [], structureId }, ref) {
    const [entries, setEntries] = useState(initialEntries);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(createEmptyForm);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleChange = (field, value) => {
      setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleGrpChange = (itemId, field, value) => {
      setFormData((current) => ({
        ...current,
        grpResponses: {
          ...current.grpResponses,
          [itemId]: { ...current.grpResponses[itemId], [field]: value },
        },
      }));
    };

    const handleGroupSelfChange = (itemId, field, value) => {
      setFormData((current) => ({
        ...current,
        groupSelfResponses: {
          ...current.groupSelfResponses,
          [itemId]: {
            ...current.groupSelfResponses[itemId],
            [field]: value,
          },
        },
      }));
    };

    const openNew = () => {
      setEditingId(null);
      setFormData(createEmptyForm());
      setOpen(true);
    };

    const handleEdit = (entry) => {
      setEditingId(entry.id);
      setFormData(createFormFromEntry(entry));
      setOpen(true);
    };

    const handleClose = () => {
      if (loading) return;
      setOpen(false);
      setEditingId(null);
      setFormData(createEmptyForm());
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      setLoading(true);

      try {
        const result = editingId
          ? await updateGroupEvaluationEntry(structureId, editingId, formData)
          : await createGroupEvaluationEntry(structureId, formData);

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
          (a, b) =>
            new Date(b.evaluatedAt || b.updatedAt || 0).getTime() -
            new Date(a.evaluatedAt || a.updatedAt || 0).getTime(),
        );

        setEntries(nextEntries);
        toast.success(
          editingId
            ? "Valutazione di gruppo aggiornata"
            : "Valutazione di gruppo salvata",
        );
        setOpen(false);
        setEditingId(null);
        setFormData(createEmptyForm());
      } catch (error) {
        console.error(error);
        toast.error("Errore durante il salvataggio della valutazione");
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      openNew,
    }));

    return (
      <div className="space-y-6">
        <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Valutazioni di Gruppo</CardTitle>
                <CardDescription className="mt-1">
                  Incontro periodico di verifica sulla convivenza: valutazione
                  GRP complessiva e narrativa del periodo.
                </CardDescription>
              </div>
              <Button type="button" onClick={openNew} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nuova valutazione
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {entries.length} valutazioni registrate
            </Badge>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                {editingId
                  ? "Modifica valutazione di gruppo"
                  : "Nuova valutazione di gruppo"}
              </DialogTitle>
            </DialogHeader>

            <form
              id="group-evaluation-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6 py-5"
            >
              <div className="space-y-8">
                {/* 1. Intestazione */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    1 · Dati della valutazione
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="ge-evaluatedAt">Data valutazione</Label>
                      <Input
                        id="ge-evaluatedAt"
                        type="date"
                        value={formData.evaluatedAt}
                        onChange={(e) =>
                          handleChange("evaluatedAt", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ge-operator">Operatore / educatore</Label>
                      <Input
                        id="ge-operator"
                        value={formData.operatorName}
                        onChange={(e) =>
                          handleChange("operatorName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ge-period">Periodo / etichetta</Label>
                      <Input
                        id="ge-period"
                        placeholder="Es. maggio 2026"
                        value={formData.periodLabel}
                        onChange={(e) =>
                          handleChange("periodLabel", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ge-followUp">Follow-up</Label>
                      <Input
                        id="ge-followUp"
                        type="date"
                        value={formData.followUpAt}
                        onChange={(e) =>
                          handleChange("followUpAt", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Indicatori GRP */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      2 · Indicatori GRP
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valutazione sintetica del periodo — non di una singola
                      attività. Scala: 0 Frammentato → 3 Coeso.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {GRP_ITEMS.map((item) => {
                      const response = formData.grpResponses[item.id] || {
                        value: "",
                        note: "",
                      };
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.id}</Badge>
                            <p className="text-sm font-medium">{item.label}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                          <RadioGroup
                            value={response.value}
                            onValueChange={(value) =>
                              handleGrpChange(item.id, "value", value)
                            }
                            className="grid gap-2 sm:grid-cols-5"
                          >
                            {GRP_SCALE.map((option) => (
                              <Label
                                key={option.value}
                                className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm"
                              >
                                <RadioGroupItem value={option.value} />
                                {option.label}
                              </Label>
                            ))}
                          </RadioGroup>
                          <Textarea
                            rows={2}
                            placeholder="Note su questo indicatore…"
                            value={response.note}
                            onChange={(e) =>
                              handleGrpChange(item.id, "note", e.target.value)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Autovalutazione collettiva */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      3 · Autovalutazione del gruppo
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Domande in lingua semplice da proporre periodicamente al
                      gruppo.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {GRP_ITEMS.map((item) => {
                      const response = formData.groupSelfResponses[item.id] || {
                        value: "",
                        note: "",
                      };
                      return (
                        <div
                          key={item.id}
                          className="space-y-3 rounded-lg border bg-muted/20 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.id}</Badge>
                            <p className="text-sm font-medium">
                              {item.groupQuestion}
                            </p>
                          </div>
                          <RadioGroup
                            value={response.value}
                            onValueChange={(value) =>
                              handleGroupSelfChange(item.id, "value", value)
                            }
                            className="grid gap-2 sm:grid-cols-5"
                          >
                            {GRP_SCALE.map((option) => (
                              <Label
                                key={option.value}
                                className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                              >
                                <RadioGroupItem value={option.value} />
                                {option.label}
                              </Label>
                            ))}
                          </RadioGroup>
                          <Textarea
                            rows={2}
                            placeholder="Parole del gruppo, esempi, note…"
                            value={response.note}
                            onChange={(e) =>
                              handleGroupSelfChange(
                                item.id,
                                "note",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Narrativa del periodo */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    4 · Narrativa del periodo
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="ge-notes">Andamento generale</Label>
                    <Textarea
                      id="ge-notes"
                      rows={4}
                      placeholder="Come è andato il periodo: clima, dinamiche principali, fatti significativi…"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ge-puntiDiForza">Punti di forza</Label>
                    <Textarea
                      id="ge-puntiDiForza"
                      rows={3}
                      placeholder="Cosa ha funzionato bene nel gruppo questo periodo…"
                      value={formData.puntiDiForza}
                      onChange={(e) =>
                        handleChange("puntiDiForza", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ge-criticalIssues">Criticità</Label>
                    <Textarea
                      id="ge-criticalIssues"
                      rows={3}
                      placeholder="Tensioni irrisolte, comportamenti problematici, elementi da portare in équipe…"
                      value={formData.criticalIssues}
                      onChange={(e) =>
                        handleChange("criticalIssues", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ge-valutazione">
                      Valutazione sintetica
                    </Label>
                    <Textarea
                      id="ge-valutazione"
                      rows={3}
                      placeholder="Giudizio complessivo del periodo: il gruppo è in crescita, stabile, in difficoltà…"
                      value={formData.valutazioneSintetica}
                      onChange={(e) =>
                        handleChange("valutazioneSintetica", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 5. Azioni concordate */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    5 · Azioni concordate
                  </h3>
                  <Textarea
                    id="ge-agreedActions"
                    rows={3}
                    placeholder="Impegni presi con il gruppo, azioni dell'operatore, scadenze…"
                    value={formData.agreedActions}
                    onChange={(e) =>
                      handleChange("agreedActions", e.target.value)
                    }
                  />
                </div>
              </div>
            </form>

            <DialogFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Annulla
              </Button>
              <Button
                type="submit"
                form="group-evaluation-form"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? "Aggiorna valutazione" : "Salva valutazione"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Storico valutazioni</CardTitle>
            <CardDescription>
              Valutazioni periodiche della convivenza e del funzionamento della
              casa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna valutazione di gruppo ancora registrata.
              </p>
            ) : (
              entries.map((entry) => {
                const grpCount = entry.grpResponses
                  ? Object.values(entry.grpResponses).filter(
                      (r) => r?.value && r.value !== "",
                    ).length
                  : 0;

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {formatDateLabel(entry.evaluatedAt)}
                        </Badge>
                        {entry.periodLabel ? (
                          <Badge variant="outline">{entry.periodLabel}</Badge>
                        ) : null}
                        {grpCount > 0 ? (
                          <Badge variant="outline">{grpCount}/5 GRP</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium">
                        {entry.operatorName || "Operatore non indicato"}
                      </p>
                      {entry.notes ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {entry.notes}
                        </p>
                      ) : entry.valutazioneSintetica ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {entry.valutazioneSintetica}
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
  },
);
