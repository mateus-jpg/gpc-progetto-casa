/**
 * Standardized server response utilities
 * Provides consistent response formats across all server actions
 */

import { logger } from "./logger";

/**
 * Creates a successful response object
 *
 * @param {*} data - The data to return
 * @returns {Object} Standardized success response
 */
export function successResponse(data = null) {
  return {
    success: true,
    data,
  };
}

/**
 * Creates an error response object
 *
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context for logging
 * @returns {Object} Standardized error response
 */
export function errorResponse(error, context = {}) {
  const errorMessage = error instanceof Error ? error.message : error;

  logger.error("Server action failed", error, context);

  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Wraps a server action with standard error handling and response formatting
 *
 * @param {Function} action - The async server action to wrap
 * @param {string} actionName - Name of the action for logging
 * @returns {Function} Wrapped action with error handling
 */
export function wrapServerAction(action, actionName) {
  return async (...args) => {
    try {
      const result = await action(...args);
      return successResponse(result);
    } catch (error) {
      return errorResponse(error, { action: actionName, args });
    }
  };
}
