"use client";

import { Building2, Loader2, Share2, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAvailableStructuresForSharing,
  shareAnagraficaWithStructures,
} from "@/actions/anagrafica/anagrafica";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  SHAREABLE_STRUCTURE_DATA_FIELDS,
  SHAREABLE_STRUCTURE_DATA_LABELS,
} from "@/utils/anagraficaSharing";

export function ShareAnagraficaDialog({
  anagraficaId,
  structureId,
  anagraficaName,
  buttonClassName,
  buttonLabel = "Condividi",
  buttonVariant = "outline",
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingStructures, setFetchingStructures] = useState(false);
  const [manageableStructures, setManageableStructures] = useState([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState([]);
  const [selectedSharedFields, setSelectedSharedFields] = useState([]);

  const fetchAvailableStructures = useCallback(async () => {
    setFetchingStructures(true);
    try {
      const result = await getAvailableStructuresForSharing(
        anagraficaId,
        structureId,
      );

      if (result.success) {
        setManageableStructures(result.structures || []);
      } else {
        toast.error(result.error || "Failed to fetch structures");
      }
    } catch (_error) {
      toast.error("Failed to fetch structures");
    } finally {
      setFetchingStructures(false);
    }
  }, [anagraficaId, structureId]);

  useEffect(() => {
    if (open) {
      setSelectedStructureIds([]);
      setSelectedSharedFields([]);
      fetchAvailableStructures();
    }
  }, [open, fetchAvailableStructures]);

  const handleStructureToggle = (targetStructureId, checked) => {
    if (checked) {
      setSelectedStructureIds((prev) => [
        ...new Set([...prev, targetStructureId]),
      ]);
    } else {
      setSelectedStructureIds((prev) =>
        prev.filter((id) => id !== targetStructureId),
      );
    }
  };

  const handleSharedFieldToggle = (field, checked) => {
    if (checked) {
      setSelectedSharedFields((prev) => [...new Set([...prev, field])]);
    } else {
      setSelectedSharedFields((prev) =>
        prev.filter((value) => value !== field),
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedStructureIds.length === 0) {
      toast.error("Seleziona almeno una struttura");
      return;
    }

    setLoading(true);
    try {
      const result = await shareAnagraficaWithStructures(
        anagraficaId,
        structureId,
        selectedStructureIds,
        selectedSharedFields,
      );

      if (result.success) {
        const summary = [];

        if (result.addedCount > 0) {
          summary.push(`${result.addedCount} nuove strutture abilitate`);
        }

        if (result.policyUpdatedCount > 0) {
          summary.push(
            `${result.policyUpdatedCount} condivisioni dati aggiornate`,
          );
        }

        if (result.clearedCount > 0) {
          summary.push(`${result.clearedCount} condivisioni dati rimosse`);
        }

        toast.success(summary.join(" · ") || "Condivisione aggiornata");
        setOpen(false);
        setSelectedStructureIds([]);
        setSelectedSharedFields([]);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to share anagrafica");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn(buttonClassName)} variant={buttonVariant}>
          <Share2 className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Condividi Anagrafica</DialogTitle>
          <DialogDescription>
            {anagraficaName ? (
              <>
                Gestisci chi puo accedere alla scheda di{" "}
                <strong>{anagraficaName}</strong> e quali sezioni extra della
                tua struttura vuoi esporre.
              </>
            ) : (
              "Seleziona le strutture e, se serve, le informazioni extra della tua struttura da condividere."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Condivisione base</p>
          <p>
            Le informazioni anagrafiche restano accessibili alle strutture
            abilitate sulla scheda. Le opzioni qui sotto aggiungono soltanto le
            sezioni extra della struttura corrente.
          </p>
          <p className="mt-2">
            Se selezioni strutture gia abilitate, le sezioni extra condivise
            verranno aggiornate o rimosse in base alle scelte attuali.
          </p>
        </div>

        <div className="py-2">
          {fetchingStructures ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : manageableStructures.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nessuna struttura gestibile</p>
              <p className="text-sm mt-2">
                Non ci sono altre strutture disponibili o gia associate per
                questa scheda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Strutture</h3>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {manageableStructures.map((structure) => (
                      <div
                        key={structure.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={structure.id}
                          checked={selectedStructureIds.includes(structure.id)}
                          onCheckedChange={(checked) =>
                            handleStructureToggle(structure.id, checked)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={structure.id}
                            className="font-medium cursor-pointer block"
                          >
                            {structure.name}
                          </Label>
                          {structure.city && (
                            <p className="text-sm text-muted-foreground">
                              {structure.city}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {structure.isCurrentlyShared && (
                              <Badge variant="secondary" className="text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Scheda gia condivisa
                              </Badge>
                            )}
                            {structure.isUserStructure && (
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Tua struttura
                              </Badge>
                            )}
                            {structure.isSameProject &&
                              !structure.isUserStructure && (
                                <Badge variant="outline" className="text-xs">
                                  Stesso progetto
                                </Badge>
                              )}
                          </div>
                          {structure.sharedFields?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {structure.sharedFields.map((field) => (
                                <Badge
                                  key={`${structure.id}-${field}`}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {SHAREABLE_STRUCTURE_DATA_LABELS[field] ||
                                    field}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-sm font-medium">
                    Sezioni extra da condividere
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Selezionate: {selectedStructureIds.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHAREABLE_STRUCTURE_DATA_FIELDS.map((field) => {
                    const fieldId = `shared-field-${field}`;

                    return (
                      <div
                        key={field}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${selectedStructureIds.length === 0 ? "opacity-60" : ""}`}
                      >
                        <Checkbox
                          id={fieldId}
                          checked={selectedSharedFields.includes(field)}
                          disabled={selectedStructureIds.length === 0}
                          onCheckedChange={(checked) =>
                            handleSharedFieldToggle(field, checked)
                          }
                        />
                        <Label
                          htmlFor={fieldId}
                          className="text-sm font-medium"
                        >
                          {SHAREABLE_STRUCTURE_DATA_LABELS[field] || field}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Nessuna sezione selezionata: le strutture scelte avranno
                  accesso solo alla parte anagrafica di base.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              selectedStructureIds.length === 0 ||
              manageableStructures.length === 0
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Applica ({selectedStructureIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
