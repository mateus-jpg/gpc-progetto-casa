"use client";
import { Input } from "@/components/ui/input"
import { MaterialReactTable } from 'material-react-table'
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, SquareArrowOutUpRight, View, ExternalLink, HousePlus } from "lucide-react";
import Link from "next/link";

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

export function AnagraficaTable({ rows, structureId }) {
  const [globalFilter, setGlobalFilter] = useState('');

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

  const handleExportRows = (tableRows) => {

    const rowData = tableRows.map((row) => row.original);

    const exportData = transformDataForExport(rowData);

    const csv = generateCsv(csvConfig)(exportData);
    download(csvConfig)(csv);
  };

  const handleExportData = () => {

    const exportData = transformDataForExport(filteredRows);
    const csv = generateCsv(csvConfig)(exportData);
    download(csvConfig)(csv);
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
          <div className="flex gap-2 flex-row justify-around items-center ">
            <Link
              href={`/${structureId}/anagrafica/${row.original.id}`}
            >
              <View className="size-4" />
            </Link>
            <HousePlus className="size-4" />
          </div>
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
        renderTopToolbarCustomActions={({ table }) => (
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutto
            </Button>
            <Button
              disabled={table.getPrePaginationRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getPrePaginationRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutte le Righe
            </Button>
            <Button
              disabled={table.getRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Pagina
            </Button>
            <Button
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
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
    </div>
  );
}