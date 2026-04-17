"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteAnagraficaAsAdmin,
  removeStructureFromAnagrafica,
} from "@/actions/anagrafica/anagrafica";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Safe delete dialog for anagrafica records.
 *
 * - If canBeAccessedBy.length > 1 → removes current structure only
 * - If canBeAccessedBy.length === 1 → soft-deletes the full record
 *
 * Requires typing "ELIMINA" to unlock the confirm button.
 * Admin-only — the server actions enforce this independently.
 *
 * @param {boolean} open
 * @param {(open: boolean) => void} onOpenChange
 * @param {{ id: string, nome: string, cognome: string, canBeAccessedBy: string[] }} anagrafica
 * @param {string} structureId
 * @param {() => void} onSuccess - called after successful delete; parent should call router.refresh()
 */
export default function DeleteAnagraficaDialog({
  open,
  onOpenChange,
  anagrafica,
  structureId,
  onSuccess,
}) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!anagrafica) return null;

  const isShared = (anagrafica.canBeAccessedBy || []).length > 1;
  const fullName =
    `${anagrafica.nome || ""} ${anagrafica.cognome || ""}`.trim();
  const isConfirmed = confirmText === "ELIMINA";

  const handleOpenChange = (next) => {
    if (!next) setConfirmText("");
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      const result = isShared
        ? await removeStructureFromAnagrafica(anagrafica.id, structureId)
        : await deleteAnagraficaAsAdmin(anagrafica.id, structureId);

      if (result.error) {
        toast.error(result.message);
        setConfirmText("");
        return;
      }

      toast.success(result.message);
      handleOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Errore durante l'operazione");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isShared ? "Rimuovi dalla struttura" : "Elimina scheda"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isShared
              ? "Questa scheda è condivisa con altre strutture. Verrà rimossa solo dalla tua struttura e rimarrà accessibile alle altre."
              : `Questa operazione è irreversibile. La scheda di ${fullName} verrà eliminata definitivamente.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm-input">
            Digita <strong>ELIMINA</strong> per confermare
          </Label>
          <Input
            id="delete-confirm-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINA"
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isShared ? "Rimuovi" : "Elimina"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
