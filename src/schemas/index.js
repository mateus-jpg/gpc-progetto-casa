/**
 * Schema exports
 * Centralized validation schemas for API inputs
 */

// Anagrafica schemas
export {
  anagraficaQuerySchema,
  createAnagraficaSchema,
  updateAnagraficaSchema,
  validateAnagraficaCreate,
  validateAnagraficaUpdate,
} from "./anagrafica";
// Auth schemas
export {
  emailVerificationSchema,
  passwordResetSchema,
  sessionLoginSchema,
  validateSessionLogin,
} from "./auth";
// Common utilities
export {
  dateStringSchema,
  emailSchema,
  idTokenSchema,
  optionalSafeString,
  PROTECTED_FIELDS,
  phoneSchema,
  removeProtectedFields,
  safeStringSchema,
  stringArraySchema,
  uidSchema,
  validateRequest,
} from "./common";

// User schemas
export {
  createUserSchema,
  profileUpdateSchema,
  updateUserSchema,
  userStructureSchema,
  validateCreateUser,
  validateProfileUpdate,
  validateUpdateUser,
} from "./user";
