/**
 * Centralized configuration constants for GPC application
 * All timing, limits, and configuration values should be defined here
 */

// ============================================================================
// TIME CONSTANTS (in milliseconds unless noted)
// ============================================================================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
};

// ============================================================================
// AUTHENTICATION & SESSION
// ============================================================================

export const AUTH = {
  // Session cookie configuration
  SESSION_COOKIE_NAME: "session",
  SESSION_COOKIE_EXPIRY: 5 * TIME.DAY, // 5 days

  // Client-side auth cache (localStorage)
  CACHE_KEY: "gpc_auth_cache",
  CACHE_TTL: 5 * TIME.MINUTE, // 5 minutes

  // Session verification cache (middleware - Edge Runtime)
  SESSION_CACHE_TTL: 60 * TIME.SECOND, // 60 seconds
  SESSION_CACHE_MAX_SIZE: 1000, // Maximum cached sessions
};

// ============================================================================
// SERVER-SIDE CACHE (Next.js unstable_cache)
// ============================================================================

export const CACHE = {
  // Revalidation times in seconds (for Next.js cache)
  REVALIDATE: {
    USER_PROFILE: 300, // 5 minutes
    STRUCTURE: 600, // 10 minutes
    ANAGRAFICA_LIST: 60, // 1 minute
    ANAGRAFICA_DETAIL: 120, // 2 minutes
    ACCESSI: 60, // 1 minute
    FILES: 300, // 5 minutes
  },
};

// ============================================================================
// CLIENT-SIDE CACHE (SWR)
// ============================================================================

export const SWR = {
  DEDUPING_INTERVAL: 5000, // 5 seconds - dedupe identical requests
  ERROR_RETRY_COUNT: 3,
  ERROR_RETRY_INTERVAL: 5000, // 5 seconds between retries

  // Named cache durations
  CACHE_TIME: {
    SHORT: 30 * TIME.SECOND, // 30 seconds
    MEDIUM: 60 * TIME.SECOND, // 1 minute
    LONG: 5 * TIME.MINUTE, // 5 minutes
    VERY_LONG: 10 * TIME.MINUTE, // 10 minutes
  },
};

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMIT = {
  CLEANUP_INTERVAL: 5 * TIME.MINUTE, // Cleanup old entries every 5 minutes

  // Pre-configured limits
  AUTH: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 5,
    MESSAGE:
      "Too many authentication attempts. Please try again in 15 minutes.",
  },
  LOGIN: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 10,
    MESSAGE: "Too many login attempts. Please try again later.",
  },
  PASSWORD_RESET: {
    WINDOW_MS: TIME.HOUR,
    MAX_REQUESTS: 3,
    MESSAGE: "Too many password reset requests. Please try again in an hour.",
  },
  USER_CREATION: {
    WINDOW_MS: TIME.HOUR,
    MAX_REQUESTS: 10,
    MESSAGE: "Too many user creation requests. Please try again later.",
  },
  API: {
    WINDOW_MS: TIME.MINUTE,
    MAX_REQUESTS: 100,
    MESSAGE: "Too many requests. Please slow down.",
  },
};

// ============================================================================
// FILE UPLOAD
// ============================================================================

export const FILE = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_SIZE_MB: 10, // For display purposes

  // Allowed MIME types
  ALLOWED_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],

  // Signed URL expiration
  SIGNED_URL_EXPIRY: TIME.HOUR, // 1 hour
};

// File categories for organization
export const FILE_CATEGORIES = {
  DOCUMENT: "document", // General documents
  IDENTITY: "identity", // ID cards, passports
  LEGAL: "legal", // Legal documents
  MEDICAL: "medical", // Medical records
  EMPLOYMENT: "employment", // Work-related docs
  EDUCATION: "education", // Educational certificates
  HOUSING: "housing", // Housing documents
  FINANCIAL: "financial", // Financial documents
  OTHER: "other", // Uncategorized
};

// ============================================================================
// UI PREFERENCES
// ============================================================================

export const UI = {
  SIDEBAR: {
    COOKIE_NAME: "sidebar_state",
    COOKIE_MAX_AGE: (7 * TIME.DAY) / TIME.SECOND, // 7 days in seconds
    WIDTH: "16rem",
    WIDTH_ICON: "3rem",
    WIDTH_MOBILE: "18rem",
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 100,
  },

  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300, // 300ms for search inputs
    FORM_VALIDATION: 500, // 500ms for form validation
  },
};

// ============================================================================
// DATABASE COLLECTIONS
// ============================================================================

export const COLLECTIONS = {
  OPERATORS: "operators",
  USERS: "users",
  STRUCTURES: "structures",
  ANAGRAFICA: "anagrafica",
  ACCESSI: "accessi",
  FILES: "files",
  FOLDERS: "folders",
  REMINDERS: "reminders",
  AUDIT_LOGS: "audit_logs",
};

// ============================================================================
// USER ROLES
// ============================================================================

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  STRUCTURE_ADMIN: "structure_admin",
  OPERATOR: "operator",
};
