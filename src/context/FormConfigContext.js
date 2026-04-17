"use client";

import { createContext, useContext, useMemo } from "react";
import {
  DEFAULT_FORM_CONFIGURATION,
  getFieldLabel,
  getFieldOptions,
  getOrderedSections,
  getSectionLabel,
  isFieldRequired,
  isFieldVisible,
  mergeWithDefaults,
  SECTION_DEFINITIONS,
} from "@/data/formConfigDefaults";

/**
 * Context for form configuration
 */
const FormConfigContext = createContext(null);

/**
 * Provider component that wraps the form and provides configuration to all children
 */
export function FormConfigProvider({ config, children }) {
  // Merge provided config with defaults to ensure all fields are present
  const mergedConfig = useMemo(() => {
    return mergeWithDefaults(config);
  }, [config]);

  const value = useMemo(
    () => ({
      config: mergedConfig,
      sectionDefinitions: SECTION_DEFINITIONS,
    }),
    [mergedConfig],
  );

  return (
    <FormConfigContext.Provider value={value}>
      {children}
    </FormConfigContext.Provider>
  );
}

/**
 * Hook to access the full form configuration
 * @returns {Object} The merged form configuration
 */
export function useFormConfig() {
  const context = useContext(FormConfigContext);

  if (!context) {
    // Return defaults if used outside provider (for backwards compatibility)
    return {
      config: DEFAULT_FORM_CONFIGURATION,
      sectionDefinitions: SECTION_DEFINITIONS,
    };
  }

  return context;
}

/**
 * Hook to get configuration for a specific section
 * @param {string} sectionId - The section identifier
 * @returns {Object} Section configuration with computed properties
 */
export function useSectionConfig(sectionId) {
  const { config } = useFormConfig();
  const sectionDef = SECTION_DEFINITIONS[sectionId];
  const sectionConfig = config?.sections?.[sectionId];

  return useMemo(() => {
    if (!sectionDef) {
      return null;
    }

    return {
      id: sectionId,
      enabled: sectionConfig?.enabled ?? true,
      order: sectionConfig?.order ?? sectionDef.defaultOrder,
      label: getSectionLabel(sectionId, config),
      color: sectionDef.color,
      dataKey: sectionDef.dataKey,
      isServiceSection: sectionDef.isServiceSection || false,
      fields: sectionConfig?.fields || {},
    };
  }, [sectionId, sectionDef, sectionConfig, config]);
}

/**
 * Hook to get configuration for a specific field
 * @param {string} sectionId - The section identifier
 * @param {string} fieldId - The field identifier
 * @returns {Object} Field configuration with computed properties
 */
export function useFieldConfig(sectionId, fieldId) {
  const { config } = useFormConfig();
  const sectionDef = SECTION_DEFINITIONS[sectionId];
  const fieldDef = sectionDef?.fields?.[fieldId];
  const fieldConfig = config?.sections?.[sectionId]?.fields?.[fieldId];

  return useMemo(() => {
    if (!fieldDef) {
      return null;
    }

    return {
      id: fieldId,
      type: fieldDef.type,
      visibility: fieldConfig?.visibility ?? fieldDef.defaultVisibility,
      label: getFieldLabel(sectionId, fieldId, config),
      options: getFieldOptions(sectionId, fieldId, config),
      placeholder: fieldDef.placeholder,
      condition: fieldConfig?.condition || fieldDef.condition,
      min: fieldDef.min,
      max: fieldDef.max,
      // Computed properties
      isRequired: isFieldRequired(sectionId, fieldId, config),
    };
  }, [sectionId, fieldId, fieldDef, fieldConfig, config]);
}

/**
 * Hook to check if a field should be visible based on current form data
 * @param {string} sectionId - The section identifier
 * @param {string} fieldId - The field identifier
 * @param {Object} formData - The current form data
 * @returns {boolean} Whether the field should be visible
 */
export function useFieldVisibility(sectionId, fieldId, formData) {
  const { config } = useFormConfig();

  return useMemo(() => {
    return isFieldVisible(sectionId, fieldId, config, formData);
  }, [sectionId, fieldId, config, formData]);
}

/**
 * Hook to get ordered list of enabled sections
 * @returns {Array<string>} Array of section IDs in order
 */
export function useOrderedSections() {
  const { config } = useFormConfig();

  return useMemo(() => {
    return getOrderedSections(config);
  }, [config]);
}

/**
 * Hook to get all visible fields for a section based on current form data
 * @param {string} sectionId - The section identifier
 * @param {Object} formData - The current form data
 * @returns {Array<string>} Array of visible field IDs
 */
export function useVisibleFields(sectionId, formData) {
  const { config } = useFormConfig();
  const sectionDef = SECTION_DEFINITIONS[sectionId];

  return useMemo(() => {
    if (!sectionDef) {
      return [];
    }

    return Object.keys(sectionDef.fields).filter((fieldId) => {
      return isFieldVisible(sectionId, fieldId, config, formData);
    });
  }, [sectionId, sectionDef, config, formData]);
}

export { SECTION_DEFINITIONS };
