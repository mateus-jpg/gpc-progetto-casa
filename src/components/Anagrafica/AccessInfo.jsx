"use client";

import { ExternalLink, FileIcon } from "lucide-react";
import { MaterialReactTable } from "material-react-table";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { getAccessFileUrl } from "@/actions/anagrafica/access";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AccessInfo({ accesses }) {
  const params = useParams();
  const structureId = params?.structureId;

  const data = useMemo(
    () =>
      (accesses || []).flatMap((acc) => {
        if (acc.services && Array.isArray(acc.services)) {
          return acc.services.map((svc, idx) => ({
            ...svc,
            accessId: acc.id,
            anagraficaId: acc.anagraficaId,
            createdAt: acc.createdAt,
            createdBy: acc.createdBy,
            createdByEmail: acc.createdByEmail,
            uniqueKey: `${acc.id}-${idx}`,
          }));
        }
        return [acc];
      }),
    [accesses],
  );

  const handleDownloadFile = useCallback(async (anagraficaId, file) => {
    try {
      const response = await getAccessFileUrl({
        anagraficaId,
        filePath: file.path,
      });
      if (response.success && response.url) {
        window.open(response.url, "_blank");
      } else {
        toast.error("Impossibile recuperare il file.");
      }
    } catch (_error) {
      toast.error("Errore durante il download del file.");
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "detailLink",
        header: "",
        size: 48,
        enableSorting: false,
        Cell: ({ row }) => {
          const { accessId, anagraficaId } = row.original;
          if (!accessId || !anagraficaId || !structureId) return null;
          return (
            <a
              href={`/${structureId}/anagrafica/${anagraficaId}/accessi/${accessId}`}
              className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              title="Apri dettaglio accesso"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          );
        },
      },
      {
        accessorKey: "tipoAccesso",
        header: "Tipo Accesso",
        size: 160,
        Cell: ({ cell }) => cell.getValue() || "-",
      },
      {
        accessorKey: "sottoCategorie",
        header: "Sottocategorie",
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return Array.isArray(value) ? value.join(", ") : "-";
        },
        size: 200,
      },
      {
        accessorKey: "classificazione",
        header: "Classificazione",
        size: 150,
        Cell: ({ cell }) => cell.getValue() || "-",
      },
      {
        accessorKey: "enteRiferimento",
        header: "Ente di riferimento",
        size: 180,
        Cell: ({ cell }) => cell.getValue() || "-",
      },
      {
        accessorKey: "sanitizedNote",
        header: "Note",
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value || "-";
        },
        size: 250,
      },
      {
        accessorKey: "files",
        header: "File",
        Cell: ({ cell, row }) => {
          const files = cell.getValue() || [];
          const { anagraficaId } = row.original;

          if (!Array.isArray(files) || files.length === 0) return "-";
          return (
            <div className="flex flex-col gap-1">
              {files.map((f) => (
                <TooltipProvider key={f.path || f.nomeOriginale || f.nome}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(anagraficaId, f)}
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm bg-transparent border-0 cursor-pointer p-0"
                      >
                        <FileIcon className="w-4 h-4" />
                        {f.nome.length > 15
                          ? `${f.nome.slice(0, 15)}...`
                          : f.nome}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <p>
                          <strong>Nome:</strong> {f.nome}
                        </p>
                        <p>
                          <strong>Nome Originale:</strong>{" "}
                          {f.nomeOriginale || "-"}
                        </p>
                        <p>
                          <strong>Creato il:</strong>{" "}
                          {f.dataCreazione ? formatDate(f.dataCreazione) : "-"}
                        </p>
                        <p>
                          <strong>Scadenza:</strong>{" "}
                          {f.dataScadenza ? formatDate(f.dataScadenza) : "-"}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "createdAt",
        header: "Data",
        Cell: ({ cell }) => formatDate(cell.getValue()),
        size: 150,
      },
      {
        accessorKey: "reminderDate",
        header: "Promemoria",
        Cell: ({ cell }) => formatDate(cell.getValue()),
        size: 150,
      },
      {
        accessorKey: "createdByEmail",
        header: "Operatore",
        Cell: ({ cell, row }) =>
          cell.getValue() || row.original.createdBy || "-",
        size: 200,
      },
    ],
    [handleDownloadFile, structureId],
  );

  if (!accesses) return null;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="item-1"
      className="flex flex-col gap-2 mt-2"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="flex items-center justify-between gap-4 px-2">
          <h4 className="text-sm font-semibold">
            Visualizza / Nascondi Accessi
          </h4>
        </AccordionTrigger>
        <AccordionContent>
          {!data || data.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">
              Nessun accesso registrato per questa anagrafica.
            </p>
          ) : (
            <MaterialReactTable
              muiTablePaperProps={{
                sx: {
                  borderRadius: 3,
                  border: "1px solid var(--color-gray-200)",
                },
              }}
              columns={columns}
              data={data}
              enableDensityToggle={false}
              enableColumnActions={false}
              initialState={{
                sorting: [{ id: "createdAt", desc: true }],
              }}
              muiTableBodyCellProps={{ sx: { fontSize: "0.875rem" } }}
              muiTableHeadCellProps={{ sx: { fontWeight: "bold" } }}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("it-IT");
}
