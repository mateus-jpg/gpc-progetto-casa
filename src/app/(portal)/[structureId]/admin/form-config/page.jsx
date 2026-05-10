import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { getStructureFormConfig } from "@/actions/admin/structure";
import { FormConfigManager } from "@/components/admin/FormConfigManager";
import { Button } from "@/components/ui/button";
import { requireUser, verifyStructureAdmin } from "@/utils/server-auth";

export const metadata = {
  title: "Configurazione Modulo Anagrafica",
  description:
    "Personalizza i campi del modulo di creazione anagrafica per questa struttura",
};

export default async function FormConfigAdminPage({ params }) {
  const { structureId } = await params;

  // Verify permissions
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });
  } catch (_e) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold text-destructive">Accesso Negato</h1>
        <p className="text-muted-foreground mt-2">
          Non hai i permessi per visualizzare questa pagina.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${structureId}`}>
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Torna alla dashboard
          </Link>
        </Button>
      </div>
    );
  }

  // Load form configuration
  let formConfig;
  try {
    formConfig = await getStructureFormConfig(structureId);
  } catch (e) {
    console.error("Error loading form config:", e);
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-destructive">Errore</h1>
        <p className="text-muted-foreground mt-2">
          Impossibile caricare la configurazione del modulo.
        </p>
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
          Configurazione Modulo Anagrafica
        </h1>
        <p className="text-muted-foreground mt-2">
          Personalizza quali sezioni e campi mostrare durante la creazione di
          una nuova scheda anagrafica. Puoi abilitare/disabilitare sezioni,
          impostare campi come obbligatori o opzionali, personalizzare le
          etichette e le opzioni dei menu a tendina.
        </p>
      </div>
      <FormConfigManager structureId={structureId} initialConfig={formConfig} />
    </div>
  );
}
