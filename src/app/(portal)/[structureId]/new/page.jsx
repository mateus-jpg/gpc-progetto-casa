"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { createRegistrationDraft } from "@/actions/anagrafica/anagrafica";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
// Form configuration context
import { FormConfigProvider } from "@/context/FormConfigContext";
import AnagraficaFormSections from "@/features/anagrafica/form/AnagraficaFormSections";
import { createEmptyAnagraficaFormState } from "@/features/anagrafica/form/defaults";
import { prepareRegistrationDraftPayload } from "@/features/anagrafica/form/mappers";
import { useAnagraficaForm } from "@/features/anagrafica/form/useAnagraficaForm";
import { useStructureFormConfig } from "@/features/anagrafica/form/useStructureFormConfig";

export default function AnagraficaForm({ params }) {
  const { structureId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const { formConfig, configLoading } = useStructureFormConfig(structureId);
  const { formData, handleChange } = useAnagraficaForm(() =>
    createEmptyAnagraficaFormState({ structureId }),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!user || !user.uid) throw new Error("Utente non autenticato");

      const payload = prepareRegistrationDraftPayload(formData, structureId);
      const resultStr = await createRegistrationDraft(payload);
      const result = JSON.parse(resultStr);
      if (result.error) {
        toast.error(`Errore durante il salvataggio: ${result.message}`);
        return;
      }
      toast.success(
        "Bozza salvata. Procedi con la stampa del modulo e il caricamento della firma.",
      );
      router.push(`/${structureId}/anagrafica/${result.id}/registrazione`);
    } catch (err) {
      console.error("Errore submit anagrafica:", err);
      toast.error(`Errore durante il salvataggio: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while config loads
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento configurazione...</p>
        </div>
      </div>
    );
  }

  return (
    <FormConfigProvider config={formConfig}>
      <div className="min-h-screen">
        <div className="max-w-full mx-auto px-4">
          <div className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600 mb-2">
              Passo 1 di 2
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Nuova Registrazione
            </h1>
            <p className="text-gray-600">
              Salva i dati generali e poi genera il modulo da stampare, far
              firmare e caricare nella scheda.
            </p>
          </div>

          <Card className="mb-6 border-blue-200 bg-blue-50/80 shadow-sm">
            <CardContent className="pt-6 text-sm text-blue-950 space-y-1">
              <p className="font-medium">
                In questo primo passaggio salviamo la scheda in bozza.
              </p>
              <p>
                Nel secondo passaggio potrai generare il PDF di registrazione,
                stamparlo, raccogliere la firma e caricare il documento firmato
                nei file della persona.
              </p>
            </CardContent>
          </Card>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col lg:flex-row lg:flex-wrap gap-4 w-full"
          >
            <AnagraficaFormSections
              formData={formData}
              handleChange={handleChange}
              itemClassName="w-full lg:w-[calc(50%-8px)] min-w-0"
            />

            <div className="flex justify-center pt-2 col-span-2 w-full">
              <Button
                type="submit"
                size="lg"
                disabled={isSaving}
                className="w-full md:w-auto min-w-[200px] h-12 text-base font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva bozza e continua alla firma"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </FormConfigProvider>
  );
}
