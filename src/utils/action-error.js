/**
 * Standardized error handling for server actions
 * Provides consistent error response format and logging
 */

import { logger } from "./logger";

/**
 * Error codes for server actions
 */
export const ActionErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  ALREADY_DELETED: "ALREADY_DELETED",
  DATABASE_ERROR: "DATABASE_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

/**
 * Custom error class for server actions with error codes
 */
export class ActionError extends Error {
  constructor(message, code = ActionErrorCode.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = "ActionError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * HTTP status codes for error codes
 */
const errorCodeToStatus = {
  [ActionErrorCode.NOT_FOUND]: 404,
  [ActionErrorCode.UNAUTHORIZED]: 401,
  [ActionErrorCode.FORBIDDEN]: 403,
  [ActionErrorCode.VALIDATION_ERROR]: 400,
  [ActionErrorCode.ALREADY_EXISTS]: 409,
  [ActionErrorCode.ALREADY_DELETED]: 410,
  [ActionErrorCode.DATABASE_ERROR]: 500,
  [ActionErrorCode.STORAGE_ERROR]: 500,
  [ActionErrorCode.RATE_LIMITED]: 429,
  [ActionErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Get HTTP status code for an error
 */
export function getStatusForError(error) {
  if (error instanceof ActionError) {
    return errorCodeToStatus[error.code] || 500;
  }
  return 500;
}

/**
 * Wraps a server action with standardized error handling
 * Returns { success: true, data } on success
 * Returns { success: false, error } on failure
 *
 * @param {Function} actionFn - The async action function to wrap
 * @param {string} actionName - Name for logging purposes
 * @returns {Function} Wrapped action function
 */
export function withErrorHandling(actionFn, actionName = "action") {
  return async (...args) => {
    try {
      const result = await actionFn(...args);
      return { success: true, data: result };
    } catch (error) {
      // Log the error
      logger.error(`[${actionName.toUpperCase()}]`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Return standardized error response
      if (error instanceof ActionError) {
        return {
          success: false,
          error: error.toJSON(),
        };
      }

      // Handle known Firebase errors
      if (error.code?.startsWith("auth/")) {
        return {
          success: false,
          error: {
            error: true,
            code: ActionErrorCode.UNAUTHORIZED,
            message: getFirebaseAuthMessage(error.code),
          },
        };
      }

      // Generic error
      return {
        success: false,
        error: {
          error: true,
          code: ActionErrorCode.INTERNAL_ERROR,
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "An unexpected error occurred",
        },
      };
    }
  };
}

/**
 * Helper to create common errors
 */
export const createError = {
  notFound: (resource = "Resource") =>
    new ActionError(`${resource} not found`, ActionErrorCode.NOT_FOUND),

  unauthorized: (message = "Authentication required") =>
    new ActionError(message, ActionErrorCode.UNAUTHORIZED),

  forbidden: (message = "Access denied") =>
    new ActionError(message, ActionErrorCode.FORBIDDEN),

  validation: (message, details = null) =>
    new ActionError(message, ActionErrorCode.VALIDATION_ERROR, details),

  alreadyExists: (resource = "Resource") =>
    new ActionError(
      `${resource} already exists`,
      ActionErrorCode.ALREADY_EXISTS,
    ),

  alreadyDeleted: (resource = "Resource") =>
    new ActionError(
      `${resource} already deleted`,
      ActionErrorCode.ALREADY_DELETED,
    ),

  database: (message = "Database operation failed") =>
    new ActionError(message, ActionErrorCode.DATABASE_ERROR),

  storage: (message = "File storage operation failed") =>
    new ActionError(message, ActionErrorCode.STORAGE_ERROR),

  rateLimited: (message = "Too many requests") =>
    new ActionError(message, ActionErrorCode.RATE_LIMITED),

  internal: (message = "Internal server error") =>
    new ActionError(message, ActionErrorCode.INTERNAL_ERROR),
};

/**
 * Get user-friendly message for Firebase auth errors
 */
function getFirebaseAuthMessage(code) {
  const messages = {
    "auth/invalid-credential": "Invalid credentials",
    "auth/user-disabled": "Account has been disabled",
    "auth/user-not-found": "User not found",
    "auth/wrong-password": "Invalid password",
    "auth/email-already-in-use": "Email already in use",
    "auth/weak-password": "Password is too weak",
    "auth/invalid-email": "Invalid email address",
    "auth/id-token-expired": "Session expired, please log in again",
    "auth/session-cookie-expired": "Session expired, please log in again",
  };
  return messages[code] || "Authentication error";
}

/**
 * Assert condition or throw ActionError
 */
export function assertCondition(condition, error) {
  if (!condition) {
    throw error;
  }
}

/**
 * Assert that a value exists or throw not found error
 */
export function assertExists(value, resource = "Resource") {
  if (!value) {
    throw createError.notFound(resource);
  }
  return value;
}
