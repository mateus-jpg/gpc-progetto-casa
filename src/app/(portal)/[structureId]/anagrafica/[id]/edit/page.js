"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAnagrafica,
  updateAnagrafica,
} from "@/actions/anagrafica/anagrafica";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormConfigProvider } from "@/context/FormConfigContext";
import AnagraficaFormSections from "@/features/anagrafica/form/AnagraficaFormSections";
import { createEmptyAnagraficaFormState } from "@/features/anagrafica/form/defaults";
import {
  prepareAnagraficaPayload,
  transformAnagraficaApiToFormState,
} from "@/features/anagrafica/form/mappers";
import { useAnagraficaForm } from "@/features/anagrafica/form/useAnagraficaForm";
import { useStructureFormConfig } from "@/features/anagrafica/form/useStructureFormConfig";

// Loading state component
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Caricamento dati in corso...</p>
      </div>
    </div>
  );
}

// Error state component
function ErrorState({ error, structureId }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Errore</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href={`/${structureId}/anagrafica`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla lista
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Header component
function PageHeader({ formData, structureId, id }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Modifica Scheda Anagrafica
        </h1>
        <p className="px-4 text-gray-600 text-xl border rounded-md">
          {formData.anagrafica.nome} {formData.anagrafica.cognome}
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href={`/${structureId}/anagrafica/${id}`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Annulla
        </Link>
      </Button>
    </div>
  );
}

// Submit buttons component
function FormActions({ structureId, id, isSaving }) {
  return (
    <div className="flex justify-between items-center pt-2 col-span-2">
      <Button type="button" variant="outline" asChild>
        <Link href={`/${structureId}/anagrafica/${id}`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Annulla
        </Link>
      </Button>
      <Button
        type="submit"
        size="lg"
        disabled={isSaving}
        className="min-w-[200px] h-12 text-base font-medium"
      >
        {isSaving
          ? <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          : "Salva Modifiche"}
      </Button>
    </div>
  );
}

export default function EditAnagraficaPage() {
  const { structureId, id } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const { formConfig, configLoading } = useStructureFormConfig(structureId);
  const { formData, setFormData, handleChange } = useAnagraficaForm(() =>
    createEmptyAnagraficaFormState(),
  );

  // Fetch existing anagrafica data
  useEffect(() => {
    const fetchAnagrafica = async () => {
      try {
        setIsLoading(true);
        const dataStr = await getAnagrafica(id, structureId);
        const data = JSON.parse(dataStr);
        setFormData(transformAnagraficaApiToFormState(data));
      } catch (err) {
        console.error("Error fetching anagrafica:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAnagrafica();
    }
  }, [id, setFormData, structureId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      const payload = prepareAnagraficaPayload(formData);
      await updateAnagrafica(id, payload, structureId);
      toast.success("Dati aggiornati correttamente");
      router.push(`/${structureId}/anagrafica/${id}`);
    } catch (err) {
      console.error("Errore update anagrafica:", err);
      toast.error("Errore durante l'aggiornamento: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || configLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} structureId={structureId} />;

  return (
    <FormConfigProvider config={formConfig}>
      <div className="min-h-screen">
        <div className="max-w-full mx-auto px-4">
          <PageHeader formData={formData} structureId={structureId} id={id} />

          <form
            onSubmit={handleSubmit}
            className="grid md:grid-cols-2 grid-cols-1 gap-6"
          >
            <AnagraficaFormSections
              formData={formData}
              handleChange={handleChange}
              includePrivacy
            />
            <FormActions
              structureId={structureId}
              id={id}
              isSaving={isSaving}
            />
          </form>
        </div>
      </div>
    </FormConfigProvider>
  );
}
