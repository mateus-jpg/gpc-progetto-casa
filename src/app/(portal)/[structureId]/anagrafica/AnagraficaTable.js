"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { download, generateCsv, mkConfig } from "export-to-csv";
import {
  FileDown,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Trash2,
  View,
} from "lucide-react";
import { MaterialReactTable } from "material-react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import DeleteAnagraficaDialog from "@/components/Anagrafica/DeleteAnagraficaDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getCareTeamRoleLabel } from "@/data/careTeamRoles";
import { hasEffectiveVulnerabilities } from "@/utils/vulnerability";
import { getExportData } from "./data";

const MOBILE_PAGE_SIZE = 12;

const csvConfig = mkConfig({
  fieldSeparator: ",",
  decimalSeparator: ".",
  useKeysAsHeaders: true,
  filename: "anagrafica_export",
});

const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return "";
  const date = new Date(ts._seconds * 1000);
  const tz = { timeZone: "Europe/Rome" };
  return includeTime
    ? date.toLocaleString("it-IT", tz)
    : date.toLocaleDateString("it-IT", tz);
};

const formatArrayField = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr.join("; ");
};

const formatCareTeamFigures = (figures) => {
  if (!Array.isArray(figures) || figures.length === 0) return "";

  return figures
    .map((figure) => {
      const roleLabel = getCareTeamRoleLabel(figure?.ruolo);
      const fullName = [figure?.nome, figure?.cognome]
        .filter(Boolean)
        .join(" ");
      return [roleLabel, fullName].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
    .join("; ");
};

const transformDataForExport = (data) => {
  return data.map((row) => ({
    nome: row.anagrafica?.nome || "",
    cognome: row.anagrafica?.cognome || "",
    nome_completo:
      `${row.anagrafica?.nome || ""} ${row.anagrafica?.cognome || ""}`.trim(),
    sesso: row.anagrafica?.sesso || "",
    dataDiNascita: formatTimestamp(row.anagrafica?.dataDiNascita),
    luogoDiNascita: row.anagrafica?.luogoDiNascita || "",
    cittadinanza: formatArrayField(row.anagrafica?.cittadinanza),
    comuneDiDomicilio: row.anagrafica?.comuneDiDomicilio || "",
    telefono: row.anagrafica?.telefono || "",
    email: row.anagrafica?.email || "",
    nucleo: row.nucleoFamiliare?.nucleo || "",
    nucleoTipo: row.nucleoFamiliare?.nucleoTipo || "",
    figli: row.nucleoFamiliare?.figli || "",
    situazioneLegale: row.legaleAbitativa?.situazioneLegale || "",
    situazioneAbitativa: formatArrayField(
      row.legaleAbitativa?.situazioneAbitativa,
    ),
    situazioneLavorativa: row.lavoroFormazione?.situazioneLavorativa || "",
    titoloDiStudioOrigine: row.lavoroFormazione?.titoloDiStudioOrigine || "",
    titoloDiStudioItalia: row.lavoroFormazione?.titoloDiStudioItalia || "",
    conoscenzaItaliano: row.lavoroFormazione?.conoscenzaItaliano || "",
    vulnerabilita: formatArrayField(row.vulnerabilita?.vulnerabilita),
    intenzioneItalia: row.vulnerabilita?.intenzioneItalia || "",
    paeseDestinazione: row.vulnerabilita?.paeseDestinazione || "",
    referral: row.referral?.referral || "",
    riferimentoPrincipale: row.contestoCasa?.operatoreRiferimentoNome || "",
    figureOperative: formatCareTeamFigures(row.contestoCasa?.figureOperative),
    dataIngressoCasa: row.contestoCasa?.dataIngresso || "",
    dataUscitaCasa: row.contestoCasa?.dataUscita || "",
    spazioAssegnato: row.contestoCasa?.spazioAssegnato || "",
    notePercorsoCasa: row.contestoCasa?.notePercorsoCasa || "",
    note: row.internalNotes || row.notes || "",
    createdAt: formatTimestamp(row.createdAt, true),
    updatedAt: formatTimestamp(row.updatedAt, true),
  }));
};

const columnsDef = [
  {
    id: "metadata",
    header: "Metadata",
    columns: [
      { accessorKey: "id", header: "ID", enableHiding: true },
      {
        accessorKey: "createdAt",
        header: "Creato il",
        enableHiding: true,
        Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
        accessorFn: (row) => row.createdAt,
      },
      {
        accessorKey: "updatedAt",
        header: "Aggiornato il",
        enableHiding: true,
        Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
        accessorFn: (row) => row.updatedAt,
      },
    ],
  },
  {
    id: "anagrafica",
    header: "Informazioni Anagrafiche",
    columns: [
      {
        accessorKey: "anagrafica.cognome",
        header: "Cognome",
        enableHiding: false,
      },
      { accessorKey: "anagrafica.nome", header: "Nome", enableHiding: false },
      { accessorKey: "anagrafica.sesso", header: "Sesso", size: 100 },
      {
        accessorKey: "anagrafica.dataDiNascita",
        header: "Data di nascita",
        Cell: ({ cell }) => formatTimestamp(cell.getValue()),
        accessorFn: (row) => row.anagrafica?.dataDiNascita,
      },
      { accessorKey: "anagrafica.luogoDiNascita", header: "Luogo di nascita" },
      {
        accessorKey: "anagrafica.cittadinanza",
        header: "Cittadinanza",
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return "";

          const first = arr[0];
          const extraCount = arr.length - 1;
          const renderedCell =
            extraCount > 0 ? `${first} (+${extraCount})` : first;
          return <p className="px-1">{renderedCell}</p>;
        },
        accessorFn: (row) => row.anagrafica?.cittadinanza,
      },
      {
        accessorKey: "anagrafica.comuneDiDomicilio",
        header: "Comune di domicilio",
      },
      { accessorKey: "anagrafica.telefono", header: "Telefono", size: 120 },
      { accessorKey: "anagrafica.email", header: "Email", size: 200 },
    ],
  },
  {
    id: "nucleo",
    header: "Nucleo Familiare",
    columns: [
      { accessorKey: "nucleoFamiliare.nucleo", header: "Nucleo familiare" },
      { accessorKey: "nucleoFamiliare.nucleoTipo", header: "Tipo nucleo" },
      { accessorKey: "nucleoFamiliare.figli", header: "Numero figli" },
    ],
  },
  {
    id: "legale",
    header: "Situazione Legale e Abitativa",
    columns: [
      {
        accessorKey: "legaleAbitativa.situazioneLegale",
        header: "Situazione legale",
      },
      {
        accessorKey: "legaleAbitativa.situazioneAbitativa",
        header: "Situazione abitativa",
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return "";

          return (
            <span title={arr.join(", ")}>
              {arr[0]} {arr.length > 1 && `(+${arr.length - 1})`}
            </span>
          );
        },
        accessorFn: (row) => row.legaleAbitativa?.situazioneAbitativa,
      },
    ],
  },
  {
    id: "lavoro",
    header: "Lavoro e Formazione",
    columns: [
      {
        accessorKey: "lavoroFormazione.situazioneLavorativa",
        header: "Situazione lavorativa",
      },
      {
        accessorKey: "lavoroFormazione.titoloDiStudioOrigine",
        header: "Titolo di studio (origine)",
        enableHiding: true,
      },
      {
        accessorKey: "lavoroFormazione.titoloDiStudioItalia",
        header: "Titolo di studio (Italia)",
        enableHiding: true,
      },
      {
        accessorKey: "lavoroFormazione.conoscenzaItaliano",
        header: "Conoscenza Italiano",
      },
    ],
  },
  {
    id: "vulnerabilita",
    header: "Vulnerabilità e Prospettive",
    columns: [
      {
        accessorKey: "vulnerabilita.vulnerabilita",
        header: "Vulnerabilità",
        size: 180,
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return "";

          const first = arr[0];
          const extraCount = arr.length - 1;
          const renderedCell =
            extraCount > 0 ? `${first} (+${extraCount})` : first;
          return (
            <div className="rounded-sm bg-red-500 text-center text-background shadow-gray-800/40">
              <p>{renderedCell}</p>
            </div>
          );
        },
        accessorFn: (row) => row.vulnerabilita?.vulnerabilita,
      },
      {
        accessorKey: "vulnerabilita.intenzioneItalia",
        header: "Intenzione rimanere in Italia",
      },
      {
        accessorKey: "vulnerabilita.paeseDestinazione",
        header: "Paese destinazione",
      },
    ],
  },
  {
    id: "referral",
    header: "Referral",
    columns: [{ accessorKey: "referral.referral", header: "Referral" }],
  },
];

function MobileInfoRow({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="break-words text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MobileExportMenu({
  disabled,
  filteredRows,
  handleExportData,
  handleExportRows,
  isExporting,
  visibleRows,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="w-full sm:w-auto"
          disabled={disabled}
          variant="outline"
        >
          {isExporting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <FileDown className="h-4 w-4" />}
          Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled={disabled} onClick={handleExportData}>
          <FileDown className="h-4 w-4" />
          Esporta risultati
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled || filteredRows.length === 0}
          onClick={() =>
            handleExportRows(filteredRows.map((row) => ({ original: row })))
          }
        >
          <FileDown className="h-4 w-4" />
          Esporta tutte le schede filtrate
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled || visibleRows.length === 0}
          onClick={() =>
            handleExportRows(visibleRows.map((row) => ({ original: row })))
          }
        >
          <FileDown className="h-4 w-4" />
          Esporta schede visibili
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileAnagraficaCard({ canOperate, onDelete, row, structureId }) {
  const fullName =
    `${row.anagrafica?.nome || ""} ${row.anagrafica?.cognome || ""}`.trim() ||
    "Scheda senza nome";
  const hasVulnerabilities = hasEffectiveVulnerabilities(
    row.vulnerabilita?.vulnerabilita,
  );
  const isRegistrationPending =
    row.registrationStatus === "draft_signature_pending";

  return (
    <Card className="gap-0 overflow-hidden rounded-[1.75rem] border-0 bg-gradient-to-br from-background via-background to-muted/35 py-0 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)] ring-1 ring-black/5">
      <CardContent className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              className="block text-base font-semibold text-foreground"
              href={`/${structureId}/anagrafica/${row.id}`}
            >
              {fullName}
            </Link>

            <div className="mt-2 flex flex-wrap gap-2">
              {isRegistrationPending && (
                <Badge className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50">
                  Registrazione incompleta
                </Badge>
              )}
              {hasVulnerabilities && (
                <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                  Vulnerabilita presenti
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-full bg-muted/55 hover:bg-muted/90"
                size="icon"
                variant="ghost"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/${structureId}/anagrafica/${row.id}`}>
                  <View className="h-4 w-4" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              {canOperate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      onDelete({
                        id: row.id,
                        nome: row.anagrafica?.nome || "",
                        cognome: row.anagrafica?.cognome || "",
                        canBeAccessedBy: row.canBeAccessedBy || [],
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 grid gap-3">
          <MobileInfoRow
            icon={MapPin}
            label="Domicilio"
            value={row.anagrafica?.comuneDiDomicilio}
          />
          <MobileInfoRow
            icon={Phone}
            label="Telefono"
            value={row.anagrafica?.telefono}
          />
          <MobileInfoRow
            icon={Mail}
            label="Email"
            value={row.anagrafica?.email}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-muted/35 px-3 py-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            {row.updatedAt
              ? `Aggiornata ${formatTimestamp(row.updatedAt)}`
              : ""}
          </div>
          <Button asChild size="sm">
            <Link href={`/${structureId}/anagrafica/${row.id}`}>
              <View className="h-4 w-4" />
              Apri scheda
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnagraficaTable({ rows, structureId, canOperate = false }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? "dark" : "light",
          background: {
            default: isDark ? "#22201C" : "#F4EEE2",
            paper: isDark ? "#2A2722" : "#F8F3EA",
          },
          text: {
            primary: isDark ? "#F1EBE0" : "#2A2420",
            secondary: isDark ? "#8E7D68" : "#716055",
          },
          divider: isDark ? "rgba(255,255,255,0.10)" : "#DAC9B2",
          primary: {
            main: isDark ? "#DAC9B2" : "#2A2420",
            contrastText: isDark ? "#2A2422" : "#F4EEE2",
          },
        },
        shape: { borderRadius: 8 },
      }),
    [isDark],
  );

  const columns = useMemo(() => columnsDef, []);

  const filteredRows = useMemo(() => {
    if (!globalFilter) return rows;
    const searchTerm = globalFilter.toLowerCase();
    return rows.filter((row) => {
      return (
        row.anagrafica?.nome?.toLowerCase().includes(searchTerm) ||
        row.anagrafica?.cognome?.toLowerCase().includes(searchTerm) ||
        row.anagrafica?.email?.toLowerCase().includes(searchTerm) ||
        row.anagrafica?.telefono?.toLowerCase().includes(searchTerm) ||
        row.anagrafica?.comuneDiDomicilio?.toLowerCase().includes(searchTerm)
      );
    });
  }, [rows, globalFilter]);

  const visibleMobileRows = useMemo(() => {
    return filteredRows.slice(0, mobilePage * MOBILE_PAGE_SIZE);
  }, [filteredRows, mobilePage]);

  const runExport = async (ids) => {
    setIsExporting(true);
    try {
      const fullData = await getExportData(structureId);
      const filtered = ids ? fullData.filter((r) => ids.has(r.id)) : fullData;
      const exportData = transformDataForExport(filtered);
      const csv = generateCsv(csvConfig)(exportData);
      download(csvConfig)(csv);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRows = (tableRows) => {
    const ids = new Set(tableRows.map((row) => row.original.id));
    runExport(ids);
  };

  const handleExportData = () => {
    const ids = new Set(filteredRows.map((row) => row.id));
    runExport(ids);
  };

  const hasMoreMobileRows = visibleMobileRows.length < filteredRows.length;

  return (
    <div className="h-full w-full space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          className="w-full md:max-w-lg"
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setMobilePage(1);
          }}
          placeholder="Cerca nome, cognome, email, telefono..."
          type="text"
          value={globalFilter}
        />

        <div className="md:hidden">
          <MobileExportMenu
            disabled={isExporting}
            filteredRows={filteredRows}
            handleExportData={handleExportData}
            handleExportRows={handleExportRows}
            isExporting={isExporting}
            visibleRows={visibleMobileRows}
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <span>
            {filteredRows.length}{" "}
            {filteredRows.length === 1 ? "scheda" : "schede"}
          </span>
          {globalFilter ? <span>Filtro attivo</span> : null}
        </div>

        {visibleMobileRows.length === 0
          ? <Card className="rounded-[1.75rem] border-0 py-0 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)] ring-1 ring-black/5">
              <CardContent className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nessuna scheda trovata con i filtri attuali.
              </CardContent>
            </Card>
          : visibleMobileRows.map((row) => (
              <MobileAnagraficaCard
                canOperate={canOperate}
                key={row.id}
                onDelete={setDeleteTarget}
                row={row}
                structureId={structureId}
              />
            ))}

        {hasMoreMobileRows && (
          <Button
            className="w-full"
            onClick={() => setMobilePage((current) => current + 1)}
            variant="outline"
          >
            Carica altre schede
          </Button>
        )}
      </div>

      <div className="hidden md:block">
        <ThemeProvider theme={muiTheme}>
          <MaterialReactTable
            columns={columns}
            data={filteredRows}
            displayColumnDefOptions={<> </>}
            enableColumnFilters
            enableColumnOrdering
            enableGlobalFilter={false}
            enableRowActions
            initialState={{
              pagination: { pageIndex: 0, pageSize: 25 },
              density: "compact",
              columnVisibility: {
                id: false,
                "vulnerabilita.intenzioneItalia": false,
                "lavoroFormazione.titoloDiStudioOrigine": false,
                "lavoroFormazione.titoloDiStudioItalia": false,
                createdAt: false,
                updatedAt: false,
              },
            }}
            muiTableBodyRowProps={({ row }) => ({
              onClick: () =>
                router.push(`/${structureId}/anagrafica/${row.original.id}`),
              sx: {
                cursor: "pointer",
                backgroundColor:
                  row.index % 2 !== 0
                    ? isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.025)"
                    : "inherit",
              },
            })}
            muiTablePaperProps={{
              sx: { borderRadius: 3 },
            }}
            renderRowActions={({ row }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-8 w-8"
                    onClick={(event) => event.stopPropagation()}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${structureId}/anagrafica/${row.original.id}`}
                    >
                      <View className="mr-2 h-4 w-4" />
                      Visualizza
                    </Link>
                  </DropdownMenuItem>
                  {canOperate && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            id: row.original.id,
                            nome: row.original.anagrafica?.nome || "",
                            cognome: row.original.anagrafica?.cognome || "",
                            canBeAccessedBy: row.original.canBeAccessedBy || [],
                          })
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            renderTopToolbarCustomActions={({ table }) => (
              <div className="flex flex-wrap items-center gap-2">
                {isExporting && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Button
                  className="flex items-center gap-1"
                  disabled={isExporting}
                  onClick={handleExportData}
                  size="sm"
                  variant="outline"
                >
                  <FileDown className="h-4 w-4" />
                  Esporta Tutto
                </Button>
                <Button
                  className="flex items-center gap-1"
                  disabled={
                    isExporting ||
                    table.getPrePaginationRowModel().rows.length === 0
                  }
                  onClick={() =>
                    handleExportRows(table.getPrePaginationRowModel().rows)
                  }
                  size="sm"
                  variant="outline"
                >
                  <FileDown className="h-4 w-4" />
                  Esporta Tutte le Righe
                </Button>
                <Button
                  className="flex items-center gap-1"
                  disabled={
                    isExporting || table.getRowModel().rows.length === 0
                  }
                  onClick={() => handleExportRows(table.getRowModel().rows)}
                  size="sm"
                  variant="outline"
                >
                  <FileDown className="h-4 w-4" />
                  Esporta Pagina
                </Button>
                <Button
                  className="flex items-center gap-1"
                  disabled={
                    isExporting ||
                    (!table.getIsSomeRowsSelected() &&
                      !table.getIsAllRowsSelected())
                  }
                  onClick={() =>
                    handleExportRows(table.getSelectedRowModel().rows)
                  }
                  size="sm"
                  variant="outline"
                >
                  <FileDown className="h-4 w-4" />
                  Esporta Selezionate
                </Button>
              </div>
            )}
            state={{
              isLoading: !rows,
              showAlertBanner: filteredRows.length === 0,
            }}
          />
        </ThemeProvider>
      </div>

      <DeleteAnagraficaDialog
        anagrafica={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
        open={deleteTarget !== null}
        structureId={structureId}
      />
    </div>
  );
}
