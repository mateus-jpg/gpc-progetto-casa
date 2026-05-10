import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileText,
  HandshakeIcon,
  Heart,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStructure } from "@/actions/admin/structure";
import { getAccessAction } from "@/actions/anagrafica/access";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import AccessInfo from "@/components/Anagrafica/AccessInfo";
import { AnagraficaActionFab } from "@/components/Anagrafica/AnagraficaActionFab";
import { AnagraficaOptionsMenu } from "@/components/Anagrafica/AnagraficaOptionsMenu";
import AnagraficaReminders from "@/components/Anagrafica/AnagraficaReminders";
import HistoryTimeline from "@/components/Anagrafica/HistoryTimeline";
import OperatorNotesCard from "@/components/Anagrafica/OperatorNotesCard";
import Otherinfo from "@/components/Anagrafica/Otherinfo";
import OtherStructuresInfo from "@/components/Anagrafica/OtherStructuresInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Status, StatusIndicator } from "@/components/ui/shadcn-io/status";
import { verifyStructureAdmin } from "@/utils/server-auth";
import { hasEffectiveVulnerabilities } from "@/utils/vulnerability";

export default async function AnagraficaViewPage({ params }) {
  const { id, structureId } = await params;
  const headersList = await headers();

  // Get user info from middleware
  const userUid = headersList.get("x-user-uid");

  if (!userUid) {
    return notFound();
  }

  // Use cached server action instead of fetch with no-store
  let anagrafica = null;
  try {
    const anagraficaJson = await getAnagrafica(id, structureId);
    anagrafica = JSON.parse(anagraficaJson);
  } catch (error) {
    console.error("Error fetching anagrafica:", error);
    return notFound();
  }

  // Fetch accessi and structure info in parallel
  const [anagraficaAccesses, structureData] = await Promise.all([
    getAccessAction(id),
    getStructure(structureId).catch(() => null),
  ]);
  const structureName = structureData?.name || null;
  let canManageSharing = false;

  try {
    await verifyStructureAdmin({ userUid, structureId });
    canManageSharing = true;
  } catch {
    canManageSharing = false;
  }

  if (!anagrafica) {
    return notFound();
  }

  const isRegistrationPending =
    anagrafica.registrationStatus === "draft_signature_pending";
  const hasVulnerabilities = hasEffectiveVulnerabilities(
    anagrafica.vulnerabilita?.vulnerabilita,
  );
  const anagraficaName =
    `${anagrafica.anagrafica?.nome || ""} ${anagrafica.anagrafica?.cognome || ""}`.trim();

  return (
    <div className="mx-auto w-full px-4 pb-24 md:pb-6">
      <div className="mb-6 space-y-4 px-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3 capitalize">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
              {anagrafica.anagrafica?.nome} {anagrafica.anagrafica?.cognome}
            </h1>
            {hasVulnerabilities && (
              <Status status="offline">
                <StatusIndicator className="w-3 h-3" />
                <h3 className="text-sm font-medium text-destructive">
                  Presenti vulnerabilita
                </h3>
              </Status>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {isRegistrationPending && (
                <Badge className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50">
                  Registrazione da completare
                </Badge>
              )}
              <Badge className="text-sm" variant="outline">
                Visualizzazione autorizzata
              </Badge>
              <AnagraficaOptionsMenu
                accesses={anagraficaAccesses?.accessi || []}
                anagrafica={anagrafica}
                anagraficaId={anagrafica.id}
                anagraficaName={anagraficaName}
                canManageSharing={canManageSharing}
                isRegistrationPending={isRegistrationPending}
                structureId={structureId}
                structureName={structureName}
              />
            </div>

            <div className="hidden max-w-4xl rounded-lg border bg-muted/20 p-3 md:block">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Percorso persona
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild variant="outline">
                  <Link
                    href={`/${structureId}/anagrafica/${anagrafica.id}/patto`}
                  >
                    <HandshakeIcon className="mr-2 h-4 w-4" />
                    Patto di Accoglienza
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/${structureId}/anagrafica/${anagrafica.id}/progetto-personalizzato`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Progetto Personalizzato
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/${structureId}/anagrafica/${anagrafica.id}/autovalutazione`}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Autovalutazione
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/${structureId}/anagrafica/${anagrafica.id}/monitoraggio`}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Monitoraggio Individuale
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/${structureId}/anagrafica/${anagrafica.id}/interventi`}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Diario Interventi
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button asChild variant="outline">
            <Link href={`/${structureId}/anagrafica`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla lista
            </Link>
          </Button>
          <p className="hidden text-sm text-muted-foreground md:block">
            Le utilità operative della scheda sono raccolte nel menu{" "}
            <span className="font-medium text-foreground">Opzioni</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </span>
              <div className="flex items-center gap-2 flex-row">
                Informazioni Anagrafiche
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-4">
            <DataRow label="Nome" value={anagrafica.anagrafica?.nome} />
            <DataRow label="Cognome" value={anagrafica.anagrafica?.cognome} />
            <DataRow label="Sesso" value={anagrafica.anagrafica?.sesso} />
            <DataRow
              label="Data di nascita"
              value={
                anagrafica.anagrafica?.dataDiNascita
                  ? formatTimestamp(anagrafica.anagrafica.dataDiNascita)
                  : "-"
              }
            />
            <DataRow
              label="Luogo di nascita"
              value={anagrafica.anagrafica?.luogoDiNascita}
            />
            <DataRow
              label="Cittadinanza"
              value={anagrafica.anagrafica?.cittadinanza?.join(", ") || "-"}
            />
            <DataRow
              label="Comune di domicilio"
              value={anagrafica.anagrafica?.comuneDiDomicilio}
            />

            <DataRow label="Telefono" value={anagrafica.anagrafica?.telefono} />
            <DataRow label="Email" value={anagrafica.anagrafica?.email} />
          </CardContent>
        </Card>
      </div>
      <AnagraficaActionFab
        anagraficaId={anagrafica.id}
        structureId={structureId}
        structureName={structureName}
      />
      <OperatorNotesCard
        anagraficaId={anagrafica.id}
        structureId={structureId}
        notes={anagrafica.internalNotes || ""}
      />

      {/* Other Info Section */}
      <Otherinfo anagrafica={anagrafica} />
      <OtherStructuresInfo
        otherStructuresData={anagrafica.otherStructuresData}
      />

      <AnagraficaReminders
        anagraficaId={anagrafica.id}
        structureId={structureId}
      />

      {anagraficaAccesses && (
        <AccessInfo accesses={anagraficaAccesses.accessi} />
      )}

      {/* History Section */}
      <div className="mt-6">
        <HistoryTimeline
          anagraficaId={anagrafica.id}
          structureId={structureId}
        />
      </div>
    </div>
  );
}

// Helper component for displaying data rows

const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return "";
  const date = new Date(ts._seconds * 1000);
  const tz = { timeZone: "Europe/Rome" };
  return includeTime
    ? date.toLocaleString("it-IT", tz)
    : date.toLocaleDateString("it-IT", tz);
};

function DataRow({ label, value, small = false }) {
  const textSize = small ? "text-sm" : "text-base";

  return (
    <div className={`flex flex-col ${textSize}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {label}
      </span>
      <span className="font-medium text-foreground">{value || "-"}</span>
    </div>
  );
}
