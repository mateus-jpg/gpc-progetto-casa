"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAnagrafica, updateAnagrafica } from "@/actions/anagrafica/anagrafica";
import { toast } from "sonner";

// Form sections - reusable components
import PersonalInfoSection from "@/components/Anagrafica/Form/PersonalInfoSection";
import FamilyUnitSection from "@/components/Anagrafica/Form/FamilyUnitSection";
import LegalStatusSection from "@/components/Anagrafica/Form/LegalStatusSection";
import WorkEducationSection from "@/components/Anagrafica/Form/WorkEducationSection";
import VulnerabilitySection from "@/components/Anagrafica/Form/VulnerabilitySection";
import ReferralSection from "@/components/Anagrafica/Form/ReferralSection";

const INITIAL_FORM_STATE = {
  anagrafica: {
    cognome: "",
    nome: "",
    sesso: "",
    dataDiNascita: undefined,
    luogoDiNascita: "",
    cittadinanza: [],
    comuneDiDomicilio: "",
    telefono: "",
    email: "",
  },
  nucleoFamiliare: {
    nucleo: "singolo",
    nucleoTipo: "",
    figli: 0,
  },
  legaleAbitativa: {
    situazioneLegale: "",
    situazioneAbitativa: [],
  },
  lavoroFormazione: {
    situazioneLavorativa: "",
    titoloDiStudioOrigine: "",
    titoloDiStudioItalia: "",
    conoscenzaItaliano: "",
  },
  vulnerabilita: {
    vulnerabilita: [],
    intenzioneItalia: "",
    paeseDestinazione: "",
  },
  referral: {
    referral: "",
    referralAltro: "",
  },
  canBeAccessedBy: [],
};

/**
 * Transforms API response data into form state format
 */
function transformApiDataToFormState(data) {
  // Handle date conversion
  let dataDiNascita;
  if (data.anagrafica?.dataDiNascita) {
    if (typeof data.anagrafica.dataDiNascita === 'string') {
      dataDiNascita = new Date(data.anagrafica.dataDiNascita);
    } else if (data.anagrafica.dataDiNascita._seconds) {
      dataDiNascita = new Date(data.anagrafica.dataDiNascita._seconds * 1000);
    }
  }

  return {
    anagrafica: {
      cognome: data.anagrafica?.cognome || "",
      nome: data.anagrafica?.nome || "",
      sesso: data.anagrafica?.sesso || "",
      dataDiNascita,
      luogoDiNascita: data.anagrafica?.luogoDiNascita || "",
      cittadinanza: data.anagrafica?.cittadinanza || [],
      comuneDiDomicilio: data.anagrafica?.comuneDiDomicilio || "",
      telefono: data.anagrafica?.telefono || "",
      email: data.anagrafica?.email || "",
    },
    nucleoFamiliare: {
      nucleo: data.nucleoFamiliare?.nucleo || "singolo",
      nucleoTipo: data.nucleoFamiliare?.nucleoTipo || "",
      figli: data.nucleoFamiliare?.figli || 0,
    },
    legaleAbitativa: {
      situazioneLegale: data.legaleAbitativa?.situazioneLegale || "",
      situazioneAbitativa: data.legaleAbitativa?.situazioneAbitativa || [],
    },
    lavoroFormazione: {
      situazioneLavorativa: data.lavoroFormazione?.situazioneLavorativa || "",
      titoloDiStudioOrigine: data.lavoroFormazione?.titoloDiStudioOrigine || "",
      titoloDiStudioItalia: data.lavoroFormazione?.titoloDiStudioItalia || "",
      conoscenzaItaliano: data.lavoroFormazione?.conoscenzaItaliano || "",
    },
    vulnerabilita: {
      vulnerabilita: data.vulnerabilita?.vulnerabilita || [],
      intenzioneItalia: data.vulnerabilita?.intenzioneItalia || "",
      paeseDestinazione: data.vulnerabilita?.paeseDestinazione || "",
    },
    referral: {
      referral: data.referral?.referral || "",
      referralAltro: "",
    },
    canBeAccessedBy: data.canBeAccessedBy || [],
  };
}

/**
 * Prepares form data for API submission
 */
function preparePayloadForSubmission(formData) {
  const payload = { ...formData };

  // Handle referral normalization
  let finalReferral = payload.referral.referral;
  if ((finalReferral === "Altro" || finalReferral === "Ente partner") && payload.referral.referralAltro?.trim()) {
    finalReferral = payload.referral.referralAltro.trim();
  }

  payload.referral = { ...payload.referral, referral: finalReferral };
  delete payload.referral.referralAltro;

  return payload;
}

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
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvataggio...
          </>
        ) : (
          "Salva Modifiche"
        )}
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
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Fetch existing anagrafica data
  useEffect(() => {
    const fetchAnagrafica = async () => {
      try {
        setIsLoading(true);
        const dataStr = await getAnagrafica(id, structureId);
        const data = JSON.parse(dataStr);
        setFormData(transformApiDataToFormState(data));
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
  }, [id]);

  // Memoized change handler to prevent unnecessary re-renders
  const handleChange = useCallback((group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      const payload = preparePayloadForSubmission(formData);
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

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} structureId={structureId} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4">
        <PageHeader formData={formData} structureId={structureId} id={id} />

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 grid-cols-1 gap-6">
          <PersonalInfoSection formData={formData} handleChange={handleChange} />
          <FamilyUnitSection formData={formData} handleChange={handleChange} />
          <LegalStatusSection formData={formData} handleChange={handleChange} />
          <WorkEducationSection formData={formData} handleChange={handleChange} />
          <VulnerabilitySection formData={formData} handleChange={handleChange} />
          <ReferralSection formData={formData} handleChange={handleChange} />
          <FormActions structureId={structureId} id={id} isSaving={isSaving} />
        </form>
      </div>
    </div>
  );
}
