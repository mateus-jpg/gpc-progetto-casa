"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  getMonthlyStatistics,
  getStatistics,
  getStatisticsForStructures,
  getStructureStatusFlowAnalytics,
  getStructureUpcomingItems,
  getTrendStatistics,
} from "@/actions/statistics";
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
 * Stable fetcher for trend statistics
 */
async function trendStatsFetcher([, structureId, period, limit]) {
  const result = await getTrendStatistics(structureId, period, limit);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch trend statistics");
  }
  return parsed.data;
}

/**
 * Stable fetcher for several structure statistics documents
 */
async function structuresStatisticsFetcher([, structureIdsKey]) {
  const structureIds = structureIdsKey ? structureIdsKey.split("|") : [];
  const result = await getStatisticsForStructures(structureIds);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch structures statistics");
  }
  return parsed.data;
}

/**
 * Stable fetcher for upcoming operational items
 */
async function structureUpcomingFetcher([, structureId, daysAhead, limit]) {
  const result = await getStructureUpcomingItems(structureId, daysAhead, limit);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch upcoming items");
  }
  return parsed.data;
}

/**
 * Stable fetcher for status-flow analytics
 */
async function structureStatusFlowFetcher([, structureId]) {
  const result = await getStructureStatusFlowAnalytics(structureId);
  const parsed = JSON.parse(result);
  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to fetch status flow analytics");
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
 * Hook for fetching weekly, monthly, or yearly statistics for trends.
 *
 * @param {string} structureId - The structure document ID
 * @param {"weekly"|"monthly"|"yearly"} period - Trend granularity
 * @param {number} limit - Number of periods to fetch
 * @param {Object} options - Additional SWR options
 * @returns {Object} { trendStats, error, isLoading, isValidating, mutate }
 */
export function useTrendStatistics(
  structureId,
  period = "monthly",
  limit = 12,
  options = {},
) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureId ? ["statistics-trend", structureId, period, limit] : null,
    trendStatsFetcher,
    swrOptions,
  );

  return {
    trendStats: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching statistics for multiple structures.
 *
 * @param {string[]} structureIds - Structure document IDs
 * @param {Object} options - Additional SWR options
 * @returns {Object} { statsByStructure, error, isLoading, isValidating, mutate }
 */
export function useStructuresStatistics(structureIds = [], options = {}) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const structureIdsKey = useMemo(
    () => [...new Set(structureIds.filter(Boolean))].sort().join("|"),
    [structureIds],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureIdsKey ? ["statistics-structures", structureIdsKey] : null,
    structuresStatisticsFetcher,
    swrOptions,
  );

  return {
    statsByStructure: data || {},
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching upcoming reminders and expiring files for a structure.
 *
 * @param {string} structureId - Structure document ID
 * @param {number} daysAhead - Upcoming window in days
 * @param {number} limit - Max items per list
 * @param {Object} options - Additional SWR options
 * @returns {Object} { upcomingItems, error, isLoading, isValidating, mutate }
 */
export function useStructureUpcomingItems(
  structureId,
  daysAhead = 30,
  limit = 8,
  options = {},
) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureId
      ? ["structure-upcoming-items", structureId, daysAhead, limit]
      : null,
    structureUpcomingFetcher,
    swrOptions,
  );

  return {
    upcomingItems: data || {
      daysAhead,
      reminders: [],
      expiringFiles: [],
    },
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching status-flow analytics for a structure.
 *
 * @param {string} structureId - Structure document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { statusFlow, error, isLoading, isValidating, mutate }
 */
export function useStructureStatusFlowAnalytics(structureId, options = {}) {
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_STATS_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    structureId ? ["structure-status-flow", structureId] : null,
    structureStatusFlowFetcher,
    swrOptions,
  );

  return {
    statusFlow: data || {
      blockedThresholdDays: 30,
      monthStart: null,
      updatedAt: null,
      fields: [],
    },
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
