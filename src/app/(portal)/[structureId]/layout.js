import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StructureSidebar } from "@/components/structure/StructureSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { collections } from "@/utils/database";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

async function validateStructureAccess(structureId) {
  try {
    const structureDoc = await collections.structures().doc(structureId).get();
    if (!structureDoc.exists) {
      return { valid: false, reason: "not_found" };
    }

    const { userUid } = await requireUser();
    await verifyUserPermissions({ userUid, structureId });

    return { valid: true };
  } catch (_error) {
    return { valid: false, reason: "no_access" };
  }
}

export default async function Layout({ children, params }) {
  const { structureId } = await params;

  const { valid } = await validateStructureAccess(structureId);
  if (!valid) {
    redirect("/");
  }

  return (
    <>
      <StructureSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
