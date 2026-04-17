/**
 * Centralized logging utility for the GPC application
 * Provides structured logging with different severity levels
 * Can be easily extended to integrate with external monitoring services
 */

const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Formats log message with timestamp and context
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (Object.keys(context).length > 0) {
    return `${prefix} ${message} | Context: ${JSON.stringify(context)}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Logger utility with different log levels
 */
export const logger = {
  /**
   * Debug level logging - only in development
   * @param {string} message - Log message
   * @param {Object} context - Additional context data
   */
  debug(message, context = {}) {
    if (!IS_PRODUCTION) {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, context));
    }
  },

  /**
   * Info level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context data
   */
  info(message, context = {}) {
    console.log(formatLog(LOG_LEVELS.INFO, message, context));
  },

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context data
   */
  warn(message, context = {}) {
    console.warn(formatLog(LOG_LEVELS.WARN, message, context));
  },

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context data
   */
  error(message, error = null, context = {}) {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;

    const fullContext = {
      ...context,
      ...(errorDetails && { error: errorDetails }),
    };

    console.error(formatLog(LOG_LEVELS.ERROR, message, fullContext));
  },
};

/**
 * Creates a scoped logger with predefined context
 * @param {string} scope - Scope name (e.g., 'AuthService', 'AnagraficaActions')
 * @returns {Object} Logger instance with scope context
 */
export function createScopedLogger(scope) {
  return {
    debug: (message, context = {}) =>
      logger.debug(message, { scope, ...context }),
    info: (message, context = {}) =>
      logger.info(message, { scope, ...context }),
    warn: (message, context = {}) =>
      logger.warn(message, { scope, ...context }),
    error: (message, error = null, context = {}) =>
      logger.error(message, error, { scope, ...context }),
  };
}
