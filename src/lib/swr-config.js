/**
 * SWR configuration for client-side data caching
 * Provides global defaults for all useSWR hooks
 */

import { SWR as SWR_CONFIG } from "@/config/constants";

/**
 * Default SWR fetcher function
 * Handles standard API responses and throws on error
 */
export const fetcher = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Global SWR configuration options
 * Applied to all useSWR hooks unless overridden
 * @see config/constants.js for centralized configuration
 */
export const swrConfig = {
  fetcher,
  // Revalidation settings
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: SWR_CONFIG.DEDUPING_INTERVAL,

  // Cache settings
  refreshInterval: 0,

  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: SWR_CONFIG.ERROR_RETRY_COUNT,
  errorRetryInterval: SWR_CONFIG.ERROR_RETRY_INTERVAL,

  // Performance
  suspense: false,
  keepPreviousData: true,
};

/**
 * Cache time constants (in milliseconds)
 * @see config/constants.js for centralized configuration
 */
export const SWR_CACHE_TIME = SWR_CONFIG.CACHE_TIME;

/**
 * Clear all SWR cache entries
 * Call this on logout or when switching users to prevent stale data
 * @param {function} mutate - The global mutate function from useSWRConfig
 */
export const clearSwrCache = async (mutate) => {
  // Clear all cache entries by calling mutate with a matcher that matches everything
  // and setting data to undefined
  await mutate(
    () => true, // Match all keys
    undefined, // Set data to undefined
    { revalidate: false }, // Don't revalidate, just clear
  );
};

/**
 * Clear structure-specific SWR cache entries
 * Call this when switching structures to clear anagrafica and related data
 * @param {function} mutate - The global mutate function from useSWRConfig
 * @param {string} structureId - Optional structure ID to clear specific structure cache
 */
export const clearStructureCache = async (mutate) => {
  // Clear anagrafica and accessi cache entries
  await mutate(
    (key) => {
      if (!Array.isArray(key)) return false;
      const [type] = key;
      // Clear all anagrafica and accessi entries
      return (
        type === "anagrafica" || type === "accessi" || type === "statistics"
      );
    },
    undefined,
    { revalidate: false },
  );
};
