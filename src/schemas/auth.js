import { z } from "zod";
import { emailSchema, idTokenSchema } from "./common";

/**
 * Authentication validation schemas
 */

/**
 * Schema for session login request
 */
export const sessionLoginSchema = z.object({
  idToken: idTokenSchema,
});

/**
 * Schema for password reset request
 */
export const passwordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Schema for email verification request
 */
export const emailVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Validate session login request
 */
export function validateSessionLogin(data) {
  const result = sessionLoginSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error:
        "Invalid request: " +
        result.error.errors.map((e) => e.message).join(", "),
    };
  }

  return { success: true, data: result.data };
}
