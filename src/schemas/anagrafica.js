import { z } from "zod";
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
 * Anagrafica validation schemas
 * These schemas whitelist allowed fields to prevent injection attacks
 */

// Helper to create an enum from options array
const createEnumSchema = (options) => z.enum(options).optional().nullable();

// Personal information schema
const personalInfoSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    dateOfBirth: z.string().optional().nullable(),
    placeOfBirth: z.string().max(200).optional().nullable(),
    nationality: z.string().max(100).optional().nullable(),
    gender: createEnumSchema(GENDER_OPTIONS),
    fiscalCode: z.string().max(20).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal("")),
  })
  .partial();

// Status information schema
const statusInfoSchema = z
  .object({
    familyRole: createEnumSchema(FAMILY_ROLES_OPTIONS),
    legalStatus: createEnumSchema(LEGAL_STATUS_OPTIONS),
    housingStatus: createEnumSchema(HOUSING_STATUS_OPTIONS),
    jobStatus: createEnumSchema(JOB_STATUS_OPTIONS),
    educationLevel: createEnumSchema(EDUCATION_LEVEL_OPTIONS),
    educationLevelIT: createEnumSchema(EDUCATION_LEVEL_IT_OPTIONS),
    italianLevel: createEnumSchema(ITALIAN_LEVEL_OPTIONS),
    referralSource: createEnumSchema(REFERRAL_OPTIONS),
  })
  .partial();

// Vulnerability schema (array of selected options)
const vulnerabilitySchema = z
  .object({
    vulnerabilities: z
      .array(z.enum(VULNERABILITY_OPTIONS))
      .optional()
      .default([]),
    vulnerabilityNotes: z.string().max(2000).optional().nullable(),
  })
  .partial();

// Notes and additional info
const notesSchema = z
  .object({
    notes: z.string().max(10000).optional().nullable(),
    internalNotes: z.string().max(5000).optional().nullable(),
  })
  .partial();

// Access control (which structures can access this record)
const accessControlSchema = z
  .object({
    canBeAccessedBy: z.array(z.string().max(100)).max(50).optional(),
  })
  .partial();

// Address schema
const addressSchema = z
  .object({
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(10).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
  })
  .partial();

/**
 * Schema for updating an anagrafica record
 * Only whitelisted fields are allowed
 */
export const updateAnagraficaSchema = z
  .object({
    // Personal info
    ...personalInfoSchema.shape,
    // Status info
    ...statusInfoSchema.shape,
    // Vulnerability
    ...vulnerabilitySchema.shape,
    // Notes
    ...notesSchema.shape,
    // Access control
    ...accessControlSchema.shape,
    // Address
    ...addressSchema.shape,
  })
  .strict(); // strict() rejects unknown fields

/**
 * Schema for creating a new anagrafica record
 */
export const createAnagraficaSchema = z.object({
  // Required fields for creation
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  // Structure access is required for new records
  canBeAccessedBy: z
    .array(z.string().max(100))
    .min(1, "At least one structure must be specified"),
  // Optional fields
  ...personalInfoSchema.omit({ firstName: true, lastName: true }).shape,
  ...statusInfoSchema.shape,
  ...vulnerabilitySchema.shape,
  ...notesSchema.shape,
  ...addressSchema.shape,
});

/**
 * Schema for anagrafica search/filter parameters
 */
export const anagraficaQuerySchema = z.object({
  search: z.string().max(200).optional(),
  structureId: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z
    .enum(["firstName", "lastName", "createdAt", "updatedAt"])
    .optional()
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Validate and sanitize anagrafica update data
 * @param {Object} data - Raw request data
 * @returns {{ success: boolean, data?: Object, errors?: Array }}
 */
export function validateAnagraficaUpdate(data) {
  const result = updateAnagraficaSchema.safeParse(data);

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
 * Validate and sanitize anagrafica creation data
 * @param {Object} data - Raw request data
 * @returns {{ success: boolean, data?: Object, errors?: Array }}
 */
export function validateAnagraficaCreate(data) {
  const result = createAnagraficaSchema.safeParse(data);

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
