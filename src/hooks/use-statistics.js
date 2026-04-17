"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getMonthlyStatistics, getStatistics } from "@/actions/statistics";
import { SWR_CACHE_TIME } from "@/lib/swr-config";

/**
 * Stable fetcher for statistics data
 */
async function statisticsFetcher([, structureId]) {
  const result = await getStatistics(structureId);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch statistics");
  }
  return parsed.data;
}

/**
 * Stable fetcher for monthly statistics
 */
async function monthlyStatsFetcher([, structureId, months]) {
  const result = await getMonthlyStatistics(structureId, months);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch monthly statistics");
  }
  return parsed.data;
}

/**
 * Default SWR options for statistics
 */
const DEFAULT_STATS_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: SWR_CACHE_TIME.MEDIUM,
  keepPreviousData: true,
};

/**
 * Hook for fetching structure statistics
 * Uses server action with SWR for client-side caching
 *
 * @param {string} structureId - The structure document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { stats, error, isLoading, isValidating, mutate }
 */
export function useStatistics(structureId, options = {}) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureId ? ["statistics", structureId] : null,
    statisticsFetcher,
    swrOptions,
  );

  return {
    stats: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching monthly statistics for trends
 *
 * @param {string} structureId - The structure document ID
 * @param {number} months - Number of months to fetch
 * @param {Object} options - Additional SWR options
 * @returns {Object} { monthlyStats, error, isLoading, isValidating, mutate }
 */
export function useMonthlyStatistics(structureId, months = 6, options = {}) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureId ? ["statistics-monthly", structureId, months] : null,
    monthlyStatsFetcher,
    swrOptions,
  );

  return {
    monthlyStats: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Helper function to transform stats object to sorted array for charts
 * @param {Object} statsObj - Object with key:count pairs
 * @param {number} limit - Max items to return (default: 10)
 * @returns {Array} Sorted array of {name, value} objects
 */
export function statsToChartData(statsObj, limit = 10) {
  if (!statsObj || typeof statsObj !== "object") return [];

  return Object.entries(statsObj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Helper to calculate percentage distribution
 * @param {Object} statsObj - Object with key:count pairs
 * @returns {Array} Array with percentage values added
 */
export function statsToPercentages(statsObj) {
  if (!statsObj || typeof statsObj !== "object") return [];

  const total = Object.values(statsObj).reduce((sum, val) => sum + val, 0);
  if (total === 0) return [];

  return Object.entries(statsObj)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}
