"use client";

import {
  ArrowLeft,
  Download,
  FileIcon,
  Loader2,
  PencilIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  addSubcategoryToStructure,
  getStructureCategories,
} from "@/actions/admin/structure";
import {
  getAccessFileUrl,
  updateAccessAction,
} from "@/actions/anagrafica/access";
import AccessHistoryTimeline from "@/components/Anagrafica/AccessHistoryTimeline";
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccessForm } from "@/hooks/useAccessForm";
import { stripHtml } from "@/utils/htmlSanitizer";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("it-IT");
}

function FileRow({ file, anagraficaId, onDelete, editMode }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await getAccessFileUrl({ anagraficaId, filePath: file.path });
      if (res.success && res.url) window.open(res.url, "_blank");
      else toast.error("Impossibile recuperare il file.");
    } catch {
      toast.error("Errore durante il download.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 truncate">{file.nome || file.nomeOriginale}</span>
      <span className="text-xs text-muted-foreground">
        {formatDate(file.dataCreazione)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Download className="w-3 h-3" />
        )}
      </Button>
      {editMode && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive/90"
          onClick={() => onDelete(file.path)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function ServiceReadView({ service, anagraficaId }) {
  const strippedNote = service.note ? stripHtml(service.note) : null;
  const subcategories = Array.isArray(service.sottoCategorie)
    ? service.sottoCategorie
    : service.sottoCategorie
      ? [service.sottoCategorie]
      : [];

  return (
    <div className="space-y-3">
      {subcategories.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">
            Sottocategorie
          </span>
          <div className="flex flex-wrap gap-1">
            {subcategories.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {service.classificazione && (
        <div>
          <span className="text-xs text-muted-foreground block">
            Classificazione
          </span>
          <p className="text-sm">{service.classificazione}</p>
        </div>
      )}
      {service.enteRiferimento && (
        <div>
          <span className="text-xs text-muted-foreground block">
            Ente di riferimento
          </span>
          <p className="text-sm">{service.enteRiferimento}</p>
        </div>
      )}
      {strippedNote && (
        <div>
          <span className="text-xs text-muted-foreground block">Note</span>
          <p className="text-sm whitespace-pre-wrap">{strippedNote}</p>
        </div>
      )}
      {service.reminderDate && (
        <div>
          <span className="text-xs text-muted-foreground block">
            Promemoria
          </span>
          <p className="text-sm">{formatDate(service.reminderDate)}</p>
        </div>
      )}
      {service.files?.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">
            File allegati
          </span>
          <div className="border rounded-md px-3 py-1">
            {service.files.map((f) => (
              <FileRow
                key={f.path || f.nomeOriginale || f.nome}
                file={f}
                anagraficaId={anagraficaId}
                editMode={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccessDetailClient({
  accesso,
  anagraficaId,
  structureId,
  anagraficaName,
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  const {
    accessState,
    updateAccessField,
    markFileForDeletion,
    resetAccessForm,
    getValidAccessTypes,
    prepareAccessPayload,
  } = useAccessForm(categories, accesso.services);

  const enterEditMode = useCallback(async () => {
    if (!categoriesFetched && structureId) {
      setCategoriesLoading(true);
      try {
        const cats = await getStructureCategories(structureId);
        setCategories(cats);
        setCategoriesFetched(true);
      } catch {
        setCategoriesFetched(true);
      } finally {
        setCategoriesLoading(false);
      }
    }
    setEditMode(true);
  }, [categoriesFetched, structureId]);

  const handleCancel = () => {
    resetAccessForm();
    setEditMode(false);
  };

  const handleSave = async () => {
    const validTypes = getValidAccessTypes();
    if (validTypes.length === 0) {
      toast.error("Seleziona almeno una sottocategoria prima di salvare.");
      return;
    }
    setSaving(true);
    try {
      const servicesPayload = await prepareAccessPayload();
      await updateAccessAction({
        accessId: accesso.id,
        anagraficaId,
        services: servicesPayload,
        structureId,
      });
      toast.success("Accesso aggiornato con successo.");
      setEditMode(false);
      router.refresh();
    } catch (err) {
      toast.error(`Errore durante il salvataggio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleNewSubcategory = useCallback(
    async (categoryValue, newSubcategory) => {
      try {
        const result = await addSubcategoryToStructure(
          structureId,
          categoryValue,
          newSubcategory,
        );
        if (result.success && !result.alreadyExists) {
          toast.success(`Sottocategoria "${newSubcategory}" aggiunta`);
        }
      } catch {
        toast.error("Errore durante l'aggiunta della sottocategoria");
      }
    },
    [structureId],
  );

  return (
    <div className="w-full mx-auto px-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${structureId}/anagrafica/${anagraficaId}`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {anagraficaName}
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Dettaglio Accesso</h1>
          <Badge
            variant="outline"
            className="text-xs text-muted-foreground font-mono hidden sm:inline-flex"
          >
            {accesso.id}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button onClick={enterEditMode} disabled={categoriesLoading}>
              {categoriesLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <PencilIcon className="w-4 h-4 mr-1" />
              )}
              Modifica
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-1" /> Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Creato il</span>
            <p className="font-medium">{formatDate(accesso.createdAt)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Struttura</span>
            <p className="font-medium">{accesso.createdByStructure || "-"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Operatore</span>
            <p className="font-medium">{accesso.createdBy || "-"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Servizi</span>
            <p className="font-medium">{accesso.services?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* View mode: read-only service list */}
      {!editMode && (
        <div className="space-y-4">
          {(accesso.services || []).map((svc, i) => (
            <Card
              key={
                svc.id ||
                `${svc.tipoAccesso || "service"}-${svc.createdAt || svc.note || ""}`
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {svc.tipoAccesso || "Servizio"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceReadView service={svc} anagraficaId={anagraficaId} />
              </CardContent>
            </Card>
          ))}
          {(!accesso.services || accesso.services.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Nessun servizio registrato per questo accesso.
            </p>
          )}
        </div>
      )}

      {/* Edit mode: pre-populated form */}
      {editMode && (
        <Card>
          <CardContent className="pt-4">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <AccessServicesForm
                state={accessState}
                onChange={updateAccessField}
                showClassification
                showReferralEntity
                categories={categories}
                onNewSubcategory={handleNewSubcategory}
                existingFilesRenderer={(typeValue) => {
                  const existing = accessState[typeValue]?.existingFiles || [];
                  if (existing.length === 0) return null;
                  return (
                    <div className="mb-3 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        File esistenti
                      </p>
                      <div className="border rounded-md px-3 py-1">
                        {existing.map((f) => (
                          <FileRow
                            key={f.path || f.nomeOriginale || f.nome}
                            file={f}
                            anagraficaId={anagraficaId}
                            editMode
                            onDelete={(filePath) =>
                              markFileForDeletion(typeValue, filePath)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* History timeline */}
      <AccessHistoryTimeline
        accessId={accesso.id}
        anagraficaId={anagraficaId}
      />
    </div>
  );
}
