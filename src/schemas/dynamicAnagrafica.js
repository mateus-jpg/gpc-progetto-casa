import { z } from "zod";
import {
  getFieldOptions,
  isFieldRequired,
  isFieldVisible,
  mergeWithDefaults,
  SECTION_DEFINITIONS,
} from "@/data/formConfigDefaults";

/**
 * Dynamic Anagrafica Validation Schema Builder
 * Generates Zod validation schemas based on form configuration
 */

/**
 * Build a Zod schema for a single field based on its type and configuration
 */
function buildFieldSchema(sectionId, fieldId, fieldDef, config, formData) {
  const isVisible = isFieldVisible(sectionId, fieldId, config, formData);
  const isRequired = isFieldRequired(sectionId, fieldId, config);
  const options = getFieldOptions(sectionId, fieldId, config);

  // If field is not visible, make it optional and nullable
  if (!isVisible) {
    return z.any().optional().nullable();
  }

  let schema;

  switch (fieldDef.type) {
    case "text":
      schema = z.string().max(500);
      break;

    case "email":
      schema = z.string().email("Email non valida").or(z.literal(""));
      break;

    case "tel":
      schema = z.string().max(30);
      break;

    case "number":
      schema = z.number().int();
      if (fieldDef.min !== undefined) schema = schema.min(fieldDef.min);
      if (fieldDef.max !== undefined) schema = schema.max(fieldDef.max);
      break;

    case "date":
      // Accept Date objects, strings, or undefined/null
      schema = z.union([z.date(), z.string().min(1), z.null(), z.undefined()]);
      break;

    case "select":
    case "radio":
      // For select/radio, validate against the configured options
      if (options && options.length > 0) {
        schema = z.string().refine((val) => !val || options.includes(val), {
          message: `Valore non valido. Opzioni: ${options.join(", ")}`,
        });
      } else {
        schema = z.string();
      }
      break;

    case "multiSelect":
      // For multiSelect, validate each item against the configured options
      if (options && options.length > 0) {
        schema = z
          .array(z.string())
          .refine((arr) => !arr || arr.every((val) => options.includes(val)), {
            message: "Uno o più valori non sono validi",
          });
      } else {
        schema = z.array(z.string());
      }
      break;

    case "countrySelect":
    case "multiCountrySelect":
      // Country selects - just validate as string/array
      schema =
        fieldDef.type === "multiCountrySelect"
          ? z.array(z.string())
          : z.string();
      break;

    default:
      schema = z.any();
  }

  // Apply required/optional based on configuration
  if (isRequired) {
    // For required fields, ensure they have a value
    if (
      fieldDef.type === "multiSelect" ||
      fieldDef.type === "multiCountrySelect"
    ) {
      schema = schema.min(1, "Seleziona almeno un valore");
    } else if (fieldDef.type === "number") {
      // Numbers don't need min(1) validation on the value, just ensure not undefined
    } else if (fieldDef.type !== "date") {
      schema = schema.min(1, "Campo obbligatorio");
    }
  } else {
    // Optional fields
    schema = schema.optional().nullable().or(z.literal(""));
    if (
      fieldDef.type === "multiSelect" ||
      fieldDef.type === "multiCountrySelect"
    ) {
      schema = z.array(z.string()).optional().default([]);
    }
  }

  return schema;
}

/**
 * Build a Zod schema for a section based on configuration
 */
function buildSectionSchema(sectionId, sectionDef, config, formData) {
  const sectionConfig = config?.sections?.[sectionId];

  // If section is disabled, return a passthrough schema
  if (!sectionConfig?.enabled) {
    return z.object({}).passthrough().optional();
  }

  const fieldSchemas = {};

  for (const [fieldId, fieldDef] of Object.entries(sectionDef.fields)) {
    fieldSchemas[fieldId] = buildFieldSchema(
      sectionId,
      fieldId,
      fieldDef,
      config,
      formData,
    );
  }

  return z.object(fieldSchemas).passthrough();
}

/**
 * Build a complete Zod schema for the entire form based on configuration
 * @param {Object} config - The form configuration (merged with defaults)
 * @param {Object} formData - The current form data (for conditional field visibility)
 * @returns {z.ZodSchema} A Zod schema for validating the form
 */
export function buildDynamicAnagraficaSchema(config, formData = {}) {
  const mergedConfig = mergeWithDefaults(config);
  const sectionSchemas = {};

  // Build schema for each section
  for (const [sectionId, sectionDef] of Object.entries(SECTION_DEFINITIONS)) {
    // Skip the accessServices section as it has special handling
    if (sectionDef.isServiceSection) {
      continue;
    }

    const dataKey = sectionDef.dataKey;
    sectionSchemas[dataKey] = buildSectionSchema(
      sectionId,
      sectionDef,
      mergedConfig,
      formData,
    );
  }

  // Add canBeAccessedBy field
  sectionSchemas.canBeAccessedBy = z
    .array(z.string())
    .min(1, "La struttura è obbligatoria");
  sectionSchemas.registeredByStructure = z.string().optional();

  return z.object(sectionSchemas).passthrough();
}

/**
 * Validate form data against the dynamic schema
 * @param {Object} data - The form data to validate
 * @param {Object} config - The form configuration
 * @returns {{ success: boolean, data?: Object, errors?: Array }}
 */
export function validateDynamicAnagrafica(data, config) {
  const schema = buildDynamicAnagraficaSchema(config, data);
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Get required fields for a given configuration
 * Useful for displaying which fields are required in the UI
 * @param {Object} config - The form configuration
 * @returns {Object} Map of sectionId -> array of required field IDs
 */
export function getRequiredFields(config) {
  const mergedConfig = mergeWithDefaults(config);
  const requiredFields = {};

  for (const [sectionId, sectionDef] of Object.entries(SECTION_DEFINITIONS)) {
    const sectionConfig = mergedConfig?.sections?.[sectionId];

    if (!sectionConfig?.enabled || sectionDef.isServiceSection) {
      continue;
    }

    requiredFields[sectionId] = [];

    for (const fieldId of Object.keys(sectionDef.fields)) {
      if (isFieldRequired(sectionId, fieldId, mergedConfig)) {
        requiredFields[sectionId].push(fieldId);
      }
    }
  }

  return requiredFields;
}

/**
 * Get visible fields for a given configuration and form data
 * @param {Object} config - The form configuration
 * @param {Object} formData - The current form data
 * @returns {Object} Map of sectionId -> array of visible field IDs
 */
export function getVisibleFields(config, formData = {}) {
  const mergedConfig = mergeWithDefaults(config);
  const visibleFields = {};

  for (const [sectionId, sectionDef] of Object.entries(SECTION_DEFINITIONS)) {
    const sectionConfig = mergedConfig?.sections?.[sectionId];

    if (!sectionConfig?.enabled || sectionDef.isServiceSection) {
      continue;
    }

    visibleFields[sectionId] = [];

    for (const fieldId of Object.keys(sectionDef.fields)) {
      if (isFieldVisible(sectionId, fieldId, mergedConfig, formData)) {
        visibleFields[sectionId].push(fieldId);
      }
    }
  }

  return visibleFields;
}

export default {
  buildDynamicAnagraficaSchema,
  validateDynamicAnagrafica,
  getRequiredFields,
  getVisibleFields,
};
