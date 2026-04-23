import { ArrowLeft, FolderOpen, PencilIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStructure } from "@/actions/admin/structure";
import { getAccessAction } from "@/actions/anagrafica/access";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import AccessDialog from "@/components/Anagrafica/AccessDialog/AccessDialog";
import AccessInfo from "@/components/Anagrafica/AccessInfo";
import AnagraficaReminders from "@/components/Anagrafica/AnagraficaReminders";
import DownloadPdfButton from "@/components/Anagrafica/DownloadPdfButton";
import HistoryTimeline from "@/components/Anagrafica/HistoryTimeline";
import Otherinfo from "@/components/Anagrafica/Otherinfo";
import OtherStructuresInfo from "@/components/Anagrafica/OtherStructuresInfo";
import ReminderDialog from "@/components/Anagrafica/ReminderDialog";
import { ShareAnagraficaDialog } from "@/components/Anagrafica/ShareAnagraficaDialog";
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

  return (
    <div className="w-full mx-auto px-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-2">
          <div className="capitalize flex gap-6">
            <h1 className="text-3xl font-bold flex items-center align-middle gap-2  text-gray-900">
              {/*  <IconUser className="w-6 h-6" />  */}
              {anagrafica.anagrafica?.nome} {anagrafica.anagrafica?.cognome}
            </h1>
            {hasVulnerabilities && (
              <Status status="offline">
                <StatusIndicator className="w-3 h-3" />
                <h3 className="text-sm font-medium text-red-600">
                  Presenti vulnerabilita
                </h3>
              </Status>
            )}

            {/*   <p className="text-gray-600 mt-1">
                Scheda Anagrafica - ID: {id}
              </p> */}
          </div>
          <div className="flex items-center gap-2">
            {isRegistrationPending && (
              <Badge className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50">
                Registrazione da completare
              </Badge>
            )}
            <Badge variant="outline" className="text-sm">
              Visualizzazione Autorizzata
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Informazioni Anagrafiche */}
        <Card className="lg:col-span-2 gap-2  ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <div className="flex items-center gap-2 flex-row">
                {/* <UserRound className="w-5 h-5" /> */}
                Informazioni Anagrafiche
              </div>
              <Link
                href={`/${structureId}/anagrafica/${anagrafica.id}/edit`}
                className="border-1 border-gray-300 rounded-md p-1 transition-all hover:shadow-sm hover:bg-gray-300 flex items-center"
              >
                <PencilIcon className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-4">
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
      <div className="flex justify-between items-center mt-4">
        <Button variant="outline" asChild className="">
          <Link href={`/${structureId}/anagrafica`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla lista
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${structureId}/anagrafica/${anagrafica.id}/files`}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Files & Documents
            </Link>
          </Button>
          {isRegistrationPending ? (
            <Button asChild>
              <Link href={`/${structureId}/anagrafica/${anagrafica.id}/registrazione`}>
                Completa Registrazione
              </Link>
            </Button>
          ) : (
            <>
              <ReminderDialog
                anagraficaId={anagrafica.id}
                structureId={structureId}
              />
              <DownloadPdfButton
                anagrafica={anagrafica}
                accesses={anagraficaAccesses?.accessi || []}
                anagraficaId={anagrafica.id}
                structureId={structureId}
                structureName={structureName}
              />
              {canManageSharing && (
                <ShareAnagraficaDialog
                  anagraficaId={anagrafica.id}
                  structureId={structureId}
                  anagraficaName={`${anagrafica.anagrafica?.nome || ""} ${anagrafica.anagrafica?.cognome || ""}`.trim()}
                />
              )}
              {/* <EventDialog anagraficaId={anagrafica.id} structureId={structureId} /> */}
              <AccessDialog
                anagraficaId={anagrafica.id}
                structureId={structureId}
              />
            </>
          )}
        </div>
      </div>

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
      <span className="text-gray-900 font-medium ">{value || "-"}</span>
    </div>
  );
}
