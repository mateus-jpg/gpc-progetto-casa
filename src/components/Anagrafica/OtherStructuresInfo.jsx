import { Building2, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SHAREABLE_STRUCTURE_DATA_LABELS } from "@/utils/anagraficaSharing";

const SHARED_FIELD_ORDER = [
  "nucleoFamiliare",
  "legaleAbitativa",
  "lavoroFormazione",
  "vulnerabilita",
  "referral",
  "notes",
];

function buildFieldRows(data, field) {
  switch (field) {
    case "nucleoFamiliare":
      return [
        [
          "Composizione",
          data.nucleoFamiliare?.nucleo === "singolo"
            ? "Persona singola"
            : data.nucleoFamiliare?.nucleo === "famiglia"
              ? "Nucleo familiare"
              : null,
        ],
        ["Tipologia nucleo", data.nucleoFamiliare?.nucleoTipo],
        ["Figli minori", data.nucleoFamiliare?.figli?.toString?.() || null],
      ];
    case "legaleAbitativa":
      return [
        ["Situazione legale", data.legaleAbitativa?.situazioneLegale],
        [
          "Situazione abitativa",
          data.legaleAbitativa?.situazioneAbitativa?.join?.(", ") || null,
        ],
      ];
    case "lavoroFormazione":
      return [
        ["Situazione lavorativa", data.lavoroFormazione?.situazioneLavorativa],
        [
          "Titolo di studio (origine)",
          data.lavoroFormazione?.titoloDiStudioOrigine,
        ],
        [
          "Titolo di studio (Italia)",
          data.lavoroFormazione?.titoloDiStudioItalia,
        ],
        ["Conoscenza italiano", data.lavoroFormazione?.conoscenzaItaliano],
      ];
    case "vulnerabilita":
      return [
        [
          "Vulnerabilita",
          data.vulnerabilita?.vulnerabilita?.join?.(", ") || null,
        ],
        ["Intenzione in Italia", data.vulnerabilita?.intenzioneItalia],
        ["Paese destinazione", data.vulnerabilita?.paeseDestinazione],
      ];
    case "referral":
      return [["Referral", data.referral?.referral]];
    case "notes":
      return [["Note", data.notes]];
    default:
      return [];
  }
}

function formatDate(ts) {
  if (!ts) return "-";
  const date = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
}

function DataRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="col-span-2 font-medium text-foreground">{value}</span>
    </div>
  );
}

function SharedSection({ data, field }) {
  const rows = buildFieldRows(data, field).filter(([, value]) => value);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h4 className="font-medium text-foreground border-b pb-1 mb-2">
        {SHAREABLE_STRUCTURE_DATA_LABELS[field] || field}
      </h4>
      {rows.map(([label, value]) => (
        <DataRow key={`${field}-${label}`} label={label} value={value} />
      ))}
    </div>
  );
}

export default function OtherStructuresInfo({ otherStructuresData }) {
  if (!otherStructuresData || otherStructuresData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2 text-blue-800">
          <Info className="w-5 h-5" />
          Informazioni condivise da altre strutture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {otherStructuresData.map((data) => (
            <AccordionItem key={data.id} value={data.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-wrap">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    Struttura: {data.structureName || data.structureId}
                  </span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    Aggiornato: {formatDate(data.updatedAt)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2 pb-4">
                  {(data.sharedFields || []).map((field) => (
                    <Badge
                      key={`${data.id}-${field}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {SHAREABLE_STRUCTURE_DATA_LABELS[field] || field}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
                  {SHARED_FIELD_ORDER.map((field) => (
                    <SharedSection
                      key={`${data.id}-${field}`}
                      data={data}
                      field={field}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
