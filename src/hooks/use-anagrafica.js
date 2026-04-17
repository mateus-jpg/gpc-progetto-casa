"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getAccessAction } from "@/actions/anagrafica/access";
import { getAnagrafica } from "@/actions/anagrafica/anagrafica";
import { SWR_CACHE_TIME } from "@/lib/swr-config";

/**
 * Stable fetcher for anagrafica data
 * Extracted to prevent new function reference on each render
 */
async function anagraficaFetcher([, id]) {
  const result = await getAnagrafica(id);
  return JSON.parse(result);
}

/**
 * Stable fetcher for accessi data
 * Extracted to prevent new function reference on each render
 */
async function accessiFetcher([, anagraficaId]) {
  return await getAccessAction(anagraficaId);
}

/**
 * Default SWR options for anagrafica hooks
 */
const DEFAULT_ANAGRAFICA_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: SWR_CACHE_TIME.MEDIUM,
  keepPreviousData: true,
};

const DEFAULT_ACCESSI_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: SWR_CACHE_TIME.SHORT,
  keepPreviousData: true,
};

/**
 * Hook for fetching a single anagrafica record
 * Uses server action with SWR for client-side caching
 *
 * @param {string} id - The anagrafica document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { anagrafica, error, isLoading, isValidating, mutate }
 */
export function useAnagrafica(id, options = {}) {
  // Memoize the merged options to prevent unnecessary re-renders
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_ANAGRAFICA_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? ["anagrafica", id] : null,
    anagraficaFetcher,
    swrOptions,
  );

  return {
    anagrafica: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching access records for an anagrafica
 * Uses server action with SWR for client-side caching
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { accessi, error, isLoading, isValidating, mutate }
 */
export function useAccessi(anagraficaId, options = {}) {
  // Memoize the merged options to prevent unnecessary re-renders
  const swrOptions = useMemo(
    () => ({ ...DEFAULT_ACCESSI_OPTIONS, ...options }),
    [options],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    anagraficaId ? ["accessi", anagraficaId] : null,
    accessiFetcher,
    swrOptions,
  );

  // Memoize the return object to prevent unnecessary re-renders in consumers
  const accessi = useMemo(() => data?.accessi || [], [data?.accessi]);
  const count = data?.count || 0;

  return {
    accessi,
    count,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
