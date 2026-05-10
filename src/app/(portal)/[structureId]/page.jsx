import { getHouseHomeData } from "@/actions/group-home";
import { HouseHomeClient } from "@/components/group-home/HouseHomeClient";

export default async function Page({ params }) {
  const { structureId } = await params;
  const initialData = await getHouseHomeData(structureId);

  return (
    <HouseHomeClient initialData={initialData} structureId={structureId} />
  );
}
