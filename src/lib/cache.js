/**
 * Cache configuration and utilities for GPC application
 * Uses Next.js unstable_cache for server-side data caching
 */

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { CACHE as CACHE_CONFIG } from '@/config/constants';

/**
 * Cache tag generators for consistent cache key naming
 * Tags are used for targeted cache invalidation
 */
export const CACHE_TAGS = {
  // Anagrafica
  anagrafica: (id) => `anagrafica-${id}`,
  anagraficaData: (anagraficaId) => `anagrafica_data-${anagraficaId}`,
  anagraficaList: (structureId) => `anagrafica-list-${structureId}`,

  // Structures
  structure: (id) => `structure-${id}`,

  // User/Operator profiles
  userProfile: (uid) => `user-${uid}`,

  // Access records (services)
  accessi: (anagraficaId) => `accessi-${anagraficaId}`,

  // Files
  files: (anagraficaId) => `files-${anagraficaId}`,
  file: (fileId) => `file-${fileId}`,

  // Folders
  folders: (anagraficaId) => `folders-${anagraficaId}`,
  folder: (folderId) => `folder-${folderId}`,
  folderContents: (folderId) => `folder-contents-${folderId}`,

  // Structure Files
  structureFiles: (structureId) => `structure-files-${structureId}`,
  structureFolders: (structureId) => `structure-folders-${structureId}`,
  structureFolderContents: (folderId) => `structure-folder-contents-${folderId}`,
};

/**
 * Revalidation times in seconds
 * @see config/constants.js for centralized configuration
 */
export const REVALIDATE = {
  userProfile: CACHE_CONFIG.REVALIDATE.USER_PROFILE,
  structure: CACHE_CONFIG.REVALIDATE.STRUCTURE,
  anagraficaList: CACHE_CONFIG.REVALIDATE.ANAGRAFICA_LIST,
  anagraficaDetail: CACHE_CONFIG.REVALIDATE.ANAGRAFICA_DETAIL,
  accessi: CACHE_CONFIG.REVALIDATE.ACCESSI,
  files: CACHE_CONFIG.REVALIDATE.FILES || 300, // 5 minutes default
};

/**
 * Helper to invalidate all cache tags related to an anagrafica record
 * Call this after any mutation to ensure data consistency
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string[]} structureIds - Array of structure IDs that can access this record
 */
export function invalidateAnagraficaCaches(anagraficaId, structureIds = []) {
  // Invalidate the specific anagrafica detail cache
  revalidateTag(CACHE_TAGS.anagrafica(anagraficaId));

  // Invalidate structure-specific data cache (anagrafica_data collection)
  revalidateTag(CACHE_TAGS.anagraficaData(anagraficaId));

  // Invalidate accessi cache for this anagrafica
  revalidateTag(CACHE_TAGS.accessi(anagraficaId));

  // Invalidate files cache for this anagrafica
  revalidateTag(CACHE_TAGS.files(anagraficaId));

  // Invalidate all affected structure list caches
  for (const structureId of structureIds) {
    revalidateTag(CACHE_TAGS.anagraficaList(structureId));
  }
}

/**
 * Helper to invalidate access-related caches
 * @param {string} anagraficaId - The anagrafica document ID
 */
export function invalidateAccessiCache(anagraficaId) {
  revalidateTag(CACHE_TAGS.accessi(anagraficaId));
}

/**
 * Helper to invalidate user profile cache
 * Call this after user permission changes
 * @param {string} userUid - The user's UID
 */
export function invalidateUserProfileCache(userUid) {
  revalidateTag(CACHE_TAGS.userProfile(userUid));
}

/**
 * Helper to invalidate structure-related caches
 * @param {string} structureId - The structure ID
 */
export function invalidateStructureCache(structureId) {
  revalidateTag(CACHE_TAGS.structure(structureId));
  revalidateTag(CACHE_TAGS.anagraficaList(structureId));
}

/**
 * Helper to invalidate files cache for an anagrafica
 * @param {string} anagraficaId - The anagrafica document ID
 */
export function invalidateFilesCache(anagraficaId) {
  revalidateTag(CACHE_TAGS.files(anagraficaId));
}

/**
 * Helper to invalidate a specific file cache
 * @param {string} fileId - The file document ID
 */
export function invalidateFileCache(fileId) {
  revalidateTag(CACHE_TAGS.file(fileId));
}

/**
 * Helper to invalidate folder-related caches
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string[]} affectedFolderIds - Array of folder IDs that were affected
 */
export function invalidateFolderCaches(anagraficaId, affectedFolderIds = []) {
  // Invalidate the folder tree for this anagrafica
  revalidateTag(CACHE_TAGS.folders(anagraficaId));

  // Invalidate specific folders and their contents
  for (const folderId of affectedFolderIds) {
    revalidateTag(CACHE_TAGS.folder(folderId));
    revalidateTag(CACHE_TAGS.folderContents(folderId));
  }

  // Also invalidate files cache since folder operations may affect file visibility
  invalidateFilesCache(anagraficaId);
}

/**
 * Helper to invalidate structure file cache
 * @param {string} structureId - The structure document ID
 */
export function invalidateStructureFilesCache(structureId) {
  revalidateTag(CACHE_TAGS.structureFiles(structureId));
}

/**
 * Helper to invalidate structure folder-related caches
 * @param {string} structureId - The structure document ID
 * @param {string[]} affectedFolderIds - Array of folder IDs that were affected
 */
export function invalidateStructureFolderCaches(structureId, affectedFolderIds = []) {
  revalidateTag(CACHE_TAGS.structureFolders(structureId));

  for (const folderId of affectedFolderIds) {
    revalidateTag(CACHE_TAGS.structureFolderContents(folderId));
  }

  invalidateStructureFilesCache(structureId);
}

/**
 * Creates a cached version of a data fetching function
 * Wrapper around unstable_cache with consistent error handling
 * @param {Function} fn - The data fetching function to cache
 * @param {string[]} keyParts - Cache key parts for unique identification
 * @param {Object} options - Cache options (tags, revalidate)
 */
export function createCachedFetcher(fn, keyParts, options = {}) {
  return unstable_cache(
    fn,
    keyParts,
    {
      revalidate: options.revalidate || 60,
      tags: options.tags || [],
    }
  );
}
