import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { getStructureCategories } from "@/actions/admin/structure";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { Button } from "@/components/ui/button";
import { requireUser, verifyStructureAdmin } from "@/utils/server-auth";

export const metadata = {
  title: "Gestione Categorie Accessi",
};

export default async function CategoriesAdminPage({ params }) {
  const { structureId } = await params;

  // Permission Check - Only structure admins can manage categories
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });
  } catch (_e) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold text-destructive">Accesso Negato</h1>
        <p>Non hai i permessi per visualizzare questa pagina.</p>
      </div>
    );
  }

  let categories;
  try {
    categories = await getStructureCategories(structureId);
  } catch (e) {
    console.error("Error loading categories:", e);
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-destructive">Errore</h1>
        <p>Impossibile caricare le categorie.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href={`/${structureId}/admin`}>
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Torna all'amministrazione
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestione Categorie Accessi
        </h1>
        <p className="text-muted-foreground">
          Gestisci le categorie e sottocategorie degli accessi per questa
          struttura.
        </p>
      </div>
      <CategoriesManager
        structureId={structureId}
        initialCategories={categories}
      />
    </div>
  );
}
