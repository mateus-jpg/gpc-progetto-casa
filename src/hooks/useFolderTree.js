/**
 * Custom hook for fetching and managing folder tree data
 * Uses SWR for client-side caching and automatic revalidation
 */

import useSWR from "swr";
import { getFolderContents, getFolderTree } from "@/actions/files/folders";

/**
 * Fetch folder tree for an anagrafica
 * @param {string} anagraficaId - Anagrafica ID
 * @returns {Object} SWR response with folder tree data
 */
export function useFolderTree(anagraficaId) {
  const { data, error, isLoading, mutate } = useSWR(
    anagraficaId ? ["folder-tree", anagraficaId] : null,
    async ([_, id]) => {
      const result = await getFolderTree(id);
      if (result.error) {
        throw new Error(result.message);
      }
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    },
  );

  return {
    folders: data?.folders || [],
    rootFolders: data?.rootFolders || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    error: error?.message,
    mutate, // Expose mutate for manual revalidation
  };
}

/**
 * Fetch contents of a specific folder
 * @param {string} folderId - Folder ID (null for root)
 * @param {string} anagraficaId - Anagrafica ID (required when folderId is null)
 * @param {boolean} includeSubfolders - Whether to include subfolders
 * @returns {Object} SWR response with folder contents
 */
export function useFolderContents(
  folderId,
  anagraficaId = null,
  includeSubfolders = true,
) {
  // Use 'root' as key when folderId is null to enable root fetching
  const key = [
    "folder-contents",
    folderId || "root",
    anagraficaId,
    includeSubfolders,
  ];

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async ([_, id, anagId, includeSub]) => {
      const result = await getFolderContents({
        folderId: id === "root" ? null : id,
        anagraficaId: anagId,
        includeSubfolders: includeSub,
      });
      if (result.error) {
        throw new Error(result.message);
      }
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    },
  );

  return {
    folder: data?.folder || null,
    files: data?.files || [],
    subfolders: data?.subfolders || [],
    breadcrumbs: data?.breadcrumbs || [],
    counts: data?.counts || { subfolders: 0, files: 0 },
    isLoading,
    isError: error,
    error: error?.message,
    mutate,
  };
}

/**
 * Helper to invalidate folder tree cache
 * Useful after folder operations (create, rename, delete, move)
 * @param {Function} mutate - SWR mutate function
 * @param {string} anagraficaId - Anagrafica ID
 */
export function invalidateFolderTreeCache(mutate, anagraficaId) {
  // Invalidate all folder-related cache keys for this anagrafica
  mutate(
    (key) => {
      if (!Array.isArray(key)) return false;
      const [type, id] = key;
      return (
        (type === "folder-tree" && id === anagraficaId) ||
        type === "folder-contents"
      );
    },
    undefined,
    { revalidate: true },
  );
}
