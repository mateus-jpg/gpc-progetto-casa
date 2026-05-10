"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAnagraficaHistory } from "@/actions/anagrafica/history";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DownloadPdfButton({
  anagrafica,
  accesses,
  anagraficaId,
  structureId,
  structureName,
  buttonClassName,
  buttonLabel = "Scarica PDF",
  buttonVariant = "outline",
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const [{ pdf }, { AnagraficaPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/Anagrafica/AnagraficaPdfDocument"),
      ]);

      const historyRaw = await getAnagraficaHistory(
        anagraficaId,
        structureId,
        100,
        null,
      );
      const historyData = JSON.parse(historyRaw);
      const historyEntries = historyData.entries || [];

      const doc = (
        <AnagraficaPdfDocument
          anagrafica={anagrafica}
          accesses={accesses}
          historyEntries={historyEntries}
          structureName={structureName}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const nome = anagrafica?.anagrafica?.nome || "anagrafica";
      const cognome = anagrafica?.anagrafica?.cognome || "";
      const namePart = [nome, cognome].filter(Boolean).join("-");
      const filename =
        `scheda-${namePart}-${new Date().toISOString().slice(0, 10)}.pdf`
          .toLowerCase()
          .replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Errore durante la generazione del PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={cn(buttonClassName)}
      variant={buttonVariant}
      onClick={handleDownload}
      disabled={loading}
    >
      <Download className="w-4 h-4 mr-2" />
      {loading ? "Generazione..." : buttonLabel}
    </Button>
  );
}
