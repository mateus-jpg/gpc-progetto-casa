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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { finalizeRegistrationDraft } from "@/actions/anagrafica/anagrafica";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function RegistrationCompletionClient({
  anagrafica,
  structureId,
  structureName,
}) {
  const router = useRouter();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrationStatus = anagrafica?.registrationStatus || "active";
  const isCompleted = registrationStatus === "active";
  const fullName =
    [anagrafica?.anagrafica?.nome, anagrafica?.anagrafica?.cognome]
      .filter(Boolean)
      .join(" ") || "Scheda";

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { RegistrationSignaturePdfDocument }] = await Promise.all(
        [
          import("@react-pdf/renderer"),
          import("@/components/Anagrafica/RegistrationSignaturePdfDocument"),
        ],
      );

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

  const handleFinalize = async () => {
    setIsSubmitting(true);

    try {
      const resultRaw = await finalizeRegistrationDraft({
        anagraficaId: anagrafica.id,
        structureId,
      });
      const result = JSON.parse(resultRaw);

      if (result.error) {
        throw new Error(result.message);
      }

      toast.success("Registrazione completata correttamente");
      router.push(`/${structureId}/anagrafica/${anagrafica.id}`);
      router.refresh();
    } catch (error) {
      console.error("[REGISTRATION_FINALIZE_ERROR]:", error);
      toast.error(error.message || "Errore durante il completamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600 mb-2">
            Registrazione anagrafica
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
              {isCompleted ? "Registrazione completata" : "Da completare"}
            </Badge>
          </div>
          <p className="text-gray-600 mt-2">
            Puoi completare la registrazione di {fullName} senza caricare
            documenti.
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
              la firma, se la struttura vuole conservarne una copia operativa.
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
              {isGeneratingPdf
                ? "Generazione PDF..."
                : "Scarica PDF da stampare"}
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
              label="Stato"
              value={isCompleted ? "Completata" : "Da completare"}
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
                La registrazione risulta gia completata.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Finalizza registrazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Completa la scheda e rendila subito disponibile agli operatori.
            </p>
            <Button
              type="button"
              onClick={handleFinalize}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio in corso...
                </>
              ) : (
                "Completa registrazione"
              )}
            </Button>
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
