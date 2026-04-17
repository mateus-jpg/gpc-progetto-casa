import { z } from "zod";
import { safeStringSchema } from "./common";

/**
 * Project validation schemas for admin operations
 */

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .max(200)
    .min(1, "Project name is required")
    .transform((str) => str?.trim()),
  description: safeStringSchema(1000).optional(),
});

/**
 * Schema for updating a project
 */
export const updateProjectSchema = z
  .object({
    name: safeStringSchema(200).optional(),
    description: safeStringSchema(1000).optional(),
  })
  .strict();

/**
 * Schema for adding/removing user from project
 */
export const userProjectSchema = z.object({
  projectId: z.string().min(1).max(100),
});

/**
 * Validate create project request
 */
export function validateCreateProject(data) {
  const result = createProjectSchema.safeParse(data);

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
 * Validate update project request
 */
export function validateUpdateProject(data) {
  const result = updateProjectSchema.safeParse(data);

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
