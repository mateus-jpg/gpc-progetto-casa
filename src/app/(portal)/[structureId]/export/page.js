"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { exportAccessiCSV } from "@/actions/anagrafica/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ExportPage() {
  const { structureId } = useParams();

  const today = new Date().toISOString().split("T")[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastCount, setLastCount] = useState(null);

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setError(null);
    setLastCount(null);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError("Seleziona le date di inizio e fine");
      return;
    }
    if (startDate > endDate) {
      setError("La data di inizio deve precedere la data di fine");
      return;
    }

    setError(null);
    setIsLoading(true);
    setLastCount(null);

    try {
      const { csv, count } = await exportAccessiCSV({
        structureId,
        startDate,
        endDate,
      });
      setLastCount(count);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accessi_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      {/* Page header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <FileSpreadsheet className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Esporta Accessi
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-xs mx-auto">
          Scarica gli accessi della struttura in formato CSV, un record per
          servizio
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Card header strip */}
        <div className="flex items-center gap-2 px-4 py-4 border-b bg-muted/40">
          <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Periodo di Esportazione
          </span>
        </div>

        <div className="px-4 py-8 space-y-7">
          {/* Date range row */}
          <div className="grid grid-cols-[1fr,32px,1fr] items-end gap-2">
            <div className="space-y-2">
              <Label
                htmlFor="startDate"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Da
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={handleDateChange(setStartDate)}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-center pb-2 text-muted-foreground/40">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="endDate"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                A
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={handleDateChange(setEndDate)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Period badge */}
          {startDate && endDate && !error && lastCount === null && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-dashed px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Periodo selezionato
              </span>
              <span className="text-xs font-semibold font-mono tabular-nums">
                {formatDate(startDate)} — {formatDate(endDate)}
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-4">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success state */}
          {lastCount !== null && !error && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {lastCount === 0
                    ? "Nessun accesso trovato"
                    : "Esportazione completata"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lastCount === 0
                    ? "Nessun record nel periodo selezionato."
                    : `${lastCount} ${lastCount === 1 ? "accesso esportato" : "accessi esportati"}.`}
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="w-full h-11 gap-2"
          >
            {isLoading
              ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Esportazione in corso...
                </>
              : <>
                  <Download className="w-4 h-4" />
                  Scarica CSV
                </>}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        Il file includerà tutti i servizi registrati nel periodo selezionato.
      </p>
    </div>
  );
}
