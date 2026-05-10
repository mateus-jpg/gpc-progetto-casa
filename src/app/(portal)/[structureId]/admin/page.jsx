import Link from "next/link";
import { notFound } from "next/navigation";
import { getStructure } from "@/actions/admin/structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { Button } from "@/components/ui/button";
import { requireUser, verifyStructureAdmin } from "@/utils/server-auth";

export const metadata = {
  title: "Structure Administration",
};

export default async function StructureAdminPage({ params }) {
  const { structureId } = await params;

  // Permission Check
  try {
    const { userUid } = await requireUser();
    // Uses the new stricter check that looks for Admin status
    await verifyStructureAdmin({ userUid, structureId });
  } catch (_e) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  let structure;
  try {
    structure = await getStructure(structureId);
  } catch (e) {
    console.error("Error loading structure:", e);
    if (e.message.includes("not found")) {
      notFound();
    }
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-destructive">Error</h1>
        <p>Failed to load structure information.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Structure Administration
          </h1>
          <p className="text-muted-foreground">
            Manage settings and information for this structure.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href={`/${structureId}/admin/form-config`}>
              Configurazione Modulo
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${structureId}/admin/categories`}>
              Gestione Categorie
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${structureId}/admin/users`}>Gestione Operatori</Link>
          </Button>
        </div>
      </div>
      <StructureForm structure={structure} />
    </div>
  );
}
