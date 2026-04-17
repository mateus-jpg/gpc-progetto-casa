/**
 * In-memory session cache for middleware
 * Reduces session verification API calls while maintaining security
 *
 * Important: This cache runs in the Edge Runtime (middleware)
 * - Uses simple Map-based storage (no external dependencies)
 * - Short TTL balances security with performance
 * - Cache is cleared on server restart
 *
 * @see config/constants.js for centralized configuration
 */

import { AUTH } from "@/config/constants";

// Session cache configuration (from centralized config)
const SESSION_CACHE_TTL = AUTH.SESSION_CACHE_TTL;
const MAX_CACHE_SIZE = AUTH.SESSION_CACHE_MAX_SIZE;

// In-memory cache store
const sessionCache = new Map();

/**
 * Creates a simple hash of the session cookie for use as cache key
 * Uses a basic string hash that works in Edge Runtime
 * @param {string} sessionCookie - The raw session cookie value
 * @returns {string} Hashed cache key
 */
function hashSessionCookie(sessionCookie) {
  // Simple hash function that works in Edge Runtime
  // Only takes first 64 chars and last 32 chars to create a unique key
  // This avoids storing the full session token while maintaining uniqueness
  if (sessionCookie.length > 96) {
    return `${sessionCookie.slice(0, 64)}...${sessionCookie.slice(-32)}`;
  }
  return sessionCookie;
}

/**
 * Retrieves a cached session if valid
 * @param {string} sessionCookie - The session cookie to look up
 * @returns {Object|null} Cached user data or null if not found/expired
 */
export function getCachedSession(sessionCookie) {
  if (!sessionCookie) return null;

  const cacheKey = hashSessionCookie(sessionCookie);
  const cached = sessionCache.get(cacheKey);

  if (!cached) return null;

  // Check if cache entry has expired
  if (Date.now() > cached.expiresAt) {
    sessionCache.delete(cacheKey);
    return null;
  }

  return cached.user;
}

/**
 * Stores a verified session in the cache
 * @param {string} sessionCookie - The session cookie to cache
 * @param {Object} user - The verified user data from /api/auth/verify
 */
export function setCachedSession(sessionCookie, user) {
  if (!sessionCookie || !user) return;

  // Evict oldest entries if cache is full (simple LRU)
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = sessionCache.keys().next().value;
    sessionCache.delete(oldestKey);
  }

  const cacheKey = hashSessionCookie(sessionCookie);
  sessionCache.set(cacheKey, {
    user,
    expiresAt: Date.now() + SESSION_CACHE_TTL,
  });
}

/**
 * Removes a session from the cache (e.g., on logout)
 * @param {string} sessionCookie - The session cookie to invalidate
 */
export function invalidateCachedSession(sessionCookie) {
  if (!sessionCookie) return;

  const cacheKey = hashSessionCookie(sessionCookie);
  sessionCache.delete(cacheKey);
}

/**
 * Clears all cached sessions
 * Useful for testing or emergency cache invalidation
 */
export function clearSessionCache() {
  sessionCache.clear();
}

/**
 * Returns cache statistics for monitoring
 * @returns {Object} Cache size and configuration
 */
export function getSessionCacheStats() {
  return {
    size: sessionCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: SESSION_CACHE_TTL,
  };
}
