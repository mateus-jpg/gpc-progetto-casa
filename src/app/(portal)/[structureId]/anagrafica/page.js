import { requireUser, verifyUserPermissions } from "@/utils/server-auth";
import { AnagraficaTable } from "./AnagraficaTable";
import { getData } from "./data";

export default async function AnagraficaPage({ params }) {
  const { structureId } = await params;
  const { userUid } = await requireUser();
  await verifyUserPermissions({ userUid, structureId });

  const rows = await getData(structureId);
  const data = JSON.parse(rows);

  return (
    <div className="p-4">
      <AnagraficaTable rows={data} structureId={structureId} canOperate />
    </div>
  );
}
