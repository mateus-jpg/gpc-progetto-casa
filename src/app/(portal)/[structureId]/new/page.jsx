"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
// Action
import { createAnagrafica } from "@/actions/anagrafica/anagrafica";
import { getStructureCategories, addSubcategoryToStructure, getStructureFormConfig } from "@/actions/admin/structure";
import { useAccessForm } from "@/hooks/useAccessForm";
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
// Form configuration context
import { FormConfigProvider } from "@/context/FormConfigContext";

// Form Components
import PersonalInfoSection from "@/components/Anagrafica/Form/PersonalInfoSection";
import FamilyUnitSection from "@/components/Anagrafica/Form/FamilyUnitSection";
import LegalStatusSection from "@/components/Anagrafica/Form/LegalStatusSection";
import WorkEducationSection from "@/components/Anagrafica/Form/WorkEducationSection";
import VulnerabilitySection from "@/components/Anagrafica/Form/VulnerabilitySection";
import ReferralSection from "@/components/Anagrafica/Form/ReferralSection";
import PostAccessDialog from "@/components/Anagrafica/AccessDialog/PostAccessDialog";

export default function AnagraficaForm({ params }) {
  const { structureId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);
  const [redirectId, setRedirectId] = useState(null);

  // Categories state
  const [categories, setCategories] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form configuration state
  const [formConfig, setFormConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch categories and form config on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, config] = await Promise.all([
          getStructureCategories(structureId),
          getStructureFormConfig(structureId)
        ]);
        setCategories(cats);
        setFormConfig(config);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setCategoriesLoading(false);
        setConfigLoading(false);
      }
    }
    loadData();
  }, [structureId]);

  // Handle adding a new subcategory
  const handleNewSubcategory = useCallback(async (categoryValue, newSubcategory) => {
    try {
      const result = await addSubcategoryToStructure(structureId, categoryValue, newSubcategory);
      if (result.success) {
        // Update local categories state
        setCategories((prevCategories) => {
          if (!prevCategories) return prevCategories;
          return prevCategories.map((cat) => {
            if (cat.value === categoryValue) {
              const existingSubcats = cat.subCategories || [];
              const altroIndex = existingSubcats.findIndex((s) => s === "Altro");
              const newSubcats = [...existingSubcats];
              if (altroIndex !== -1) {
                newSubcats.splice(altroIndex, 0, newSubcategory);
              } else {
                newSubcats.push(newSubcategory);
              }
              return { ...cat, subCategories: newSubcats };
            }
            return cat;
          });
        });
        if (!result.alreadyExists) {
          toast.success(`Sottocategoria "${newSubcategory}" aggiunta`);
        }
      } else {
        toast.error(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error("Error adding subcategory:", error);
      toast.error("Errore durante l'aggiunta della sottocategoria");
    }
  }, [structureId]);

  // Use Custom Hook for Access Logic - pass categories
  const {
    accessState,
    updateAccessField,
    prepareAccessPayload
  } = useAccessForm(categories);

  // Form Data for Anagrafica
  // Form Data for Anagrafica
  const [formData, setFormData] = useState({
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
    canBeAccessedBy: [structureId] || [],
  });

  const handleChange = (group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!user || !user.uid) throw new Error("Utente non autenticato");

      // 1. Prepare Anagrafica Payload
      const payload = {
        ...formData,
        registeredByStructure: structureId,
        canBeAccessedBy: [structureId]
      };

      if (payload.referral.referral === "Altro" || payload.referral.referral === "Ente partner") {
        if (payload.referral.referralAltro?.trim()) {
          payload.referral.referral = payload.referral.referralAltro.trim();
        }
      }
      delete payload.referral.referralAltro;

      // 2. Prepare Services (Access) Payload via Hook
      const servicesPayload = await prepareAccessPayload();

      // 3. Call Server Action
      const resultStr = await createAnagrafica(payload, servicesPayload);
      const result = JSON.parse(resultStr);
      if (result.error) {
        toast.error("Errore durante il salvataggio: " + result.message);
        return;
      }
      console.log("Anagrafica creata:", result);
      toast.success("Dati salvati correttamente");

      // Check if there are any reminders or deadlines to offer ICS download
      const hasReminders = servicesPayload.some(s => s.reminderDate || s.files?.some(f => f.expirationDate));

      if (hasReminders) {
        setLastPayload(servicesPayload);
        setRedirectId(result.id);
        setShowPostDialog(true);
      } else {
        // Redirect immediately if no reminders
        router.push(`/${structureId}/anagrafica/${result.id}`);
      }

    } catch (err) {
      console.error("Errore submit anagrafica:", err);
      toast.error("Errore durante il salvataggio: " + err.message);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Scheda Anagrafica
            </h1>
            <p className="text-gray-600">
              Compila tutti i campi richiesti per completare la registrazione
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:flex-wrap gap-4 w-full">
          {/* Each card section */}
          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <PersonalInfoSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <LegalStatusSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <FamilyUnitSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <WorkEducationSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <VulnerabilitySection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <ReferralSection formData={formData} handleChange={handleChange} />
          </div>

          {/* 7. PRIMO ACCESSO (NEW SECTION) */}
          <div className="w-full min-w-0">
            <Card className="shadow-sm border-blue-200 ring-1 ring-blue-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    7
                  </span>
                  Registra Primo Accesso & Documenti (Opzionale)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <AccessServicesForm
                    state={accessState}
                    onChange={updateAccessField}
                    showClassification={true}
                    showReferralEntity={true}
                    categories={categories}
                    onNewSubcategory={handleNewSubcategory}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
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
                <>💾 Salva Anagrafica e Accessi</>
              )}
            </Button>
          </div>

        </form>

          <PostAccessDialog
            open={showPostDialog}
            payload={lastPayload}
            onDone={() => {
              setShowPostDialog(false);
              if (redirectId) {
                router.push(`/${structureId}/anagrafica/${redirectId}`);
              }
            }}
          />
        </div>
      </div>
    </FormConfigProvider>
  );
}