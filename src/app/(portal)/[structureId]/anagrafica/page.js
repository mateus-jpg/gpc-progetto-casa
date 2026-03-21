import { requireUser, verifyStructureAdmin } from "@/utils/server-auth";
import { AnagraficaTable } from "./AnagraficaTable";
import { getData } from "./data";

export default async function AnagraficaPage({ params }) {
  const { structureId } = await params;

  const rows = await getData(structureId);
  const data = JSON.parse(rows);

  let isAdmin = false;
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });
    isAdmin = true;
  } catch (err) {
    console.error("[ANAGRAFICA_PAGE] isAdmin check failed:", err);
  }

  return (
    <div className="p-4">
      <AnagraficaTable
        rows={data}
        structureId={structureId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
