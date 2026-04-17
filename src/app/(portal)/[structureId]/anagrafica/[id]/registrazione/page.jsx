import { notFound } from "next/navigation";
import { getStructure } from "@/actions/admin/structure";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import RegistrationCompletionClient from "@/components/Anagrafica/RegistrationCompletionClient";

export default async function RegistrationPage({ params }) {
  const { id, structureId } = await params;

  let anagrafica = null;
  let structure = null;

  try {
    const [anagraficaJson, structureData] = await Promise.all([
      getAnagrafica(id, structureId),
      getStructure(structureId).catch(() => null),
    ]);
    anagrafica = JSON.parse(anagraficaJson);
    structure = structureData;
  } catch (error) {
    console.error("Error loading registration completion page:", error);
    return notFound();
  }

  if (!anagrafica) {
    return notFound();
  }

  return (
    <RegistrationCompletionClient
      anagrafica={anagrafica}
      structureId={structureId}
      structureName={structure?.name || null}
    />
  );
}
