import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getJourneyPersonSummary,
  getPersonalProject,
} from "@/actions/group-home";
import { PersonalProjectManager } from "@/components/group-home/PersonalProjectManager";
import { Button } from "@/components/ui/button";

export default async function PersonalProjectPage({ params }) {
  const { id: anagraficaId, structureId } = await params;

  try {
    const [anagrafica, project] = await Promise.all([
      getJourneyPersonSummary(structureId, anagraficaId),
      getPersonalProject(structureId, anagraficaId),
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

        <PersonalProjectManager
          anagraficaId={anagraficaId}
          anagraficaName={anagraficaName}
          initialProject={project}
          structureId={structureId}
        />
      </div>
    );
  } catch {
    return notFound();
  }
}
