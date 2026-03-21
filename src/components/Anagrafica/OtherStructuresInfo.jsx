import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Info, Building2 } from "lucide-react";

/**
 * Component to display read-only information from other structures
 * @param {Array} otherStructuresData - Array of data objects from other structures
 */
export default function OtherStructuresInfo({ otherStructuresData }) {
    if (!otherStructuresData || otherStructuresData.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6 border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-blue-800">
                    <Info className="w-5 h-5" />
                    Dati da altre Strutture
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {otherStructuresData.map((data) => (
                        <AccordionItem key={data.id} value={data.id}>
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold text-gray-700">Struttura: {data.structureName || data.structureId}</span>
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        Aggiornato: {formatDate(data.updatedAt)}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
                                    {/* Nucleo Familiare */}
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-gray-900 border-b pb-1 mb-2">Nucleo Familiare</h4>
                                        <DataRow label="Tipo" value={data.nucleoFamiliare?.nucleo} />
                                        <DataRow label="Dettaglio" value={data.nucleoFamiliare?.nucleoTipo} />
                                        <DataRow label="Figli" value={data.nucleoFamiliare?.figli} />
                                    </div>

                                    {/* Vulnerabilita */}
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-gray-900 border-b pb-1 mb-2">Vulnerabilità</h4>
                                        <DataRow label="Elenco" value={data.vulnerabilita?.vulnerabilita?.join(', ')} />
                                        <DataRow label="Intenzione" value={data.vulnerabilita?.intenzioneItalia} />
                                    </div>

                                    {/* Situazione Legale */}
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-gray-900 border-b pb-1 mb-2">Situazione</h4>
                                        <DataRow label="Legale" value={data.legaleAbitativa?.situazioneLegale} />
                                        <DataRow label="Abitativa" value={data.legaleAbitativa?.situazioneAbitativa?.join(', ')} />
                                    </div>

                                    {/* Referral / Note */}
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-gray-900 border-b pb-1 mb-2">Altro</h4>
                                        <DataRow label="Referral" value={data.referral?.referral} />
                                        {/* Note are private? Assuming visible if shared view requested */}
                                        <DataRow label="Note" value={data.notes} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

function DataRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500">{label}:</span>
            <span className="col-span-2 font-medium text-gray-800">{value}</span>
        </div>
    );
}

function formatDate(ts) {
    if (!ts) return '-';
    // Handle Firestore Timestamp or Date string
    const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
}
