import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  safeStringSchema,
  uidSchema,
} from "./common";

/**
 * User validation schemas for admin operations
 */

// Role options
const roleSchema = z.enum([
  "user",
  "structure_admin",
  "project_admin",
  "admin",
]);

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
  displayName: safeStringSchema(100).optional(),
  phone: phoneSchema,
  role: roleSchema.optional().default("user"),
  projectIds: z.array(z.string().max(100)).max(50).optional().default([]),
  structureIds: z.array(z.string().max(100)).max(50).optional().default([]),
});

/**
 * Schema for updating a user
 */
export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    displayName: safeStringSchema(100).optional(),
    phone: phoneSchema,
    role: roleSchema.optional(),
  })
  .strict();

/**
 * Schema for adding/removing user from structure
 */
export const userStructureSchema = z.object({
  structureId: z.string().min(1).max(100),
});

/**
 * Schema for profile update (self-service)
 */
export const profileUpdateSchema = z
  .object({
    displayName: safeStringSchema(100).optional(),
    phone: phoneSchema,
    email: emailSchema.optional(),
  })
  .strict();

/**
 * Validate create user request
 */
export function validateCreateUser(data) {
  const result = createUserSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate update user request
 */
export function validateUpdateUser(data) {
  const result = updateUserSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate profile update request
 */
export function validateProfileUpdate(data) {
  const result = profileUpdateSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }

  return { success: true, data: result.data };
}
