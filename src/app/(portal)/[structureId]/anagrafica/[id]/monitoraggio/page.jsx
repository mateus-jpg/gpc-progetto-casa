import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getJourneyPersonSummary,
  listIndividualMonitorings,
} from "@/actions/group-home";
import { AssessmentEntryManager } from "@/components/group-home/AssessmentEntryManager";
import { Button } from "@/components/ui/button";

export default async function MonitoringPage({ params }) {
  const { id: anagraficaId, structureId } = await params;

  try {
    const [anagrafica, entries] = await Promise.all([
      getJourneyPersonSummary(structureId, anagraficaId),
      listIndividualMonitorings(structureId, anagraficaId),
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

        <AssessmentEntryManager
          anagraficaId={anagraficaId}
          anagraficaName={anagraficaName}
          initialEntries={entries}
          structureId={structureId}
          variant="monitoring"
        />
      </div>
    );
  } catch {
    return notFound();
  }
}
