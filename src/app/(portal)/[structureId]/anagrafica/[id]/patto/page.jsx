import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getJourneyPersonSummary,
  listPattiAccoglienza,
} from "@/actions/group-home";
import { PattoAccoglienzaManager } from "@/components/group-home/PattoAccoglienzaManager";
import { Button } from "@/components/ui/button";

export default async function PattoPage({ params }) {
  const { id: anagraficaId, structureId } = await params;

  try {
    const [anagrafica, entries] = await Promise.all([
      getJourneyPersonSummary(structureId, anagraficaId),
      listPattiAccoglienza(structureId, anagraficaId),
    ]);

    const anagraficaName =
      `${anagrafica.anagrafica?.nome || ""} ${anagrafica.anagrafica?.cognome || ""}`.trim() ||
      "Scheda persona";

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 px-4 lg:px-6">
          <Button asChild className="w-fit" variant="outline">
            <Link href={`/${structureId}/anagrafica/${anagraficaId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla scheda persona
            </Link>
          </Button>
        </div>

        <PattoAccoglienzaManager
          anagraficaId={anagraficaId}
          anagraficaName={anagraficaName}
          initialEntries={entries}
          structureId={structureId}
        />
      </div>
    );
  } catch {
    return notFound();
  }
}
