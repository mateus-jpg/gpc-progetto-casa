import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAccessByIdAction } from "@/actions/anagrafica/access";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import AccessDetailClient from "@/components/Anagrafica/AccessDetailClient";

export default async function AccessDetailPage({ params }) {
  const { structureId, id: anagraficaId, accessId } = await params;

  const headersList = await headers();
  const userUid = headersList.get("x-user-uid");
  if (!userUid) return notFound();

  let accesso;
  let anagrafica;

  try {
    const raw = await getAccessByIdAction(accessId, anagraficaId);
    const parsed = JSON.parse(raw);
    accesso = parsed.accesso;
  } catch {
    return notFound();
  }

  if (!accesso) return notFound();

  try {
    const raw = await getAnagrafica(anagraficaId, structureId);
    anagrafica = JSON.parse(raw);
  } catch {
    return notFound();
  }

  if (!anagrafica) return notFound();

  const anagraficaName =
    `${anagrafica.anagrafica?.nome || ""} ${anagrafica.anagrafica?.cognome || ""}`.trim();

  return (
    <AccessDetailClient
      accesso={accesso}
      anagraficaId={anagraficaId}
      structureId={structureId}
      anagraficaName={anagraficaName}
    />
  );
}
