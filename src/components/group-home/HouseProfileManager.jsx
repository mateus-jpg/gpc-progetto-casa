"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { upsertHouseProfile } from "@/actions/group-home";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLIANCE_DEFAULTS,
  BILL_CONTACT_OPTIONS,
  COMMON_SPACE_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  TARI_PAYMENT_OPTIONS,
} from "@/lib/group-home/catalog";
import { formatDateForInput, formatDateLabel } from "@/lib/group-home/helpers";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyAppliance(id = "") {
  return {
    functioning: false,
    id,
    name: "",
    notes: "",
    ownership: "",
    present: true,
  };
}

function hasApplianceContent(item = {}) {
  return Boolean(
    item.name &&
      (item.present || item.functioning || item.ownership || item.notes),
  );
}

function normalizeApplianceForForm(item = {}, index = 0) {
  return {
    ...createEmptyAppliance(item.id || `appliance-${index}`),
    functioning: Boolean(item.functioning),
    name: item.name || "",
    notes: item.notes || "",
    ownership: item.ownership || "",
    present: item.present !== false,
  };
}

function createEmptyForm() {
  return {
    address: "",
    appliances: [],
    commonAreas: {
      cleaningRules: "",
      commonSpaces: [],
      otherCommonSpace: "",
      quietHours: "",
      wasteCollectionSchedule: "",
    },
    compiledAt: getTodayDate(),
    contract: {
      depositAmount: "",
      endDate: "",
      importantDeadlines: "",
      monthlyDueDay: "",
      monthlyRent: "",
      otherType: "",
      paymentMethod: "",
      paymentMethodOther: "",
      propertyOwner: "",
      rentContractHolder: "",
      startDate: "",
      subleaseContractHolder: "",
      type: "",
    },
    expenses: {
      cashFundEnabled: false,
      cashFundNotes: "",
      condominiumAverageCost: "",
      condominiumIncluded: null,
      extraordinaryExpenses: "",
    },
    maintenance: {
      emergencyReportingContact: "",
      ordinary: {
        boilerContact: "",
        boilerTechnician: "",
        conditionerContact: "",
        conditionerTechnician: "",
        nextInterventionAt: "",
      },
      usefulContacts: {
        condominiumAdmin: "",
        condominiumAdminContact: "",
        electrician: "",
        electricianContact: "",
        plumber: "",
        plumberContact: "",
        propertyEntity: "",
        propertyEntityContact: "",
      },
    },
    notes: "",
    operatorName: "",
    safety: {
      gasValveLocation: "",
      mainElectricalSwitchLocation: "",
      waterValveLocation: "",
    },
    updatedAt: "",
    utilities: {
      billPayer: "",
      billPayerOther: "",
      billReceiver: "",
      billReceiverOther: "",
      counters: {
        electricity: "",
        gas: "",
        water: "",
      },
      electricity: {
        accountHolder: "",
        customerCode: "",
        pod: "",
        transferNotes: "",
        vendorName: "",
      },
      gas: {
        accountHolder: "",
        customerCode: "",
        pdr: "",
        transferNotes: "",
        vendorName: "",
      },
      internetPhone: {
        accountHolder: "",
        monthlyCost: "",
      },
      tari: {
        accountHolder: "",
        paymentMode: "",
      },
      water: {
        accountHolder: "",
        customerCode: "",
        serviceNumber: "",
        transferNotes: "",
        vendorName: "",
      },
    },
  };
}

function createFormFromProfile(profile) {
  if (!profile) {
    return createEmptyForm();
  }

  const empty = createEmptyForm();
  const existingAppliances = Array.isArray(profile.appliances)
    ? profile.appliances
        .map(normalizeApplianceForForm)
        .filter(hasApplianceContent)
    : [];

  return {
    ...empty,
    address: profile.address || "",
    appliances: existingAppliances,
    commonAreas: {
      cleaningRules: profile.commonAreas?.cleaningRules || "",
      commonSpaces: profile.commonAreas?.commonSpaces || [],
      otherCommonSpace: profile.commonAreas?.otherCommonSpace || "",
      quietHours: profile.commonAreas?.quietHours || "",
      wasteCollectionSchedule:
        profile.commonAreas?.wasteCollectionSchedule || "",
    },
    compiledAt: formatDateForInput(profile.compiledAt) || getTodayDate(),
    contract: {
      depositAmount: profile.contract?.depositAmount ?? "",
      endDate: formatDateForInput(profile.contract?.endDate),
      importantDeadlines: profile.contract?.importantDeadlines || "",
      monthlyDueDay: profile.contract?.monthlyDueDay || "",
      monthlyRent: profile.contract?.monthlyRent ?? "",
      otherType: profile.contract?.otherType || "",
      paymentMethod: profile.contract?.paymentMethod || "",
      paymentMethodOther: profile.contract?.paymentMethodOther || "",
      propertyOwner: profile.contract?.propertyOwner || "",
      rentContractHolder: profile.contract?.rentContractHolder || "",
      startDate: formatDateForInput(profile.contract?.startDate),
      subleaseContractHolder: profile.contract?.subleaseContractHolder || "",
      type: profile.contract?.type || "",
    },
    expenses: {
      cashFundEnabled: Boolean(profile.expenses?.cashFundEnabled),
      cashFundNotes: profile.expenses?.cashFundNotes || "",
      condominiumAverageCost: profile.expenses?.condominiumAverageCost ?? "",
      condominiumIncluded:
        typeof profile.expenses?.condominiumIncluded === "boolean"
          ? profile.expenses.condominiumIncluded
          : null,
      extraordinaryExpenses: profile.expenses?.extraordinaryExpenses || "",
    },
    maintenance: {
      emergencyReportingContact:
        profile.maintenance?.emergencyReportingContact || "",
      ordinary: {
        boilerContact: profile.maintenance?.ordinary?.boilerContact || "",
        boilerTechnician: profile.maintenance?.ordinary?.boilerTechnician || "",
        conditionerContact:
          profile.maintenance?.ordinary?.conditionerContact || "",
        conditionerTechnician:
          profile.maintenance?.ordinary?.conditionerTechnician || "",
        nextInterventionAt: formatDateForInput(
          profile.maintenance?.ordinary?.nextInterventionAt,
        ),
      },
      usefulContacts: {
        condominiumAdmin:
          profile.maintenance?.usefulContacts?.condominiumAdmin || "",
        condominiumAdminContact:
          profile.maintenance?.usefulContacts?.condominiumAdminContact || "",
        electrician: profile.maintenance?.usefulContacts?.electrician || "",
        electricianContact:
          profile.maintenance?.usefulContacts?.electricianContact || "",
        plumber: profile.maintenance?.usefulContacts?.plumber || "",
        plumberContact:
          profile.maintenance?.usefulContacts?.plumberContact || "",
        propertyEntity:
          profile.maintenance?.usefulContacts?.propertyEntity || "",
        propertyEntityContact:
          profile.maintenance?.usefulContacts?.propertyEntityContact || "",
      },
    },
    notes: profile.notes || "",
    operatorName: profile.operatorName || "",
    safety: {
      gasValveLocation: profile.safety?.gasValveLocation || "",
      mainElectricalSwitchLocation:
        profile.safety?.mainElectricalSwitchLocation || "",
      waterValveLocation: profile.safety?.waterValveLocation || "",
    },
    updatedAt: formatDateForInput(profile.updatedAt),
    utilities: {
      billPayer: profile.utilities?.billPayer || "",
      billPayerOther: profile.utilities?.billPayerOther || "",
      billReceiver: profile.utilities?.billReceiver || "",
      billReceiverOther: profile.utilities?.billReceiverOther || "",
      counters: {
        electricity: profile.utilities?.counters?.electricity || "",
        gas: profile.utilities?.counters?.gas || "",
        water: profile.utilities?.counters?.water || "",
      },
      electricity: {
        accountHolder: profile.utilities?.electricity?.accountHolder || "",
        customerCode: profile.utilities?.electricity?.customerCode || "",
        pod: profile.utilities?.electricity?.pod || "",
        transferNotes: profile.utilities?.electricity?.transferNotes || "",
        vendorName: profile.utilities?.electricity?.vendorName || "",
      },
      gas: {
        accountHolder: profile.utilities?.gas?.accountHolder || "",
        customerCode: profile.utilities?.gas?.customerCode || "",
        pdr: profile.utilities?.gas?.pdr || "",
        transferNotes: profile.utilities?.gas?.transferNotes || "",
        vendorName: profile.utilities?.gas?.vendorName || "",
      },
      internetPhone: {
        accountHolder: profile.utilities?.internetPhone?.accountHolder || "",
        monthlyCost: profile.utilities?.internetPhone?.monthlyCost ?? "",
      },
      tari: {
        accountHolder: profile.utilities?.tari?.accountHolder || "",
        paymentMode: profile.utilities?.tari?.paymentMode || "",
      },
      water: {
        accountHolder: profile.utilities?.water?.accountHolder || "",
        customerCode: profile.utilities?.water?.customerCode || "",
        serviceNumber: profile.utilities?.water?.serviceNumber || "",
        transferNotes: profile.utilities?.water?.transferNotes || "",
        vendorName: profile.utilities?.water?.vendorName || "",
      },
    },
  };
}

export function HouseProfileManager({
  initialProfile,
  residents = [],
  structureId,
}) {
  const [formData, setFormData] = useState(() =>
    createFormFromProfile(initialProfile),
  );
  const [loading, setLoading] = useState(false);
  const [savedProfile, setSavedProfile] = useState(initialProfile);

  const setNestedValue = (section, field, value) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const setDoubleNestedValue = (section, subsection, field, value) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [subsection]: {
          ...current[section][subsection],
          [field]: value,
        },
      },
    }));
  };

  const updateAppliance = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      appliances: current.appliances.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addAppliance = () => {
    setFormData((current) => ({
      ...current,
      appliances: [
        ...current.appliances,
        createEmptyAppliance(`appliance-${Date.now()}`),
      ],
    }));
  };

  const removeAppliance = (index) => {
    setFormData((current) => ({
      ...current,
      appliances: current.appliances.filter(
        (_item, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await upsertHouseProfile(structureId, formData);
      if (!result.success) {
        toast.error("Salvataggio non riuscito");
        return;
      }

      setSavedProfile(result.houseProfile);
      setFormData(createFormFromProfile(result.houseProfile));
      toast.success("Scheda casa aggiornata");
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio della scheda casa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-muted/30 shadow-sm ring-1 ring-black/5">
        <CardHeader>
          <CardTitle>Scheda Casa</CardTitle>
          <CardDescription>
            Scheda anagrafica-tecnica dell'abitazione, unica per casa e
            condivisa con l'équipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {residents.length} residenti disponibili
          </Badge>
          {savedProfile?.updatedAt ? (
            <span>
              Ultimo aggiornamento: {formatDateLabel(savedProfile.updatedAt)}
            </span>
          ) : (
            <span>Nessuna scheda casa ancora salvata</span>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dati dell'abitazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="house-address">Indirizzo</Label>
                <Input
                  id="house-address"
                  value={formData.address}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="house-operatorName">
                  Operatore / servizio di riferimento
                </Label>
                <Input
                  id="house-operatorName"
                  value={formData.operatorName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      operatorName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="house-compiledAt">Data compilazione</Label>
                <Input
                  id="house-compiledAt"
                  type="date"
                  value={formData.compiledAt}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      compiledAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Persone che abitano la casa</Label>
              <p className="text-sm text-muted-foreground">
                Gli abitanti arrivano dal flusso <strong>Nuovo accesso</strong>{" "}
                della casa. Qui li mostriamo senza selezione manuale.
              </p>
              <div className="flex flex-wrap gap-2">
                {residents.length > 0 ? (
                  residents.map((resident) => (
                    <Badge key={resident.id} variant="outline">
                      {resident.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">
                    Nessun abitante ancora inserito
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contratto di abitazione</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="contract-type">Tipologia contratto</Label>
              <select
                id="contract-type"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={formData.contract.type}
                onChange={(event) =>
                  setNestedValue("contract", "type", event.target.value)
                }
              >
                <option value="">Seleziona</option>
                {CONTRACT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-otherType">Altro tipo</Label>
              <Input
                id="contract-otherType"
                value={formData.contract.otherType}
                onChange={(event) =>
                  setNestedValue("contract", "otherType", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-propertyOwner">
                Proprietario immobile
              </Label>
              <Input
                id="contract-propertyOwner"
                value={formData.contract.propertyOwner}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "propertyOwner",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-rentHolder">
                Intestatario contratto affitto
              </Label>
              <Input
                id="contract-rentHolder"
                value={formData.contract.rentContractHolder}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "rentContractHolder",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-subleaseHolder">
                Intestatario contratto subaffitto
              </Label>
              <Input
                id="contract-subleaseHolder"
                value={formData.contract.subleaseContractHolder}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "subleaseContractHolder",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-startDate">Data inizio contratto</Label>
              <Input
                id="contract-startDate"
                type="date"
                value={formData.contract.startDate}
                onChange={(event) =>
                  setNestedValue("contract", "startDate", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-endDate">Data fine contratto</Label>
              <Input
                id="contract-endDate"
                type="date"
                value={formData.contract.endDate}
                onChange={(event) =>
                  setNestedValue("contract", "endDate", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-deposit">Cauzione versata (€)</Label>
              <Input
                id="contract-deposit"
                type="number"
                value={formData.contract.depositAmount}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "depositAmount",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-monthlyRent">Affitto mensile (€)</Label>
              <Input
                id="contract-monthlyRent"
                type="number"
                value={formData.contract.monthlyRent}
                onChange={(event) =>
                  setNestedValue("contract", "monthlyRent", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-paymentMethod">Modalità pagamento</Label>
              <select
                id="contract-paymentMethod"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={formData.contract.paymentMethod}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "paymentMethod",
                    event.target.value,
                  )
                }
              >
                <option value="">Seleziona</option>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-paymentMethodOther">
                Altro pagamento
              </Label>
              <Input
                id="contract-paymentMethodOther"
                value={formData.contract.paymentMethodOther}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "paymentMethodOther",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-monthlyDueDay">Scadenza mensile</Label>
              <Input
                id="contract-monthlyDueDay"
                value={formData.contract.monthlyDueDay}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "monthlyDueDay",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2 xl:col-span-4">
              <Label htmlFor="contract-importantDeadlines">
                Scadenze importanti
              </Label>
              <Textarea
                id="contract-importantDeadlines"
                rows={3}
                value={formData.contract.importantDeadlines}
                onChange={(event) =>
                  setNestedValue(
                    "contract",
                    "importantDeadlines",
                    event.target.value,
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sicurezza e utenze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="safety-mainElectricalSwitchLocation">
                  Interruttore generale luce
                </Label>
                <Input
                  id="safety-mainElectricalSwitchLocation"
                  value={formData.safety.mainElectricalSwitchLocation}
                  onChange={(event) =>
                    setNestedValue(
                      "safety",
                      "mainElectricalSwitchLocation",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safety-gasValveLocation">Valvola gas</Label>
                <Input
                  id="safety-gasValveLocation"
                  value={formData.safety.gasValveLocation}
                  onChange={(event) =>
                    setNestedValue(
                      "safety",
                      "gasValveLocation",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safety-waterValveLocation">Valvola acqua</Label>
                <Input
                  id="safety-waterValveLocation"
                  value={formData.safety.waterValveLocation}
                  onChange={(event) =>
                    setNestedValue(
                      "safety",
                      "waterValveLocation",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="counter-water">Contatore acqua</Label>
                <Input
                  id="counter-water"
                  value={formData.utilities.counters.water}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "counters",
                      "water",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-electricity">Contatore luce</Label>
                <Input
                  id="counter-electricity"
                  value={formData.utilities.counters.electricity}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "counters",
                      "electricity",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-gas">Contatore gas</Label>
                <Input
                  id="counter-gas"
                  value={formData.utilities.counters.gas}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "counters",
                      "gas",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            {[
              ["electricity", "Energia elettrica", "POD"],
              ["gas", "Gas", "PDR"],
              ["water", "Acqua", "Numero servizio"],
            ].map(([key, label, codeLabel]) => (
              <div key={key} className="space-y-3 rounded-lg border p-4">
                <h3 className="font-semibold">{label}</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-2">
                    <Label>Intestatario</Label>
                    <Input
                      value={formData.utilities[key].accountHolder}
                      onChange={(event) =>
                        setDoubleNestedValue(
                          "utilities",
                          key,
                          "accountHolder",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ditta fornitrice</Label>
                    <Input
                      value={formData.utilities[key].vendorName}
                      onChange={(event) =>
                        setDoubleNestedValue(
                          "utilities",
                          key,
                          "vendorName",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Codice fornitura / cliente</Label>
                    <Input
                      value={formData.utilities[key].customerCode}
                      onChange={(event) =>
                        setDoubleNestedValue(
                          "utilities",
                          key,
                          "customerCode",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{codeLabel}</Label>
                    <Input
                      value={
                        key === "electricity"
                          ? formData.utilities.electricity.pod
                          : key === "gas"
                            ? formData.utilities.gas.pdr
                            : formData.utilities.water.serviceNumber
                      }
                      onChange={(event) =>
                        setDoubleNestedValue(
                          "utilities",
                          key,
                          key === "electricity"
                            ? "pod"
                            : key === "gas"
                              ? "pdr"
                              : "serviceNumber",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subentro / voltura</Label>
                    <Input
                      value={formData.utilities[key].transferNotes}
                      onChange={(event) =>
                        setDoubleNestedValue(
                          "utilities",
                          key,
                          "transferNotes",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="tari-holder">TARI intestatario</Label>
                <Input
                  id="tari-holder"
                  value={formData.utilities.tari.accountHolder}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "tari",
                      "accountHolder",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tari-paymentMode">TARI pagamento</Label>
                <select
                  id="tari-paymentMode"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={formData.utilities.tari.paymentMode}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "tari",
                      "paymentMode",
                      event.target.value,
                    )
                  }
                >
                  <option value="">Seleziona</option>
                  {TARI_PAYMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="internet-holder">Internet / telefono</Label>
                <Input
                  id="internet-holder"
                  value={formData.utilities.internetPhone.accountHolder}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "internetPhone",
                      "accountHolder",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internet-cost">Costo mensile (€)</Label>
                <Input
                  id="internet-cost"
                  type="number"
                  value={formData.utilities.internetPhone.monthlyCost}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "utilities",
                      "internetPhone",
                      "monthlyCost",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="bill-receiver">Chi riceve le bollette</Label>
                <select
                  id="bill-receiver"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={formData.utilities.billReceiver}
                  onChange={(event) =>
                    setNestedValue(
                      "utilities",
                      "billReceiver",
                      event.target.value,
                    )
                  }
                >
                  <option value="">Seleziona</option>
                  {BILL_CONTACT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-receiverOther">Altro ricevente</Label>
                <Input
                  id="bill-receiverOther"
                  value={formData.utilities.billReceiverOther}
                  onChange={(event) =>
                    setNestedValue(
                      "utilities",
                      "billReceiverOther",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-payer">Chi paga le bollette</Label>
                <select
                  id="bill-payer"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={formData.utilities.billPayer}
                  onChange={(event) =>
                    setNestedValue("utilities", "billPayer", event.target.value)
                  }
                >
                  <option value="">Seleziona</option>
                  {BILL_CONTACT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-payerOther">Altro pagante</Label>
                <Input
                  id="bill-payerOther"
                  value={formData.utilities.billPayerOther}
                  onChange={(event) =>
                    setNestedValue(
                      "utilities",
                      "billPayerOther",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spese ed elettrodomestici</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="expenses-condominiumIncluded">
                  Spese condominiali
                </Label>
                <select
                  id="expenses-condominiumIncluded"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={
                    formData.expenses.condominiumIncluded === null
                      ? ""
                      : formData.expenses.condominiumIncluded
                        ? "true"
                        : "false"
                  }
                  onChange={(event) =>
                    setNestedValue(
                      "expenses",
                      "condominiumIncluded",
                      event.target.value === ""
                        ? null
                        : event.target.value === "true",
                    )
                  }
                >
                  <option value="">Non specificato</option>
                  <option value="true">Incluse</option>
                  <option value="false">Non incluse</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenses-condominiumAverageCost">
                  Importo medio condominiale (€)
                </Label>
                <Input
                  id="expenses-condominiumAverageCost"
                  type="number"
                  value={formData.expenses.condominiumAverageCost}
                  onChange={(event) =>
                    setNestedValue(
                      "expenses",
                      "condominiumAverageCost",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenses-cashFundNotes">
                  Fondo cassa / gestione
                </Label>
                <Input
                  id="expenses-cashFundNotes"
                  value={formData.expenses.cashFundNotes}
                  onChange={(event) =>
                    setNestedValue(
                      "expenses",
                      "cashFundNotes",
                      event.target.value,
                    )
                  }
                />
              </div>
              <Label className="flex items-center gap-2 self-end py-2">
                <Checkbox
                  className="h-4 w-4 rounded-[2px]"
                  checked={formData.expenses.cashFundEnabled}
                  onCheckedChange={(checked) =>
                    setNestedValue(
                      "expenses",
                      "cashFundEnabled",
                      Boolean(checked),
                    )
                  }
                />
                <span>Fondo cassa attivo</span>
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses-extraordinaryExpenses">
                Spese straordinarie previste
              </Label>
              <Textarea
                id="expenses-extraordinaryExpenses"
                rows={3}
                value={formData.expenses.extraordinaryExpenses}
                onChange={(event) =>
                  setNestedValue(
                    "expenses",
                    "extraordinaryExpenses",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>Elettrodomestici presenti e dotazioni</Label>
                <Button type="button" variant="outline" onClick={addAppliance}>
                  <Plus className="h-4 w-4" />
                  Aggiungi elettrodomestico
                </Button>
              </div>

              {formData.appliances.length === 0 ? (
                <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
                  Nessun elettrodomestico inserito.
                </div>
              ) : (
                formData.appliances.map((appliance, index) => (
                  <div
                    key={appliance.id || index}
                    className="space-y-4 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor={`appliance-name-${index}`}>
                            Elettrodomestico
                          </Label>
                          <Input
                            id={`appliance-name-${index}`}
                            list="appliance-suggestions"
                            value={appliance.name}
                            onChange={(event) =>
                              updateAppliance(index, "name", event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`appliance-ownership-${index}`}>
                            Proprietà
                          </Label>
                          <select
                            id={`appliance-ownership-${index}`}
                            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                            value={appliance.ownership}
                            onChange={(event) =>
                              updateAppliance(
                                index,
                                "ownership",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Seleziona</option>
                            <option value="Casa">Casa</option>
                            <option value="Inquilino">Inquilino</option>
                          </select>
                        </div>
                        <Label className="flex items-center gap-2 self-end py-2">
                          <Checkbox
                            className="h-4 w-4 rounded-[2px]"
                            checked={appliance.present}
                            onCheckedChange={(checked) =>
                              updateAppliance(
                                index,
                                "present",
                                Boolean(checked),
                              )
                            }
                          />
                          <span>Presente</span>
                        </Label>
                        <Label className="flex items-center gap-2 self-end py-2">
                          <Checkbox
                            className="h-4 w-4 rounded-[2px]"
                            checked={appliance.functioning}
                            onCheckedChange={(checked) =>
                              updateAppliance(
                                index,
                                "functioning",
                                Boolean(checked),
                              )
                            }
                          />
                          <span>Funzionante</span>
                        </Label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAppliance(index)}
                        aria-label="Rimuovi elettrodomestico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`appliance-notes-${index}`}>Note</Label>
                      <Input
                        id={`appliance-notes-${index}`}
                        value={appliance.notes}
                        onChange={(event) =>
                          updateAppliance(index, "notes", event.target.value)
                        }
                      />
                    </div>
                  </div>
                ))
              )}
              <datalist id="appliance-suggestions">
                {APPLIANCE_DEFAULTS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manutenzione e spazi comuni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Tecnico caldaia</Label>
                <Input
                  value={formData.maintenance.ordinary.boilerTechnician}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "maintenance",
                      "ordinary",
                      "boilerTechnician",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contatto caldaia</Label>
                <Input
                  value={formData.maintenance.ordinary.boilerContact}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "maintenance",
                      "ordinary",
                      "boilerContact",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tecnico condizionatore</Label>
                <Input
                  value={formData.maintenance.ordinary.conditionerTechnician}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "maintenance",
                      "ordinary",
                      "conditionerTechnician",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contatto condizionatore</Label>
                <Input
                  value={formData.maintenance.ordinary.conditionerContact}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "maintenance",
                      "ordinary",
                      "conditionerContact",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Scadenza prossimo intervento</Label>
                <Input
                  type="date"
                  value={formData.maintenance.ordinary.nextInterventionAt}
                  onChange={(event) =>
                    setDoubleNestedValue(
                      "maintenance",
                      "ordinary",
                      "nextInterventionAt",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["propertyEntity", "Proprietà / ente"],
                ["plumber", "Tecnico / idraulico"],
                ["electrician", "Elettricista"],
                ["condominiumAdmin", "Amministratore condominio"],
              ].map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={formData.maintenance.usefulContacts[field]}
                    onChange={(event) =>
                      setDoubleNestedValue(
                        "maintenance",
                        "usefulContacts",
                        field,
                        event.target.value,
                      )
                    }
                  />
                  <Input
                    placeholder="Telefono / email"
                    value={
                      formData.maintenance.usefulContacts[`${field}Contact`]
                    }
                    onChange={(event) =>
                      setDoubleNestedValue(
                        "maintenance",
                        "usefulContacts",
                        `${field}Contact`,
                        event.target.value,
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-emergencyReportingContact">
                A chi segnalare problemi / manutenzione straordinaria
              </Label>
              <Textarea
                id="maintenance-emergencyReportingContact"
                rows={3}
                value={formData.maintenance.emergencyReportingContact}
                onChange={(event) =>
                  setNestedValue(
                    "maintenance",
                    "emergencyReportingContact",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Spazi comuni presenti</Label>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {COMMON_SPACE_OPTIONS.map((option) => (
                  <Label key={option} className="flex items-center gap-2 py-1">
                    <Checkbox
                      className="h-4 w-4 rounded-[2px]"
                      checked={formData.commonAreas.commonSpaces.includes(
                        option,
                      )}
                      onCheckedChange={() =>
                        setNestedValue(
                          "commonAreas",
                          "commonSpaces",
                          toggleArrayValue(
                            formData.commonAreas.commonSpaces,
                            option,
                          ),
                        )
                      }
                    />
                    <span>{option}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commonAreas-otherCommonSpace">
                  Altro spazio
                </Label>
                <Input
                  id="commonAreas-otherCommonSpace"
                  value={formData.commonAreas.otherCommonSpace}
                  onChange={(event) =>
                    setNestedValue(
                      "commonAreas",
                      "otherCommonSpace",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commonAreas-quietHours">
                  Orari di silenzio
                </Label>
                <Input
                  id="commonAreas-quietHours"
                  value={formData.commonAreas.quietHours}
                  onChange={(event) =>
                    setNestedValue(
                      "commonAreas",
                      "quietHours",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commonAreas-wasteCollectionSchedule">
                Raccolta rifiuti
              </Label>
              <Textarea
                id="commonAreas-wasteCollectionSchedule"
                rows={3}
                value={formData.commonAreas.wasteCollectionSchedule}
                onChange={(event) =>
                  setNestedValue(
                    "commonAreas",
                    "wasteCollectionSchedule",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commonAreas-cleaningRules">
                Regole pulizie spazi comuni
              </Label>
              <Textarea
                id="commonAreas-cleaningRules"
                rows={3}
                value={formData.commonAreas.cleaningRules}
                onChange={(event) =>
                  setNestedValue(
                    "commonAreas",
                    "cleaningRules",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-notes">Note finali</Label>
              <Textarea
                id="house-notes"
                rows={4}
                value={formData.notes}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button disabled={loading} type="submit">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salva scheda casa
        </Button>
      </form>
    </div>
  );
}
