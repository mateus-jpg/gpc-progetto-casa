"use server";

import clsx from "clsx";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronsUpDown,
  FileSliders,
  HandHeart,
  Scale,
  UsersRound,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Otherinfo({ anagrafica }) {
  return (
    <Accordion
      type="single"
      collapsible
      /*  onOpenChange={setIsOpen} */
      defaultValue="item-1"
      className="flex flex-col gap-2 mt-2 "
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="flex items-center justify-between gap-4 px-2">
          <h4 className="text-sm font-semibold">
            Visualizza / Nascondi Altre Informazioni
          </h4>

          {/*     <ChevronDown className={clsx("transition-all duration-300 size-8", { "rotate-180": !isOpen })} />
            <span className="sr-only">Toggle</span>
 */}
        </AccordionTrigger>
        {/* 2. Nucleo Familiare */}
        <AccordionContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                {/* <UsersRound className="w-6 h-6" /> */}
                Nucleo Familiare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow
                label="Composizione"
                value={
                  anagrafica.nucleoFamiliare?.nucleo === "singolo"
                    ? "Persona singola"
                    : "Nucleo familiare"
                }
              />
              {anagrafica.nucleoFamiliare?.nucleo === "famiglia" && (
                <>
                  <DataRow
                    label="Tipologia nucleo"
                    value={anagrafica.nucleoFamiliare?.nucleoTipo}
                  />
                  <DataRow
                    label="Numero figli minori"
                    value={anagrafica.nucleoFamiliare?.figli?.toString() || "0"}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* 3. Situazione Legale e Abitativa */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                {/* <Scale className="w-6 h-6" /> */}
                Situazione Legale e Abitativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow
                label="Situazione legale"
                value={anagrafica.legaleAbitativa?.situazioneLegale}
              />
              <DataRow
                label="Situazione abitativa"
                value={
                  anagrafica.legaleAbitativa?.situazioneAbitativa?.join(", ") ||
                  "-"
                }
              />
            </CardContent>
          </Card>

          {/* 4. Lavoro e Formazione */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </span>
                {/* <BriefcaseBusiness className="w-6 h-6" /> */}
                Lavoro e Formazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow
                label="Situazione lavorativa"
                value={anagrafica.lavoroFormazione?.situazioneLavorativa}
              />
              <DataRow
                label="Titolo di studio (paese origine)"
                value={anagrafica.lavoroFormazione?.titoloDiStudioOrigine}
              />
              <DataRow
                label="Titolo di studio (Italia)"
                value={anagrafica.lavoroFormazione?.titoloDiStudioItalia}
              />
              <DataRow
                label="Conoscenza italiano"
                value={anagrafica.lavoroFormazione?.conoscenzaItaliano}
              />
            </CardContent>
          </Card>

          {/* 5. Vulnerabilità e Prospettive */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  5
                </span>
                {/* <HandHeart className="w-6 h-6" /> */}
                Vulnerabilità e Prospettive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow
                label="Vulnerabilità"
                value={
                  anagrafica.vulnerabilita?.vulnerabilita?.join(", ") ||
                  "Nessuna"
                }
              />
              <DataRow
                label="Intenzione di fermarsi in Italia"
                value={anagrafica.vulnerabilita?.intenzioneItalia}
              />
              {anagrafica.vulnerabilita?.intenzioneItalia === "NO" && (
                <DataRow
                  label="Paese di destinazione"
                  value={anagrafica.vulnerabilita?.paeseDestinazione}
                />
              )}
            </CardContent>
          </Card>

          {/* 6. Referral */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  6
                </span>
                Come ci hai conosciuto?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow
                label="Come ci ha conosciuto"
                value={anagrafica.referral?.referral}
              />
            </CardContent>
          </Card>
          <div className="lg:col-span-2 gap-2  border-2 rounded-md bg-gray-100 pt-4 pb-2 ">
            <CardHeader className="">
              <CardTitle className="text-sm items-center flex gap-2">
                <FileSliders className="w-4 h-4" />
                Informazioni di Registrazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex text-sm space-x-4 text-gray-600">
              <DataRow
                label="Registrato da"
                value={anagrafica.registeredBy}
                small
              />
              <DataRow
                label="Struttura"
                value={anagrafica.registeredByStructure}
                small
              />
              <DataRow
                label="Data registrazione"
                value={
                  anagrafica.createdAt
                    ? formatTimestamp(anagrafica.createdAt, true)
                    : "-"
                }
                small
              />
              <DataRow
                label="Ultimo aggiornamento"
                value={
                  anagrafica.updatedAt
                    ? formatTimestamp(anagrafica.updatedAt, true)
                    : "-"
                }
                small
              />
              <DataRow
                label="Stato registrazione"
                value={
                  anagrafica.registrationStatus === "draft_signature_pending"
                    ? "Da completare"
                    : "Completata"
                }
                small
              />
              <DataRow
                label="Informativa cartacea raccolta"
                value={
                  anagrafica.privacy?.paperNoticeCollected === true ? "Sì" : "No"
                }
                small
              />
              <DataRow
                label="Data firma informativa"
                value={
                  anagrafica.privacy?.paperNoticeSignedAt
                    ? formatTimestamp(anagrafica.privacy.paperNoticeSignedAt, false)
                    : "-"
                }
                small
              />
              <DataRow
                label="Riferimento privacy"
                value={anagrafica.privacy?.paperNoticeReference || "-"}
                small
              />
              <DataRow
                label="Documento firmato"
                value={anagrafica.privacy?.paperNoticeFileName || "-"}
                small
              />
            </CardContent>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function DataRow({ label, value, small = false }) {
  const textSize = small ? "text-sm" : "text-base";

  return (
    <div className={`flex flex-col ${textSize}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {label}
      </span>
      <span className="text-gray-900  font-medium ">{value || "-"}</span>
    </div>
  );
}

const formatTimestamp = (ts, includeTime = false) => {
  if (!ts) return "";
  const date = ts?._seconds
    ? new Date(ts._seconds * 1000)
    : new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  const tz = { timeZone: "Europe/Rome" };
  return includeTime
    ? date.toLocaleString("it-IT", tz)
    : date.toLocaleDateString("it-IT", tz);
};
