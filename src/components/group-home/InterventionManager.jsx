"use client";

import { Loader2, PencilLine, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createInterventionEntry,
  updateInterventionEntry,
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
  INTERVENTION_LOCATION_OPTIONS,
  INTERVENTION_TYPE_OPTIONS,
  INTERVENTION_WHO_OPTIONS,
  MONITORING_SCALE,
} from "@/lib/group-home/catalog";
import {
  formatDateForInput,
  formatDateLabel,
  formatDateTimeLabel,
} from "@/lib/group-home/helpers";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm() {
  return {
    diary: "",
    durationMinutes: "",
    equipeNotes: "",
    happenedAt: getTodayDate(),
    interventionNumber: "",
    interventionType: "",
    interventionTypeOther: "",
    items: [],
    linkedGoals: "",
    locationSpecific: "",
    locationType: "",
    nextAppointmentAt: "",
    nextStepsOperator: "",
    nextStepsPerson: "",
    operatorName: "",
    startTime: "",
    whoPresent: [],
    whoPresentOther: "",
  };
}

function createFormFromEntry(entry) {
  if (!entry) return createEmptyForm();
  return {
    diary: entry.diary || "",
    durationMinutes: entry.durationMinutes ?? "",
    equipeNotes: entry.equipeNotes || "",
    happenedAt: formatDateForInput(entry.happenedAt) || getTodayDate(),
    interventionNumber: entry.interventionNumber || "",
    interventionType: entry.interventionType || "",
    interventionTypeOther: entry.interventionTypeOther || "",
    items: Array.isArray(entry.items)
      ? entry.items.map((it) => ({
          itemId: it.itemId || "",
          value: it.value || "",
          note: it.note || "",
        }))
      : [],
    linkedGoals: entry.linkedGoals || "",
    locationSpecific: entry.locationSpecific || "",
    locationType: entry.locationType || "",
    nextAppointmentAt: formatDateForInput(entry.nextAppointmentAt),
    nextStepsOperator: entry.nextStepsOperator || "",
    nextStepsPerson: entry.nextStepsPerson || "",
    operatorName: entry.operatorName || "",
    startTime: entry.startTime || "",
    whoPresent: Array.isArray(entry.whoPresent)
      ? entry.whoPresent
      : entry.whoPresent
        ? [entry.whoPresent]
        : [],
    whoPresentOther: entry.whoPresentOther || "",
  };
}

const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

export function InterventionManager({
  anagraficaId,
  anagraficaName,
  initialEntries = [],
  structureId,
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickerItemId, setPickerItemId] = useState("");

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleWhoPresent = (value) => {
    setFormData((current) => ({
      ...current,
      whoPresent: current.whoPresent.includes(value)
        ? current.whoPresent.filter((item) => item !== value)
        : [...current.whoPresent, value],
    }));
  };

  const handleAddItem = () => {
    if (!pickerItemId) return;
    if (formData.items.length >= 3) return;
    if (formData.items.some((it) => it.itemId === pickerItemId)) return;
    setFormData((current) => ({
      ...current,
      items: [...current.items, { itemId: pickerItemId, value: "", note: "" }],
    }));
    setPickerItemId("");
  };

  const handleRemoveItem = (itemId) => {
    setFormData((current) => ({
      ...current,
      items: current.items.filter((it) => it.itemId !== itemId),
    }));
  };

  const handleItemChange = (itemId, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((it) =>
        it.itemId === itemId ? { ...it, [field]: value } : it,
      ),
    }));
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(createEmptyForm());
    setPickerItemId("");
    setOpen(true);
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData(createFormFromEntry(entry));
    setPickerItemId("");
    setOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setEditingId(null);
    setFormData(createEmptyForm());
    setPickerItemId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = editingId
        ? await updateInterventionEntry(
            structureId,
            anagraficaId,
            editingId,
            formData,
          )
        : await createInterventionEntry(structureId, anagraficaId, formData);

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
      toast.success(editingId ? "Intervento aggiornato" : "Intervento salvato");
      setOpen(false);
      setEditingId(null);
      setFormData(createEmptyForm());
      setPickerItemId("");
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio dell'intervento");
    } finally {
      setLoading(false);
    }
  };

  const selectedItemIds = new Set(formData.items.map((it) => it.itemId));

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Diario degli Interventi</CardTitle>
              <CardDescription className="mt-1">
                Registrazione degli incontri individuali: colloqui, visite,
                accompagnamenti e note operative per ciascun intervento.
              </CardDescription>
            </div>
            <Button type="button" onClick={openNew} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo intervento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{anagraficaName}</Badge>
          <Badge variant="secondary">
            {entries.length} interventi registrati
          </Badge>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editingId ? "Modifica intervento" : "Nuovo intervento"}
            </DialogTitle>
          </DialogHeader>

          <form
            id="intervention-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            <div className="space-y-6">
              {/* Header fields */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="intervention-date">Data intervento</Label>
                  <Input
                    id="intervention-date"
                    type="date"
                    value={formData.happenedAt}
                    onChange={(e) => handleChange("happenedAt", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-startTime">Ora inizio</Label>
                  <Input
                    id="intervention-startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-duration">Durata (min)</Label>
                  <Input
                    id="intervention-duration"
                    type="number"
                    min="1"
                    max="480"
                    placeholder="Es. 60"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      handleChange("durationMinutes", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-number">N° progressivo</Label>
                  <Input
                    id="intervention-number"
                    placeholder="Es. 1"
                    value={formData.interventionNumber}
                    onChange={(e) =>
                      handleChange("interventionNumber", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-operator">Operatore</Label>
                  <Input
                    id="intervention-operator"
                    value={formData.operatorName}
                    onChange={(e) =>
                      handleChange("operatorName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-type">Tipo di intervento</Label>
                  <select
                    id="intervention-type"
                    className={SELECT_CLASS}
                    value={formData.interventionType}
                    onChange={(e) =>
                      handleChange("interventionType", e.target.value)
                    }
                  >
                    <option value="">Seleziona</option>
                    {INTERVENTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.interventionType === "Altro" ? (
                  <div className="space-y-2">
                    <Label htmlFor="intervention-type-other">
                      Specifica tipo
                    </Label>
                    <Input
                      id="intervention-type-other"
                      value={formData.interventionTypeOther}
                      onChange={(e) =>
                        handleChange("interventionTypeOther", e.target.value)
                      }
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="intervention-location">Luogo</Label>
                  <select
                    id="intervention-location"
                    className={SELECT_CLASS}
                    value={formData.locationType}
                    onChange={(e) =>
                      handleChange("locationType", e.target.value)
                    }
                  >
                    <option value="">Seleziona</option>
                    {INTERVENTION_LOCATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-location-specific">
                    Luogo specifico
                  </Label>
                  <Input
                    id="intervention-location-specific"
                    value={formData.locationSpecific}
                    onChange={(e) =>
                      handleChange("locationSpecific", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-3 sm:col-span-2 xl:col-span-3">
                  <Label htmlFor="intervention-who">Presenti</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {INTERVENTION_WHO_OPTIONS.map((opt) => (
                      <Label
                        key={opt}
                        className="flex items-center gap-2 font-normal"
                      >
                        <Checkbox
                          checked={formData.whoPresent.includes(opt)}
                          onCheckedChange={() => toggleWhoPresent(opt)}
                        />
                        {opt}
                      </Label>
                    ))}
                  </div>
                  {formData.whoPresent.includes("Altro") ? (
                    <Input
                      placeholder="Specifica altro presente"
                      value={formData.whoPresentOther}
                      onChange={(e) =>
                        handleChange("whoPresentOther", e.target.value)
                      }
                    />
                  ) : null}
                </div>
              </div>

              {/* YAK items touched */}
              <div className="space-y-4">
                <div>
                  <Label>Item YAK toccati</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Seleziona gli item su cui si è lavorato in questo incontro e
                    assegna un punteggio 0–3. La scheda accetta massimo 3 item.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    className={`${SELECT_CLASS} flex-1`}
                    value={pickerItemId}
                    onChange={(e) => setPickerItemId(e.target.value)}
                  >
                    <option value="">Scegli un item…</option>
                    {ASSESSMENT_ITEMS_BY_AREA.map((area) => {
                      const available = area.items.filter(
                        (item) => !selectedItemIds.has(item.id),
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
                    onClick={handleAddItem}
                    disabled={!pickerItemId || formData.items.length >= 3}
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi
                  </Button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessun item selezionato.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item) => {
                      const meta = ASSESSMENT_ITEM_MAP[item.itemId];
                      if (!meta) return null;
                      return (
                        <div
                          key={item.itemId}
                          className="rounded-lg border bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{meta.id}</Badge>
                              <p className="text-sm font-medium">
                                {meta.operatorLabel}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => handleRemoveItem(item.itemId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <RadioGroup
                            value={item.value}
                            onValueChange={(value) =>
                              handleItemChange(item.itemId, "value", value)
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
                            placeholder="Nota su questo item…"
                            value={item.note}
                            onChange={(e) =>
                              handleItemChange(
                                item.itemId,
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

              <div className="space-y-2">
                <Label htmlFor="intervention-linkedGoals">
                  Obiettivi del Progetto Personalizzato collegati
                </Label>
                <Textarea
                  id="intervention-linkedGoals"
                  rows={3}
                  placeholder="Indica obiettivi o riferimenti specifici del progetto su cui si è lavorato…"
                  value={formData.linkedGoals}
                  onChange={(e) => handleChange("linkedGoals", e.target.value)}
                />
              </div>

              {/* Narrative */}
              <div className="space-y-2">
                <Label htmlFor="intervention-diary">Diario / Narrazione</Label>
                <Textarea
                  id="intervention-diary"
                  rows={5}
                  placeholder="Descrivi cosa è emerso nell'incontro, il contesto, le osservazioni chiave…"
                  value={formData.diary}
                  onChange={(e) => handleChange("diary", e.target.value)}
                />
              </div>

              {/* Next steps — two column */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="intervention-nextPerson">
                    Prossimi passi — Persona
                  </Label>
                  <Textarea
                    id="intervention-nextPerson"
                    rows={3}
                    placeholder="Cosa farà la persona entro il prossimo incontro…"
                    value={formData.nextStepsPerson}
                    onChange={(e) =>
                      handleChange("nextStepsPerson", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervention-nextOperator">
                    Prossimi passi — Operatore
                  </Label>
                  <Textarea
                    id="intervention-nextOperator"
                    rows={3}
                    placeholder="Cosa farà l'operatore (contatti, verifiche, invii)…"
                    value={formData.nextStepsOperator}
                    onChange={(e) =>
                      handleChange("nextStepsOperator", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Equipe notes */}
              <div className="space-y-2">
                <Label htmlFor="intervention-equipe">Note per l'équipe</Label>
                <Textarea
                  id="intervention-equipe"
                  rows={3}
                  placeholder="Informazioni rilevanti per condividere con il team…"
                  value={formData.equipeNotes}
                  onChange={(e) => handleChange("equipeNotes", e.target.value)}
                />
              </div>

              {/* Next appointment */}
              <div className="space-y-2">
                <Label htmlFor="intervention-nextAppointment">
                  Prossimo appuntamento
                </Label>
                <Input
                  id="intervention-nextAppointment"
                  type="date"
                  value={formData.nextAppointmentAt}
                  onChange={(e) =>
                    handleChange("nextAppointmentAt", e.target.value)
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
            <Button type="submit" form="intervention-form" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingId ? "Aggiorna intervento" : "Salva intervento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Storico interventi</CardTitle>
          <CardDescription>
            Gli incontri sono ordinati dal più recente al più vecchio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun intervento ancora registrato per questa persona.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {formatDateLabel(entry.happenedAt)}
                    </Badge>
                    {entry.interventionType ? (
                      <Badge variant="outline">
                        {entry.interventionType}
                        {entry.interventionTypeOther
                          ? `: ${entry.interventionTypeOther}`
                          : ""}
                      </Badge>
                    ) : null}
                    {entry.durationMinutes ? (
                      <Badge variant="outline">
                        {entry.durationMinutes} min
                      </Badge>
                    ) : null}
                    {Array.isArray(entry.items) && entry.items.length > 0 ? (
                      <Badge variant="outline">
                        {entry.items.length} item YAK
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium">
                    {entry.operatorName || "Operatore non indicato"}
                    {Array.isArray(entry.whoPresent) &&
                    entry.whoPresent.length > 0
                      ? ` · ${entry.whoPresent.join(", ")}`
                      : ""}
                  </p>
                  {entry.diary ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {entry.diary}
                    </p>
                  ) : null}
                  {entry.nextAppointmentAt ? (
                    <p className="text-xs text-muted-foreground">
                      Prossimo: {formatDateTimeLabel(entry.nextAppointmentAt)}
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
