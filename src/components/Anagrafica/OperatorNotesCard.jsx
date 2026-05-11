"use client";

import { Loader2, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateAnagrafica } from "@/actions/anagrafica/anagrafica";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function OperatorNotesCard({
  anagraficaId,
  structureId,
  notes = "",
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(notes || "");
    }
  }, [notes, open]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateAnagrafica(
        anagraficaId,
        {
          internalNotes: draft,
        },
        structureId,
      );

      toast.success("Note operatori aggiornate");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[OPERATOR_NOTES_SAVE_ERROR]:", error);
      toast.error("Errore durante il salvataggio delle note");
    } finally {
      setSaving(false);
    }
  };

  const hasNotes = typeof notes === "string" && notes.trim().length > 0;

  return (
    <Card className="mt-4 border-border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-foreground" />
            Note Operatori
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Spazio interno per lasciare aggiornamenti utili agli altri operatori
            sulla stessa anagrafica.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <NotebookPen className="h-4 w-4 mr-2" />
              {hasNotes ? "Modifica note" : "Aggiungi nota"}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Note Operatori</DialogTitle>
              <DialogDescription>
                Queste note restano collegate alla singola anagrafica e sono
                visibili agli operatori autorizzati sulla scheda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Scrivi qui passaggi importanti, attenzioni operative o aggiornamenti per il team"
                rows={10}
                className="resize-y min-h-48"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Le righe vuote e la formattazione semplice vengono mantenute.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Annulla
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva note"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border bg-muted/70 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {hasNotes ? notes : "Nessuna nota operativa presente."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
