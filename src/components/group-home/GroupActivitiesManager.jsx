"use client";

import { Loader2, PencilLine, Plus, RotateCcw, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import {
  createGroupActivityEntry,
  updateGroupActivityEntry,
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
  ASSESSMENT_ITEM_MAP,
  ASSESSMENT_ITEMS_BY_AREA,
  createEmptyGrpResponses,
  GROUP_ACTIVITY_LOCATION_OPTIONS,
  GROUP_ACTIVITY_TYPE_OPTIONS,
  GRP_ITEMS,
  GRP_SCALE,
  MONITORING_SCALE,
} from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyParticipants(residents = []) {
  return residents.map((resident) => ({
    anagraficaId: resident.id,
    name: resident.name,
    participationNote: "",
    present: false,
  }));
}

function createEmptyForm(residents = []) {
  return {
    activityNumber: "",
    activityType: "",
    activityTypeOther: "",
    description: "",
    educatorNotes: "",
    endTime: "",
    grpResponses: createEmptyGrpResponses(),
    happenedAt: getTodayDate(),
    individualItems: [],
    locationOther: "",
    locationType: "",
    nextActivityAt: "",
    nextCommitmentsGroup: "",
    nextCommitmentsOperator: "",
    operatorName: "",
    participants: createEmptyParticipants(residents),
    startTime: "",
  };
}

function createFormFromEntry(entry, residents = []) {
  if (!entry) return createEmptyForm(residents);

  const participantMap = new Map(
    (entry.participants || []).map((p) => [p.anagraficaId, p]),
  );

  const grpResponses = createEmptyGrpResponses();
  if (entry.grpResponses) {
    for (const item of GRP_ITEMS) {
      const saved = entry.grpResponses[item.id] || {};
      grpResponses[item.id] = {
        value: saved.value || "",
        note: saved.note || "",
      };
    }
  }

  return {
    activityNumber: entry.activityNumber || "",
    activityType: entry.activityType || "",
    activityTypeOther: entry.activityTypeOther || "",
    description: entry.description || "",
    educatorNotes: entry.educatorNotes || "",
    endTime: entry.endTime || "",
    grpResponses,
    happenedAt: formatDateForInput(entry.happenedAt) || getTodayDate(),
    individualItems: Array.isArray(entry.individualItems)
      ? entry.individualItems.map((it) => ({
          anagraficaId: it.anagraficaId || "",
          name: it.name || it.forWho || "",
          itemId: it.itemId || "",
          note: it.note || it.notes || "",
          value: it.value || "",
        }))
      : [],
    locationOther: entry.locationOther || "",
    locationType: entry.locationType || "",
    nextActivityAt: formatDateForInput(entry.nextActivityAt),
    nextCommitmentsGroup:
      entry.nextCommitmentsGroup || entry.nextCommitments || "",
    nextCommitmentsOperator: entry.nextCommitmentsOperator || "",
    operatorName: entry.operatorName || "",
    participants: residents.map((resident) => {
      const saved = participantMap.get(resident.id) || {};
      return {
        anagraficaId: resident.id,
        name: resident.name,
        participationNote: saved.participationNote || "",
        present: Boolean(saved.present),
      };
    }),
    startTime: entry.startTime || "",
  };
}

export const GroupActivitiesManager = forwardRef(
  function GroupActivitiesManager(
    { initialEntries = [], residents = [], structureId },
    ref,
  ) {
    const [entries, setEntries] = useState(initialEntries);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(() => createEmptyForm(residents));
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [pickerIndividual, setPickerIndividual] = useState({
      anagraficaId: "",
      itemId: "",
    });

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

    const updateParticipant = (anagraficaId, field, value) => {
      setFormData((current) => ({
        ...current,
        participants: current.participants.map((p) =>
          p.anagraficaId === anagraficaId ? { ...p, [field]: value } : p,
        ),
      }));
    };

    const handleAddIndividualItem = () => {
      if (!pickerIndividual.anagraficaId || !pickerIndividual.itemId) return;
      if (
        formData.individualItems.some(
          (it) =>
            it.anagraficaId === pickerIndividual.anagraficaId &&
            it.itemId === pickerIndividual.itemId,
        )
      ) {
        return;
      }
      const resident = residents.find(
        (item) => item.id === pickerIndividual.anagraficaId,
      );
      setFormData((current) => ({
        ...current,
        individualItems: [
          ...current.individualItems,
          {
            anagraficaId: pickerIndividual.anagraficaId,
            name: resident?.name || "",
            itemId: pickerIndividual.itemId,
            note: "",
            value: "",
          },
        ],
      }));
      setPickerIndividual({ anagraficaId: "", itemId: "" });
    };

    const handleRemoveIndividualItem = (anagraficaId, itemId) => {
      setFormData((current) => ({
        ...current,
        individualItems: current.individualItems.filter(
          (it) => it.anagraficaId !== anagraficaId || it.itemId !== itemId,
        ),
      }));
    };

    const updateIndividualItem = (anagraficaId, itemId, field, value) => {
      setFormData((current) => ({
        ...current,
        individualItems: current.individualItems.map((it) =>
          it.anagraficaId === anagraficaId && it.itemId === itemId
            ? { ...it, [field]: value }
            : it,
        ),
      }));
    };

    const openNew = () => {
      setEditingId(null);
      setFormData(createEmptyForm(residents));
      setPickerIndividual({ anagraficaId: "", itemId: "" });
      setOpen(true);
    };

    const handleEdit = (entry) => {
      setEditingId(entry.id);
      setFormData(createFormFromEntry(entry, residents));
      setPickerIndividual({ anagraficaId: "", itemId: "" });
      setOpen(true);
    };

    const handleClose = () => {
      if (loading) return;
      setOpen(false);
      setEditingId(null);
      setFormData(createEmptyForm(residents));
      setPickerIndividual({ anagraficaId: "", itemId: "" });
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      setLoading(true);

      try {
        const result = editingId
          ? await updateGroupActivityEntry(structureId, editingId, formData)
          : await createGroupActivityEntry(structureId, formData);

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
            new Date(b.happenedAt || b.updatedAt || 0).getTime() -
            new Date(a.happenedAt || a.updatedAt || 0).getTime(),
        );

        setEntries(nextEntries);
        toast.success(
          editingId
            ? "Attività di gruppo aggiornata"
            : "Attività di gruppo salvata",
        );
        setOpen(false);
        setEditingId(null);
        setFormData(createEmptyForm(residents));
        setPickerIndividual({ anagraficaId: "", itemId: "" });
      } catch (error) {
        console.error(error);
        toast.error("Errore durante il salvataggio dell'attività");
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      openNew,
    }));

    const selectedIndividualKeys = new Set(
      formData.individualItems.map((it) => `${it.anagraficaId}::${it.itemId}`),
    );

    return (
      <div className="space-y-6">
        <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Attività di Gruppo</CardTitle>
                <CardDescription className="mt-1">
                  Diario di bordo delle attività, degli incontri e delle
                  dinamiche di gruppo della casa.
                </CardDescription>
              </div>
              <Button type="button" onClick={openNew} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nuova attività
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {entries.length} attività registrate
            </Badge>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                {editingId ? "Modifica attività" : "Nuova attività di gruppo"}
              </DialogTitle>
            </DialogHeader>

            <form
              id="group-activity-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6 py-5"
            >
              <div className="space-y-8">
                {/* 1. Dati generali */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    1 · Dati dell'attività
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="ga-date">Data</Label>
                      <Input
                        id="ga-date"
                        type="date"
                        value={formData.happenedAt}
                        onChange={(e) =>
                          handleChange("happenedAt", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-start">Ora inizio</Label>
                      <Input
                        id="ga-start"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          handleChange("startTime", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-end">Ora fine</Label>
                      <Input
                        id="ga-end"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) =>
                          handleChange("endTime", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-number">N° progressivo</Label>
                      <Input
                        id="ga-number"
                        placeholder="Es. 1"
                        value={formData.activityNumber}
                        onChange={(e) =>
                          handleChange("activityNumber", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-operator">Operatore</Label>
                      <Input
                        id="ga-operator"
                        value={formData.operatorName}
                        onChange={(e) =>
                          handleChange("operatorName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-location">Luogo</Label>
                      <select
                        id="ga-location"
                        className={SELECT_CLASS}
                        value={formData.locationType}
                        onChange={(e) =>
                          handleChange("locationType", e.target.value)
                        }
                      >
                        <option value="">Seleziona</option>
                        {GROUP_ACTIVITY_LOCATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-locationOther">Altro luogo</Label>
                      <Input
                        id="ga-locationOther"
                        value={formData.locationOther}
                        onChange={(e) =>
                          handleChange("locationOther", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-type">Tipologia</Label>
                      <select
                        id="ga-type"
                        className={SELECT_CLASS}
                        value={formData.activityType}
                        onChange={(e) =>
                          handleChange("activityType", e.target.value)
                        }
                      >
                        <option value="">Seleziona</option>
                        {GROUP_ACTIVITY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.activityType === "Altro" ? (
                      <div className="space-y-2">
                        <Label htmlFor="ga-typeOther">
                          Specifica tipologia
                        </Label>
                        <Input
                          id="ga-typeOther"
                          value={formData.activityTypeOther}
                          onChange={(e) =>
                            handleChange("activityTypeOther", e.target.value)
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 2. Partecipazione */}
                {formData.participants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      2 · Partecipazione
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {formData.participants.map((participant) => (
                        <div
                          key={participant.anagraficaId}
                          className="space-y-3 rounded-lg border p-4"
                        >
                          <Label className="flex items-center gap-3">
                            <Checkbox
                              checked={participant.present}
                              onCheckedChange={(checked) =>
                                updateParticipant(
                                  participant.anagraficaId,
                                  "present",
                                  Boolean(checked),
                                )
                              }
                            />
                            <span>{participant.name}</span>
                          </Label>
                          <Input
                            placeholder="Atteggiamento osservato…"
                            value={participant.participationNote}
                            onChange={(e) =>
                              updateParticipant(
                                participant.anagraficaId,
                                "participationNote",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Descrizione */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    3 · Descrizione e temi trattati
                  </h3>
                  <Textarea
                    id="ga-description"
                    rows={4}
                    placeholder="Cosa è successo, argomenti discussi, azioni compiute…"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                  />
                </div>

                {/* 4. Indicatori GRP */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      4 · Indicatori GRP osservati
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valutazione 0–3 del momento — non una sintesi del periodo.
                      Lasciare vuoto se l'indicatore non è osservabile in questa
                      attività.
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

                {/* 5. Item individuali toccati */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      5 · Item individuali eventualmente toccati
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Per Laboratori e Uscite: indicare gli item YAK rilevanti e
                      per chi, così che possano essere riportati nelle Schede di
                      Intervento individuali.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <select
                      className={SELECT_CLASS}
                      value={pickerIndividual.anagraficaId}
                      onChange={(e) =>
                        setPickerIndividual((current) => ({
                          ...current,
                          anagraficaId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Persona…</option>
                      {residents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={SELECT_CLASS}
                      value={pickerIndividual.itemId}
                      onChange={(e) =>
                        setPickerIndividual((current) => ({
                          ...current,
                          itemId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Scegli un item…</option>
                      {ASSESSMENT_ITEMS_BY_AREA.map((area) => {
                        const available = area.items.filter(
                          (item) =>
                            !selectedIndividualKeys.has(
                              `${pickerIndividual.anagraficaId}::${item.id}`,
                            ),
                        );
                        if (available.length === 0) return null;
                        return (
                          <optgroup
                            key={area.id}
                            label={`${area.emoji} ${area.shortLabel}`}
                          >
                            {available.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.id} · {item.operatorLabel}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddIndividualItem}
                      disabled={
                        !pickerIndividual.anagraficaId ||
                        !pickerIndividual.itemId
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi
                    </Button>
                  </div>
                  {formData.individualItems.length > 0 && (
                    <div className="space-y-3">
                      {formData.individualItems.map((it) => {
                        const meta = ASSESSMENT_ITEM_MAP[it.itemId];
                        return (
                          <div
                            key={`${it.anagraficaId}::${it.itemId}`}
                            className="rounded-lg border p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {it.name || "Persona"}
                                </Badge>
                                <Badge variant="outline">{it.itemId}</Badge>
                                {meta ? (
                                  <p className="text-sm font-medium">
                                    {meta.operatorLabel}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleRemoveIndividualItem(
                                    it.anagraficaId,
                                    it.itemId,
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <RadioGroup
                              value={it.value}
                              onValueChange={(value) =>
                                updateIndividualItem(
                                  it.anagraficaId,
                                  it.itemId,
                                  "value",
                                  value,
                                )
                              }
                              className="grid gap-2 sm:grid-cols-4"
                            >
                              {MONITORING_SCALE.map((option) => (
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
                              placeholder="Cosa è emerso per questa persona su questo item…"
                              value={it.note}
                              onChange={(e) =>
                                updateIndividualItem(
                                  it.anagraficaId,
                                  it.itemId,
                                  "note",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. Note operatore */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    6 · Note dell'operatore
                  </h3>
                  <Textarea
                    id="ga-educatorNotes"
                    rows={4}
                    placeholder="Tensioni emerse, proposte del gruppo, richieste di aiuto, segnali per l'équipe…"
                    value={formData.educatorNotes}
                    onChange={(e) =>
                      handleChange("educatorNotes", e.target.value)
                    }
                  />
                </div>

                {/* 7. Impegni e prossimo incontro */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    7 · Impegni per il prossimo incontro
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ga-commitmentsGroup">
                        Cosa farà il gruppo
                      </Label>
                      <Textarea
                        id="ga-commitmentsGroup"
                        rows={3}
                        value={formData.nextCommitmentsGroup}
                        onChange={(e) =>
                          handleChange("nextCommitmentsGroup", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ga-commitmentsOperator">
                        Cosa farà / preparerà l'operatore
                      </Label>
                      <Textarea
                        id="ga-commitmentsOperator"
                        rows={3}
                        value={formData.nextCommitmentsOperator}
                        onChange={(e) =>
                          handleChange(
                            "nextCommitmentsOperator",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ga-nextActivity">
                      Data del prossimo incontro
                    </Label>
                    <Input
                      id="ga-nextActivity"
                      type="date"
                      value={formData.nextActivityAt}
                      onChange={(e) =>
                        handleChange("nextActivityAt", e.target.value)
                      }
                      className="sm:max-w-xs"
                    />
                  </div>
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
                form="group-activity-form"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? "Aggiorna attività" : "Salva attività"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Storico attività</CardTitle>
            <CardDescription>
              Ogni attività conserva partecipazione, indicatori GRP e impegni.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna attività di gruppo ancora registrata.
              </p>
            ) : (
              entries.map((entry) => {
                const presentCount = (entry.participants || []).filter(
                  (p) => p.present,
                ).length;
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
                          {formatDateLabel(entry.happenedAt)}
                        </Badge>
                        {entry.activityType ? (
                          <Badge variant="outline">
                            {entry.activityType}
                            {entry.activityTypeOther
                              ? `: ${entry.activityTypeOther}`
                              : ""}
                          </Badge>
                        ) : null}
                        <Badge variant="outline">{presentCount} presenti</Badge>
                        {grpCount > 0 ? (
                          <Badge variant="outline">{grpCount} GRP</Badge>
                        ) : null}
                        {entry.activityNumber ? (
                          <Badge variant="outline">
                            #{entry.activityNumber}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium">
                        {entry.operatorName || "Operatore non indicato"}
                      </p>
                      {entry.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {entry.description}
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
