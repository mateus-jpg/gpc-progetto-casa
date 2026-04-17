/**
 * Form Configuration Defaults
 * Defines all sections and fields for the modular anagrafica creation form
 */

import {
  EDUCATION_LEVEL_IT_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  FAMILY_ROLES_OPTIONS,
  GENDER_OPTIONS,
  HOUSING_STATUS_OPTIONS,
  ITALIAN_LEVEL_OPTIONS,
  JOB_STATUS_OPTIONS,
  LEGAL_STATUS_OPTIONS,
  REFERRAL_OPTIONS,
  VULNERABILITY_OPTIONS,
} from "@/data/formOptions";

/**
 * Section definitions with all fields and their metadata
 * This is the source of truth for form structure
 */
export const SECTION_DEFINITIONS = {
  personalInfo: {
    id: "personalInfo",
    dataKey: "anagrafica", // Key in formData where this section's data is stored
    defaultLabel: "Informazioni Anagrafiche",
    defaultOrder: 1,
    color: "blue",
    fields: {
      cognome: {
        type: "text",
        defaultLabel: "Cognome",
        defaultVisibility: "required",
        placeholder: "Inserisci cognome",
      },
      nome: {
        type: "text",
        defaultLabel: "Nome",
        defaultVisibility: "required",
        placeholder: "Inserisci nome",
      },
      sesso: {
        type: "select",
        defaultLabel: "Sesso",
        defaultVisibility: "required",
        defaultOptions: GENDER_OPTIONS,
        placeholder: "Seleziona sesso",
      },
      dataDiNascita: {
        type: "date",
        defaultLabel: "Data di nascita",
        defaultVisibility: "required",
      },
      luogoDiNascita: {
        type: "countrySelect",
        defaultLabel: "Luogo di nascita",
        defaultVisibility: "required",
        placeholder: "Seleziona paese",
      },
      cittadinanza: {
        type: "multiCountrySelect",
        defaultLabel: "Paese di provenienza / Cittadinanza",
        defaultVisibility: "required",
        placeholder: "Seleziona paesi",
      },
      comuneDiDomicilio: {
        type: "text",
        defaultLabel: "Comune di domicilio",
        defaultVisibility: "optional",
        placeholder: "Inserisci comune",
      },
      telefono: {
        type: "tel",
        defaultLabel: "Numero di cellulare",
        defaultVisibility: "optional",
        placeholder: "Inserisci numero",
      },
      email: {
        type: "email",
        defaultLabel: "Email",
        defaultVisibility: "optional",
        placeholder: "Inserisci email",
      },
    },
  },

  legalStatus: {
    id: "legalStatus",
    dataKey: "legaleAbitativa",
    defaultLabel: "Situazione Legale e Abitativa",
    defaultOrder: 2,
    color: "purple",
    fields: {
      situazioneLegale: {
        type: "select",
        defaultLabel: "Situazione Legale",
        defaultVisibility: "required",
        defaultOptions: LEGAL_STATUS_OPTIONS,
        placeholder: "Seleziona situazione legale",
      },
      situazioneAbitativa: {
        type: "multiSelect",
        defaultLabel: "Situazione Abitativa",
        defaultVisibility: "required",
        defaultOptions: HOUSING_STATUS_OPTIONS,
        placeholder: "Seleziona situazione abitativa",
      },
    },
  },

  familyUnit: {
    id: "familyUnit",
    dataKey: "nucleoFamiliare",
    defaultLabel: "Nucleo Familiare",
    defaultOrder: 3,
    color: "green",
    fields: {
      nucleo: {
        type: "radio",
        defaultLabel: "Tipo Nucleo",
        defaultVisibility: "required",
        defaultOptions: ["singolo", "famiglia"],
      },
      nucleoTipo: {
        type: "select",
        defaultLabel: "Composizione Nucleo",
        defaultVisibility: "conditional",
        condition: { field: "nucleo", value: "famiglia" },
        defaultOptions: FAMILY_ROLES_OPTIONS,
        placeholder: "Seleziona composizione",
      },
      figli: {
        type: "number",
        defaultLabel: "Numero figli minorenni",
        defaultVisibility: "conditional",
        condition: { field: "nucleo", value: "famiglia" },
        min: 0,
        max: 10,
      },
    },
  },

  workEducation: {
    id: "workEducation",
    dataKey: "lavoroFormazione",
    defaultLabel: "Lavoro e Formazione",
    defaultOrder: 4,
    color: "orange",
    fields: {
      situazioneLavorativa: {
        type: "select",
        defaultLabel: "Situazione Lavorativa",
        defaultVisibility: "required",
        defaultOptions: JOB_STATUS_OPTIONS,
        placeholder: "Seleziona situazione",
      },
      titoloDiStudioOrigine: {
        type: "select",
        defaultLabel: "Titolo di Studio (Paese di Origine)",
        defaultVisibility: "required",
        defaultOptions: EDUCATION_LEVEL_OPTIONS,
        placeholder: "Seleziona titolo",
      },
      titoloDiStudioItalia: {
        type: "select",
        defaultLabel: "Titolo di Studio (Italia)",
        defaultVisibility: "required",
        defaultOptions: EDUCATION_LEVEL_IT_OPTIONS,
        placeholder: "Seleziona titolo",
      },
      conoscenzaItaliano: {
        type: "select",
        defaultLabel: "Conoscenza Italiano",
        defaultVisibility: "required",
        defaultOptions: ITALIAN_LEVEL_OPTIONS,
        placeholder: "Seleziona livello",
      },
    },
  },

  vulnerability: {
    id: "vulnerability",
    dataKey: "vulnerabilita",
    defaultLabel: "Vulnerabilità e Prospettive",
    defaultOrder: 5,
    color: "red",
    fields: {
      vulnerabilita: {
        type: "multiSelect",
        defaultLabel: "Vulnerabilità",
        defaultVisibility: "required",
        defaultOptions: VULNERABILITY_OPTIONS,
        placeholder: "Seleziona vulnerabilità",
      },
      intenzioneItalia: {
        type: "radio",
        defaultLabel: "Intenzione di rimanere in Italia?",
        defaultVisibility: "required",
        defaultOptions: ["SI", "NO"],
      },
      paeseDestinazione: {
        type: "text",
        defaultLabel: "Paese di Destinazione",
        defaultVisibility: "conditional",
        condition: { field: "intenzioneItalia", value: "NO" },
        placeholder: "Inserisci paese",
      },
    },
  },

  referral: {
    id: "referral",
    dataKey: "referral",
    defaultLabel: "Come ci hai conosciuto?",
    defaultOrder: 6,
    color: "cyan",
    fields: {
      referral: {
        type: "select",
        defaultLabel: "Fonte",
        defaultVisibility: "required",
        defaultOptions: REFERRAL_OPTIONS,
        placeholder: "Seleziona fonte",
      },
      referralAltro: {
        type: "text",
        defaultLabel: "Specifica",
        defaultVisibility: "conditional",
        condition: { field: "referral", values: ["Altro", "Ente partner"] },
        placeholder: "Specifica la fonte",
      },
    },
  },

  accessServices: {
    id: "accessServices",
    dataKey: "services", // Special handling - uses accessCategories
    defaultLabel: "Registra Primo Accesso & Documenti (Opzionale)",
    defaultOrder: 7,
    color: "gray",
    isServiceSection: true, // Flag for special handling
    fields: {}, // Fields are dynamic based on accessCategories
  },
};

/**
 * Generate default configuration from section definitions
 * This is used when a structure has no custom configuration
 */
export function generateDefaultFormConfiguration() {
  const sections = {};

  for (const [sectionId, sectionDef] of Object.entries(SECTION_DEFINITIONS)) {
    const fields = {};

    for (const [fieldId, fieldDef] of Object.entries(sectionDef.fields)) {
      fields[fieldId] = {
        visibility: fieldDef.defaultVisibility,
        label: null, // null means use default
        options: null, // null means use default options
      };

      // Include condition if field is conditional
      if (fieldDef.condition) {
        fields[fieldId].condition = fieldDef.condition;
      }
    }

    sections[sectionId] = {
      enabled: true,
      order: sectionDef.defaultOrder,
      label: null, // null means use default
      fields,
    };
  }

  return {
    version: 1,
    sections,
  };
}

/**
 * Default form configuration
 */
export const DEFAULT_FORM_CONFIGURATION = generateDefaultFormConfiguration();

/**
 * Merge structure configuration with defaults
 * Returns a complete configuration with all fields populated
 */
export function mergeWithDefaults(structureConfig) {
  if (!structureConfig) {
    return DEFAULT_FORM_CONFIGURATION;
  }

  const merged = {
    version: structureConfig.version || 1,
    sections: {},
  };

  for (const [sectionId, sectionDef] of Object.entries(SECTION_DEFINITIONS)) {
    const structureSection = structureConfig.sections?.[sectionId] || {};
    const defaultSection = DEFAULT_FORM_CONFIGURATION.sections[sectionId];

    merged.sections[sectionId] = {
      enabled: structureSection.enabled ?? defaultSection.enabled,
      order: structureSection.order ?? defaultSection.order,
      label: structureSection.label, // Can be null (use default) or custom string
      fields: {},
    };

    for (const [fieldId, fieldDef] of Object.entries(sectionDef.fields)) {
      const structureField = structureSection.fields?.[fieldId] || {};
      const defaultField = defaultSection.fields[fieldId];

      merged.sections[sectionId].fields[fieldId] = {
        visibility: structureField.visibility ?? defaultField.visibility,
        label: structureField.label, // Can be null (use default) or custom string
        options: structureField.options, // Can be null (use default) or custom array
        condition: fieldDef.condition, // Always use definition condition
      };
    }
  }

  return merged;
}

/**
 * Get the effective label for a section
 */
export function getSectionLabel(sectionId, config) {
  const sectionConfig = config?.sections?.[sectionId];
  const sectionDef = SECTION_DEFINITIONS[sectionId];

  return sectionConfig?.label || sectionDef?.defaultLabel || sectionId;
}

/**
 * Get the effective label for a field
 */
export function getFieldLabel(sectionId, fieldId, config) {
  const fieldConfig = config?.sections?.[sectionId]?.fields?.[fieldId];
  const fieldDef = SECTION_DEFINITIONS[sectionId]?.fields?.[fieldId];

  return fieldConfig?.label || fieldDef?.defaultLabel || fieldId;
}

/**
 * Get the effective options for a field
 */
export function getFieldOptions(sectionId, fieldId, config) {
  const fieldConfig = config?.sections?.[sectionId]?.fields?.[fieldId];
  const fieldDef = SECTION_DEFINITIONS[sectionId]?.fields?.[fieldId];

  // If custom options are set, use them; otherwise use defaults
  return fieldConfig?.options || fieldDef?.defaultOptions || [];
}

/**
 * Check if a field should be visible based on its configuration and form data
 * Supports parent-linked visibility: if the parent field is hidden, conditional fields are also hidden
 */
export function isFieldVisible(sectionId, fieldId, config, formData) {
  const sectionConfig = config?.sections?.[sectionId];
  const fieldConfig = sectionConfig?.fields?.[fieldId];
  const fieldDef = SECTION_DEFINITIONS[sectionId]?.fields?.[fieldId];

  // Section must be enabled
  if (!sectionConfig?.enabled) {
    return false;
  }

  const visibility = fieldConfig?.visibility ?? fieldDef?.defaultVisibility;

  // Hidden fields are never visible
  if (visibility === "hidden") {
    return false;
  }

  // Conditional fields depend on another field's value AND the parent field's visibility
  if (visibility === "conditional") {
    const condition = fieldConfig?.condition || fieldDef?.condition;
    if (!condition) {
      return true; // No condition defined, show the field
    }

    // Parent-linked: Check if the parent/trigger field is visible
    const parentFieldId = condition.field;
    const parentFieldConfig = sectionConfig?.fields?.[parentFieldId];
    const parentFieldDef =
      SECTION_DEFINITIONS[sectionId]?.fields?.[parentFieldId];
    const parentVisibility =
      parentFieldConfig?.visibility ?? parentFieldDef?.defaultVisibility;

    // If parent field is hidden, conditional field is also hidden
    if (parentVisibility === "hidden") {
      return false;
    }

    // Check if the condition value is met
    const dataKey = SECTION_DEFINITIONS[sectionId]?.dataKey;
    const sectionData = formData?.[dataKey] || {};
    const dependentValue = sectionData[condition.field];

    // Check if condition is met
    if (condition.values) {
      // Multiple values (OR logic)
      return condition.values.includes(dependentValue);
    } else if (condition.value !== undefined) {
      // Single value
      return dependentValue === condition.value;
    }

    return true;
  }

  return true;
}

/**
 * Get the parent field ID for a conditional field
 * Returns null if the field is not conditional
 */
export function getParentFieldId(sectionId, fieldId) {
  const fieldDef = SECTION_DEFINITIONS[sectionId]?.fields?.[fieldId];
  if (fieldDef?.defaultVisibility === "conditional" && fieldDef?.condition) {
    return fieldDef.condition.field;
  }
  return null;
}

/**
 * Get all child fields that depend on a given field
 */
export function getChildFields(sectionId, parentFieldId) {
  const sectionDef = SECTION_DEFINITIONS[sectionId];
  if (!sectionDef) return [];

  return Object.entries(sectionDef.fields)
    .filter(([_, fieldDef]) => {
      return (
        fieldDef.defaultVisibility === "conditional" &&
        fieldDef.condition?.field === parentFieldId
      );
    })
    .map(([fieldId]) => fieldId);
}

/**
 * Check if a field is required
 */
export function isFieldRequired(sectionId, fieldId, config) {
  const fieldConfig = config?.sections?.[sectionId]?.fields?.[fieldId];
  const fieldDef = SECTION_DEFINITIONS[sectionId]?.fields?.[fieldId];

  const visibility = fieldConfig?.visibility ?? fieldDef?.defaultVisibility;
  return visibility === "required";
}

/**
 * Get ordered sections based on configuration
 */
export function getOrderedSections(config) {
  return Object.entries(config?.sections || {})
    .filter(([_, sectionConfig]) => sectionConfig.enabled)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .map(([sectionId]) => sectionId);
}
