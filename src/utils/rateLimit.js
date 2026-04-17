/**
 * Simple in-memory rate limiter for API endpoints
 *
 * For production with multiple server instances, consider using:
 * - Redis-based rate limiting
 * - Vercel's Edge Config
 * - Upstash Rate Limit
 *
 * This implementation is suitable for single-instance deployments
 */

// Store request counts per IP/key
const requestCounts = new Map();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Auto-cleanup old entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > data.windowMs * 2) {
      requestCounts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limit configuration options
 * @typedef {Object} RateLimitOptions
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} maxRequests - Maximum requests per window
 * @property {string} [message] - Custom error message
 */

/**
 * Check if a request should be rate limited
 *
 * @param {string} key - Unique identifier (usually IP address)
 * @param {RateLimitOptions} options - Rate limit configuration
 * @returns {{ limited: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(key, options) {
  const { windowMs = 15 * 60 * 1000, maxRequests = 100 } = options;
  const now = Date.now();

  let data = requestCounts.get(key);

  // Initialize or reset window if expired
  if (!data || now - data.windowStart > windowMs) {
    data = {
      count: 0,
      windowStart: now,
      windowMs,
    };
  }

  // Increment count
  data.count++;
  requestCounts.set(key, data);

  const remaining = Math.max(0, maxRequests - data.count);
  const resetIn = Math.ceil((data.windowStart + windowMs - now) / 1000);

  return {
    limited: data.count > maxRequests,
    remaining,
    resetIn,
    total: maxRequests,
  };
}

/**
 * Get client IP from request
 * Handles various proxy headers
 *
 * @param {Request} request - The incoming request
 * @returns {string} - Client IP address
 */
export function getClientIP(request) {
  // Check various headers set by proxies/load balancers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback for local development
  return "127.0.0.1";
}

/**
 * Rate limiter middleware for Next.js API routes
 *
 * @param {RateLimitOptions} options - Rate limit configuration
 * @returns {function} - Middleware function
 *
 * @example
 * const limiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 });
 *
 * export async function POST(request) {
 *   const limitResult = limiter(request);
 *   if (limitResult) return limitResult; // Returns 429 response if limited
 *   // ... handle request
 * }
 */
export function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = "Too many requests, please try again later",
    keyGenerator = getClientIP,
  } = options;

  return (request) => {
    const key =
      typeof keyGenerator === "function" ? keyGenerator(request) : keyGenerator;

    const result = checkRateLimit(key, { windowMs, maxRequests });

    if (result.limited) {
      return new Response(
        JSON.stringify({
          error: message,
          retryAfter: result.resetIn,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.resetIn),
            "X-RateLimit-Limit": String(result.total),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetIn),
          },
        },
      );
    }

    // Not limited - return null to continue processing
    return null;
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Auth endpoints: 5 attempts per 15 minutes per IP
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
  }),

  // Login: 10 attempts per 15 minutes per IP
  login: rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: "Too many login attempts. Please try again later.",
  }),

  // Password reset: 3 attempts per hour per IP
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: "Too many password reset requests. Please try again in an hour.",
  }),

  // User creation: 10 per hour per IP
  userCreation: rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: "Too many user creation requests. Please try again later.",
  }),

  // General API: 100 requests per minute per IP
  api: rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: "Too many requests. Please slow down.",
  }),
};
