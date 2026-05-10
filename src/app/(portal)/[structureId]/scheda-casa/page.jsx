import { getHouseProfile, getStructureResidents } from "@/actions/group-home";
import { HouseProfileManager } from "@/components/group-home/HouseProfileManager";

export const metadata = {
  title: "Scheda Casa",
};

export default async function HouseProfilePage({ params }) {
  const { structureId } = await params;
  const [initialProfile, residents] = await Promise.all([
    getHouseProfile(structureId),
    getStructureResidents(structureId),
  ]);

  return (
    <div className="px-4 py-6 lg:px-6">
      <HouseProfileManager
        initialProfile={initialProfile}
        residents={residents}
        structureId={structureId}
      />
    </div>
  );
}
