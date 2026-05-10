"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createReminderAction } from "@/actions/anagrafica/reminders";
import { AccessTypes } from "@/components/Anagrafica/AccessDialog/AccessTypes";
import PostAccessDialog from "@/components/Anagrafica/AccessDialog/PostAccessDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ReminderDialog({
  anagraficaId,
  structureId,
  buttonClassName,
  buttonLabel = "Promemoria",
  buttonVariant = "outline",
}) {
  const fieldIds = {
    date: `reminder-date-${anagraficaId}`,
    note: `reminder-note-${anagraficaId}`,
    serviceType: `reminder-type-${anagraficaId}`,
    time: `reminder-time-${anagraficaId}`,
  };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  const [form, setForm] = useState({
    serviceType: AccessTypes[0]?.label || "",
    date: "",
    time: "",
    note: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setForm({
      serviceType: AccessTypes[0]?.label || "",
      date: "",
      time: "",
      note: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) {
      toast.error("Inserisci la data del promemoria");
      return;
    }

    setLoading(true);
    try {
      const dateTime = form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(`${form.date}T00:00`).toISOString();

      await createReminderAction({
        anagraficaId,
        structureId,
        serviceType: form.serviceType,
        date: dateTime,
        note: form.note || null,
      });

      setLastPayload([
        {
          tipoAccesso: form.serviceType,
          reminderDate: dateTime,
          note: form.note || null,
        },
      ]);
      setOpen(false);
      handleReset();
      setShowPostDialog(true);
    } catch (err) {
      console.error(err);
      toast.error("Errore durante il salvataggio del promemoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PostAccessDialog
        open={showPostDialog}
        onDone={() => {
          setShowPostDialog(false);
        }}
        payload={lastPayload}
      />
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (loading) return;
          setOpen(v);
          if (!v) handleReset();
        }}
      >
        <DialogTrigger asChild>
          <Button className={cn(buttonClassName)} variant={buttonVariant}>
            <Bell className="w-4 h-4 mr-2" />
            {buttonLabel}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Promemoria</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                htmlFor={fieldIds.serviceType}
              >
                Tipo *
              </label>
              <select
                id={fieldIds.serviceType}
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={form.serviceType}
                onChange={(e) => handleChange("serviceType", e.target.value)}
                required
              >
                {AccessTypes.map((t) => (
                  <option key={t.value} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data + Ora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor={fieldIds.date}>
                  Data *
                </label>
                <input
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  id={fieldIds.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  type="date"
                  value={form.date}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor={fieldIds.time}>
                  Ora
                </label>
                <input
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  id={fieldIds.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  type="time"
                  value={form.time}
                />
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor={fieldIds.note}>
                Note
              </label>
              <textarea
                className="border rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
                id={fieldIds.note}
                onChange={(e) => handleChange("note", e.target.value)}
                placeholder="Note aggiuntive..."
                value={form.note}
              />
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
    </>
  );
}
