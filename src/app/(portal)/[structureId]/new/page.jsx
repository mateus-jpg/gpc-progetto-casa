"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { createRegistrationDraft } from "@/actions/anagrafica/anagrafica";
import HouseContextSection from "@/components/Anagrafica/Form/HouseContextSection";
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
      if (!formData.contestoCasa?.operatoreRiferimentoUid) {
        toast.error("Seleziona l'operatore di riferimento della casa");
        return;
      }
      if (!formData.contestoCasa?.dataIngresso) {
        toast.error("Inserisci la data di ingresso nella casa");
        return;
      }

      const payload = prepareRegistrationDraftPayload(formData, structureId);
      const resultStr = await createRegistrationDraft(payload);
      const result = JSON.parse(resultStr);
      if (result.error) {
        toast.error(`Errore durante il salvataggio: ${result.message}`);
        return;
      }
      toast.success("Scheda anagrafica registrata correttamente");
      router.push(`/${structureId}/anagrafica/${result.id}`);
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
              Registrazione
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Nuovo Accesso Casa
            </h1>
            <p className="text-gray-600">
              Inserisci la persona che entra in casa e assegna l'operatore di
              riferimento.
            </p>
          </div>

          <Card className="mb-6 border-blue-200 bg-blue-50/80 shadow-sm">
            <CardContent className="pt-6 text-sm text-blue-950 space-y-1">
              <p className="font-medium">
                La scheda viene salvata come registrazione attiva.
              </p>
              <p>
                Dopo il salvataggio verrai portato direttamente alla scheda
                anagrafica.
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
            <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
              <HouseContextSection
                formData={formData}
                handleChange={handleChange}
                structureId={structureId}
              />
            </div>

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
                  "Registra anagrafica"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </FormConfigProvider>
  );
}
