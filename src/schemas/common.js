import { z } from "zod";

/**
 * Common validation patterns and utilities
 */

// Firebase UID pattern (28 characters, alphanumeric)
export const uidSchema = z.string().min(1).max(128);

// Email schema
export const emailSchema = z.string().email("Invalid email address");

// Phone schema (optional, flexible format)
export const phoneSchema = z.string().max(20).optional().nullable();

// Safe string (no HTML, limited length)
export const safeStringSchema = (maxLength = 500) =>
  z
    .string()
    .max(maxLength)
    .transform((str) => str?.trim());

// Optional safe string
export const optionalSafeString = (maxLength = 500) =>
  z
    .string()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((str) => str?.trim() || null);

// Date string (ISO format or empty)
export const dateStringSchema = z
  .string()
  .refine(
    (val) => !val || !Number.isNaN(Date.parse(val)),
    "Invalid date format",
  )
  .optional()
  .nullable();

// Array of strings with max length
export const stringArraySchema = (maxItems = 50, maxStringLength = 200) =>
  z.array(z.string().max(maxStringLength)).max(maxItems).optional().default([]);

// Firebase ID token (JWT format)
export const idTokenSchema = z
  .string()
  .min(100, "Invalid token")
  .max(5000, "Token too long");

/**
 * Utility to create a validation result
 */
export function validateRequest(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return {
      success: false,
      errors,
      message: errors.map((e) => `${e.field}: ${e.message}`).join(", "),
    };
  }

  return { success: true, data: result.data };
}

/**
 * List of fields that should NEVER be updated via API
 * These are system-managed fields
 */
export const PROTECTED_FIELDS = [
  "createdAt",
  "createdBy",
  "deletedAt",
  "deletedBy",
  "deleted",
  "uid",
  "id",
];

/**
 * Remove protected fields from an object
 */
export function removeProtectedFields(obj) {
  const cleaned = { ...obj };
  for (const field of PROTECTED_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}
