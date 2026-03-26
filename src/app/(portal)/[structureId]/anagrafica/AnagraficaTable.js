"use client";
import { Input } from "@/components/ui/input"
import { MaterialReactTable } from 'material-react-table'
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, View, MoreVertical, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteAnagraficaDialog from '@/components/Anagrafica/DeleteAnagraficaDialog';
import { getExportData } from './data';

const csvConfig = mkConfig({
  fieldSeparator: ',',
  decimalSeparator: '.',
  useKeysAsHeaders: true,
  filename: 'anagrafica_export'
});


const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return '';
  const date = new Date(ts._seconds * 1000);
  const tz = { timeZone: 'Europe/Rome' };
  return includeTime ? date.toLocaleString('it-IT', tz) : date.toLocaleDateString('it-IT', tz);
};


const formatArrayField = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.join('; ');
};


const transformDataForExport = (data) => {
  return data.map(row => ({
    nome: row.anagrafica?.nome || '',
    cognome: row.anagrafica?.cognome || '',
    nome_completo: `${row.anagrafica?.nome || ''} ${row.anagrafica?.cognome || ''}`.trim(),
    sesso: row.anagrafica?.sesso || '',
    dataDiNascita: formatTimestamp(row.anagrafica?.dataDiNascita),
    luogoDiNascita: row.anagrafica?.luogoDiNascita || '',
    cittadinanza: formatArrayField(row.anagrafica?.cittadinanza),
    comuneDiDomicilio: row.anagrafica?.comuneDiDomicilio || '',
    telefono: row.anagrafica?.telefono || '',
    email: row.anagrafica?.email || '',
    nucleo: row.nucleoFamiliare?.nucleo || '',
    nucleoTipo: row.nucleoFamiliare?.nucleoTipo || '',
    figli: row.nucleoFamiliare?.figli || '',
    situazioneLegale: row.legaleAbitativa?.situazioneLegale || '',
    situazioneAbitativa: formatArrayField(row.legaleAbitativa?.situazioneAbitativa),
    situazioneLavorativa: row.lavoroFormazione?.situazioneLavorativa || '',
    titoloDiStudioOrigine: row.lavoroFormazione?.titoloDiStudioOrigine || '',
    titoloDiStudioItalia: row.lavoroFormazione?.titoloDiStudioItalia || '',
    conoscenzaItaliano: row.lavoroFormazione?.conoscenzaItaliano || '',
    vulnerabilita: formatArrayField(row.vulnerabilita?.vulnerabilita),
    intenzioneItalia: row.vulnerabilita?.intenzioneItalia || '',
    paeseDestinazione: row.vulnerabilita?.paeseDestinazione || '',
    referral: row.referral?.referral || '',
    note: row.notes || '',
    createdAt: formatTimestamp(row.createdAt, true),
    updatedAt: formatTimestamp(row.updatedAt, true)
  }));
};

const columnsDef = [
  {
    id: 'metadata',
    header: 'Metadata',
    columns: [
      { accessorKey: 'id', header: 'ID', enableHiding: true },
      {
        accessorKey: 'createdAt',
        header: 'Creato il',
        enableHiding: true,
        Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
        accessorFn: (row) => row.createdAt
      },
      {
        accessorKey: 'updatedAt',
        header: 'Aggiornato il',
        enableHiding: true,
        Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
        accessorFn: (row) => row.updatedAt
      },
    ]
  },
  {
    id: 'anagrafica',
    header: 'Informazioni Anagrafiche',
    columns: [
      { accessorKey: 'anagrafica.cognome', header: 'Cognome', enableHiding: false },
      { accessorKey: 'anagrafica.nome', header: 'Nome', enableHiding: false },
      /* {
        accessorFn: (row) => `${row.anagrafica?.nome || ''} ${row.anagrafica?.cognome || ''}`.trim(),
        id: 'nome_completo',
        header: 'Nome',
        size: 150,
        enableHiding: false
      }, */
      { accessorKey: 'anagrafica.sesso', header: 'Sesso', size: 100 },
      {
        accessorKey: 'anagrafica.dataDiNascita',
        header: 'Data di nascita',
        Cell: ({ cell }) => formatTimestamp(cell.getValue()),
        accessorFn: (row) => row.anagrafica?.dataDiNascita
      },
      { accessorKey: 'anagrafica.luogoDiNascita', header: 'Luogo di nascita' },
      {
        accessorKey: 'anagrafica.cittadinanza',
        header: 'Cittadinanza',
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return '';

          const first = arr[0];
          const extraCount = arr.length - 1;
          const renderedCell = extraCount > 0
            ? `${first} (+${extraCount})`
            : first;
          return (

            <p className='px-1'>{renderedCell}</p>
          );
        },
        accessorFn: (row) => row.anagrafica?.cittadinanza
      },
      { accessorKey: 'anagrafica.comuneDiDomicilio', header: 'Comune di domicilio' },
      { accessorKey: 'anagrafica.telefono', header: 'Telefono', size: 120 },
      { accessorKey: 'anagrafica.email', header: 'Email', size: 200 },
    ]
  },
  {
    id: 'nucleo',
    header: 'Nucleo Familiare',
    columns: [
      { accessorKey: 'nucleoFamiliare.nucleo', header: 'Nucleo familiare' },
      { accessorKey: 'nucleoFamiliare.nucleoTipo', header: 'Tipo nucleo' },
      { accessorKey: 'nucleoFamiliare.figli', header: 'Numero figli' },
    ]
  },
  {
    id: 'legale',
    header: 'Situazione Legale e Abitativa',
    columns: [
      { accessorKey: 'legaleAbitativa.situazioneLegale', header: 'Situazione legale' },
      {
        accessorKey: 'legaleAbitativa.situazioneAbitativa',
        header: 'Situazione abitativa',
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return '';

          return (
            <span title={arr.join(', ')}>
              {arr[0]} {arr.length > 1 && `(+${arr.length - 1})`}
            </span>
          );
        },
        accessorFn: (row) => row.legaleAbitativa?.situazioneAbitativa
      },
    ]
  },
  {
    id: 'lavoro',
    header: 'Lavoro e Formazione',
    columns: [
      { accessorKey: 'lavoroFormazione.situazioneLavorativa', header: 'Situazione lavorativa' },
      { accessorKey: 'lavoroFormazione.titoloDiStudioOrigine', header: 'Titolo di studio (origine)', enableHiding: true },
      { accessorKey: 'lavoroFormazione.titoloDiStudioItalia', header: 'Titolo di studio (Italia)', enableHiding: true },
      { accessorKey: 'lavoroFormazione.conoscenzaItaliano', header: 'Conoscenza Italiano' },
    ]
  },
  {
    id: 'vulnerabilita',
    header: 'Vulnerabilità e Prospettive',
    columns: [
      {
        accessorKey: 'vulnerabilita.vulnerabilita',
        header: 'Vulnerabilità',
        size: 180,
        Cell: ({ cell }) => {
          const arr = cell.getValue() ?? [];
          if (!Array.isArray(arr) || arr.length === 0) return '';

          const first = arr[0];
          const extraCount = arr.length - 1;
          const renderedCell = extraCount > 0
            ? `${first} (+${extraCount})`
            : first;
          return (
            <div className='bg-red-500 text-center shadow-gray-800/40 rounded-sm text-background '>
              <p className=''>{renderedCell}</p>
            </div>
          );
        },
        accessorFn: (row) => row.vulnerabilita?.vulnerabilita
      },
      { accessorKey: 'vulnerabilita.intenzioneItalia', header: 'Intenzione rimanere in Italia' },
      { accessorKey: 'vulnerabilita.paeseDestinazione', header: 'Paese destinazione' },
    ]
  },
  {
    id: 'referral',
    header: 'Referral',
    columns: [
      { accessorKey: 'referral.referral', header: 'Referral' },
    ]
  }
];

export function AnagraficaTable({ rows, structureId, isAdmin = false }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const router = useRouter();

  const columns = useMemo(() => columnsDef, []);

  const filteredRows = useMemo(() => {
    if (!globalFilter) return rows;
    const searchTerm = globalFilter.toLowerCase();
    return rows.filter((row) => {

      return (
        (row.anagrafica?.nome && row.anagrafica.nome.toLowerCase().includes(searchTerm)) ||
        (row.anagrafica?.cognome && row.anagrafica.cognome.toLowerCase().includes(searchTerm)) ||
        (row.anagrafica?.email && row.anagrafica.email.toLowerCase().includes(searchTerm)) ||
        (row.anagrafica?.telefono && row.anagrafica.telefono.toLowerCase().includes(searchTerm)) ||
        (row.anagrafica?.comuneDiDomicilio && row.anagrafica.comuneDiDomicilio.toLowerCase().includes(searchTerm))
      );
    });
  }, [rows, globalFilter]);

  const runExport = async (ids) => {
    setIsExporting(true);
    try {
      const fullData = await getExportData(structureId);
      const filtered = ids ? fullData.filter(r => ids.has(r.id)) : fullData;
      const exportData = transformDataForExport(filtered);
      const csv = generateCsv(csvConfig)(exportData);
      download(csvConfig)(csv);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRows = (tableRows) => {
    const ids = new Set(tableRows.map(r => r.original.id));
    runExport(ids);
  };

  const handleExportData = () => {
    const ids = new Set(filteredRows.map(r => r.id));
    runExport(ids);
  };

  return (
    <div className="h-full w-full">
      <Input
        type="text"

        placeholder="Cerca Nome, Cognome, Email, Telefono..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="mb-8 p-1 max-w-lg w-full "
      />
      <MaterialReactTable
        columns={columns}
        data={filteredRows}
        enableRowActions
        /* enableRowPinning */
        enableColumnFilters
        enableColumnOrdering
        enableGlobalFilter={false}
        state={{
          isLoading: !rows,
          showAlertBanner: filteredRows.length === 0,
        }}
        displayColumnDefOptions={<> </>}

        renderRowActions={({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/${structureId}/anagrafica/${row.original.id}`}>
                  <View className="mr-2 h-4 w-4" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      setDeleteTarget({
                        id: row.original.id,
                        nome: row.original.anagrafica?.nome || '',
                        cognome: row.original.anagrafica?.cognome || '',
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
        initialState={{
          pagination: { pageSize: 25, pageIndex: 0 },
          density: 'compact',
          columnVisibility: {
            id: false,
/*             'anagrafica.nome': true,
            'anagrafica.cognome': false, */
            'vulnerabilita.intenzioneItalia': false,
            'lavoroFormazione.titoloDiStudioOrigine': false,
            'lavoroFormazione.titoloDiStudioItalia': false,
            createdAt: false,
            updatedAt: false,
          },
        }}
        muiTablePaperProps={{
          sx: { borderRadius: 3, border: '1px solid gray-300' }
        }}
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => router.push(`/${structureId}/anagrafica/${row.original.id}`),
          sx: {
            cursor: 'pointer',
            backgroundColor: row.index % 2 !== 0 ? 'rgba(0, 0, 0, 0.035)' : 'inherit',
          }
        })}
        renderTopToolbarCustomActions={({ table }) => (
          <div className="flex flex-wrap gap-2 items-center">
            {isExporting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutto
            </Button>
            <Button
              disabled={isExporting || table.getPrePaginationRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getPrePaginationRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutte le Righe
            </Button>
            <Button
              disabled={isExporting || table.getRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Pagina
            </Button>
            <Button
              disabled={isExporting || (!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected())}
              onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Selezionate
            </Button>
          </div>
        )}
      />
      <DeleteAnagraficaDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        anagrafica={deleteTarget}
        structureId={structureId}
        onSuccess={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}