"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSignature,
  FolderOpen,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { finalizeRegistrationDraft } from "@/actions/anagrafica/anagrafica";
import { uploadFiles } from "@/actions/files/files";
import DatePicker from "@/components/form/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function parseMaybeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value?._seconds) {
    return new Date(value._seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMaybeDate(value, includeTime = false) {
  const parsed = parseMaybeDate(value);
  if (!parsed) return "-";
  return includeTime
    ? format(parsed, "dd MMMM yyyy 'alle' HH:mm", { locale: it })
    : format(parsed, "dd/MM/yyyy", { locale: it });
}

function resolveFileType(file) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[ext] || "application/pdf";
}

function buildFileDisplayName(anagrafica) {
  const nome = anagrafica?.anagrafica?.nome || "utente";
  const cognome = anagrafica?.anagrafica?.cognome || "registrazione";
  return `Modulo firmato - ${nome} ${cognome}`;
}

export default function RegistrationCompletionClient({
  anagrafica,
  structureId,
  structureName,
}) {
  const router = useRouter();
  const initialSignedDate =
    parseMaybeDate(anagrafica?.privacy?.paperNoticeSignedAt) || new Date();
  const [signedAt, setSignedAt] = useState(initialSignedDate);
  const [reference, setReference] = useState(
    anagrafica?.privacy?.paperNoticeReference || "",
  );
  const [notes, setNotes] = useState(
    anagrafica?.privacy?.paperNoticeNotes || "",
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [persistedSignedFile, setPersistedSignedFile] = useState(
    anagrafica?.privacy?.paperNoticeFileId
      ? {
          id: anagrafica.privacy.paperNoticeFileId,
          name:
            anagrafica.privacy.paperNoticeFileName ||
            anagrafica.privacy.paperNoticeReference ||
            "Documento firmato",
        }
      : null,
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrationStatus = anagrafica?.registrationStatus || "active";
  const isCompleted =
    registrationStatus === "active" &&
    anagrafica?.privacy?.paperNoticeCollected === true;
  const fullName =
    [anagrafica?.anagrafica?.nome, anagrafica?.anagrafica?.cognome]
      .filter(Boolean)
      .join(" ") || "Scheda";

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { RegistrationSignaturePdfDocument }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/Anagrafica/RegistrationSignaturePdfDocument"),
        ]);

      const doc = (
        <RegistrationSignaturePdfDocument
          anagrafica={anagrafica}
          structureName={structureName}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const filename =
        `registrazione-${fullName}-${new Date().toISOString().slice(0, 10)}.pdf`
          .toLowerCase()
          .replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[REGISTRATION_PDF_ERROR]:", error);
      toast.error("Errore durante la generazione del PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFileSelection = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
    if (nextFile && !reference.trim()) {
      setReference(nextFile.name);
    }
  };

  const handleFinalize = async (fileInfo) => {
    const resultRaw = await finalizeRegistrationDraft({
      anagraficaId: anagrafica.id,
      structureId,
      signedFileId: fileInfo?.id || null,
      signedFileName: fileInfo?.name || null,
      signedAt,
      reference,
      notes,
    });
    const result = JSON.parse(resultRaw);

    if (result.error) {
      throw new Error(result.message);
    }

    toast.success("Registrazione completata correttamente");
    router.push(`/${structureId}/anagrafica/${anagrafica.id}`);
    router.refresh();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile && !persistedSignedFile?.id) {
      toast.error("Carica il documento firmato prima di completare la registrazione");
      return;
    }

    setIsSubmitting(true);
    let uploadedNow = false;

    try {
      let fileInfo = persistedSignedFile;

      if (selectedFile) {
        const uploadResult = await uploadFiles({
          anagraficaId: anagrafica.id,
          structureId,
          category: "Privacy e Consensi",
          files: [
            {
              name: selectedFile.name,
              type: resolveFileType(selectedFile),
              size: selectedFile.size,
              buffer: await selectedFile.arrayBuffer(),
              displayName: buildFileDisplayName(anagrafica),
              documentDate: signedAt,
            },
          ],
        });

        if (uploadResult.error) {
          throw new Error(uploadResult.message || "Errore durante il caricamento");
        }

        const uploadedFile = uploadResult.files?.find((file) => !file.error);
        if (!uploadedFile?.id) {
          throw new Error("Il documento firmato non è stato caricato correttamente");
        }

        uploadedNow = true;
        fileInfo = {
          id: uploadedFile.id,
          name:
            uploadedFile.nome ||
            uploadedFile.nomeOriginale ||
            buildFileDisplayName(anagrafica),
        };
        setPersistedSignedFile(fileInfo);
        setSelectedFile(null);
        setFileInputKey((current) => current + 1);
      }

      await handleFinalize(fileInfo);
    } catch (error) {
      console.error("[REGISTRATION_FINALIZE_ERROR]:", error);
      if (uploadedNow) {
        toast.error(
          `Documento caricato, ma registrazione non completata: ${error.message}`,
        );
      } else {
        toast.error(error.message || "Errore durante il completamento");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600 mb-2">
            Passo 2 di 2
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">
              Completa la registrazione
            </h1>
            <Badge
              variant="outline"
              className={
                isCompleted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-amber-300 bg-amber-50 text-amber-700"
              }
            >
              {isCompleted ? "Registrazione completata" : "Firma in attesa"}
            </Badge>
          </div>
          <p className="text-gray-600 mt-2">
            Genera il PDF, fallo firmare e carica il documento firmato per
            finalizzare la scheda di {fullName}.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/${structureId}/anagrafica/${anagrafica.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla scheda
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${structureId}/anagrafica/${anagrafica.id}/files`}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Apri documenti
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-blue-200 bg-blue-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-blue-700" />
              Modulo di registrazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-blue-950">
            <p>
              Questo PDF contiene i dati generali della persona e uno spazio per
              la firma. Puoi stamparlo subito e allegarlo al modulo privacy
              ufficiale della struttura.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-blue-600 mb-1">
                  Persona
                </p>
                <p className="font-medium text-gray-900">{fullName}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-blue-600 mb-1">
                  Struttura
                </p>
                <p className="font-medium text-gray-900">
                  {structureName || structureId}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGeneratingPdf ? "Generazione PDF..." : "Scarica PDF da stampare"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riepilogo registrazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryRow label="Nome" value={anagrafica?.anagrafica?.nome} />
            <SummaryRow
              label="Cognome"
              value={anagrafica?.anagrafica?.cognome}
            />
            <SummaryRow
              label="Data registrazione"
              value={formatMaybeDate(anagrafica?.createdAt, true)}
            />
            <SummaryRow
              label="Informativa raccolta"
              value={anagrafica?.privacy?.paperNoticeCollected ? "Sì" : "No"}
            />
            <SummaryRow
              label="Documento firmato"
              value={
                persistedSignedFile?.name ||
                anagrafica?.privacy?.paperNoticeFileName ||
                "-"
              }
            />
          </CardContent>
        </Card>
      </div>

      {isCompleted ? (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                Il documento firmato risulta già registrato in questa scheda.
              </p>
            </div>
            <p className="text-sm text-emerald-900">
              Firma registrata il{" "}
              {formatMaybeDate(anagrafica?.privacy?.paperNoticeSignedAt)}.
            </p>
            <p className="text-sm text-emerald-900">
              Documento archiviato:{" "}
              {anagrafica?.privacy?.paperNoticeFileName || "Documento firmato"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Carica il documento firmato</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <DatePicker
                  label="Data firma"
                  value={signedAt}
                  onChange={(date) => setSignedAt(date || new Date())}
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                />

                <div className="space-y-2">
                  <Label htmlFor="registration-reference">
                    Riferimento / protocollo
                  </Label>
                  <Input
                    id="registration-reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Es. modulo privacy aprile 2026"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-notes">Note operative</Label>
                <Textarea
                  id="registration-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Note interne sulla raccolta del modulo firmato"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="signed-file">Documento firmato</Label>
                <Input
                  key={fileInputKey}
                  id="signed-file"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileSelection}
                />
                <p className="text-sm text-muted-foreground">
                  Formati supportati: PDF, JPG, PNG, WEBP.
                </p>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span>{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileInputKey((current) => current + 1);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rimuovi
                    </Button>
                  </div>
                )}

                {!selectedFile && persistedSignedFile?.id && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Documento già caricato e pronto per la finalizzazione:{" "}
                    <span className="font-medium">{persistedSignedFile.name}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile
                        ? "Carica e completa registrazione"
                        : "Completa con documento già caricato"}
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" asChild>
                  <Link href={`/${structureId}/anagrafica/${anagrafica.id}/files`}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Vai ai documenti
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-medium text-gray-900">{value || "-"}</span>
    </div>
  );
}
