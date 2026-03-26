/**
 * SWR hooks and operation hooks for structure-level file management
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  getStructureFolderTree,
  getStructureFolderContents,
  createStructureFolder,
  renameStructureFolder,
  deleteStructureFolder,
  moveStructureFolder,
  moveStructureFileToFolder,
} from '@/actions/files/structure-folders';
import { deleteStructureFile } from '@/actions/files/structure-files';

// ---------------------------------------------------------------------------
// SWR data hooks
// ---------------------------------------------------------------------------

/**
 * Fetch folder tree for a structure
 * @param {string} structureId
 */
export function useStructureFolderTree(structureId) {
  const { data, error, isLoading, mutate } = useSWR(
    structureId ? ['structure-folder-tree', structureId] : null,
    async ([_, id]) => {
      const result = await getStructureFolderTree(id);
      if (result.error) throw new Error(result.message);
      return result;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 30000 }
  );

  return {
    folders: data?.folders || [],
    rootFolders: data?.rootFolders || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    error: error?.message,
    mutate,
  };
}

/**
 * Fetch contents of a specific structure folder
 * @param {string|null} folderId - null for root
 * @param {string} structureId - required for root
 */
export function useStructureFolderContents(folderId, structureId = null) {
  const key = ['structure-folder-contents', folderId || 'root', structureId];

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async ([_, id, sid]) => {
      const result = await getStructureFolderContents({
        folderId: id === 'root' ? null : id,
        structureId: sid,
      });
      if (result.error) throw new Error(result.message);
      return result;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 10000 }
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
 * Invalidate structure folder tree cache (SWR)
 * @param {Function} mutate - global SWR mutate
 * @param {string} structureId
 */
export function invalidateStructureFolderTreeCache(mutate, structureId) {
  mutate(
    key => {
      if (!Array.isArray(key)) return false;
      const [type, id] = key;
      return (
        (type === 'structure-folder-tree' && id === structureId) ||
        type === 'structure-folder-contents'
      );
    },
    undefined,
    { revalidate: true }
  );
}

// ---------------------------------------------------------------------------
// Folder operation hook
// ---------------------------------------------------------------------------

/**
 * Hook for folder CRUD operations on a structure
 * @param {string} structureId
 * @param {Function} onSuccess - callback after successful operation
 */
export function useStructureFolderOperations(structureId, onSuccess) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const create = useCallback(
    async (folderName, parentFolderId = null) => {
      if (!structureId || !folderName?.trim()) {
        toast.error('Required parameters missing');
        return { success: false };
      }
      setIsCreating(true);
      try {
        const result = await createStructureFolder({ structureId, nome: folderName.trim(), parentFolderId });
        if (result.error) { toast.error(result.message || 'Failed to create folder'); return { success: false }; }
        toast.success('Folder created successfully');
        onSuccess?.();
        return { success: true, folder: result.folder };
      } catch (err) {
        console.error('[CREATE_STRUCTURE_FOLDER_HOOK]:', err);
        toast.error('An error occurred while creating the folder');
        return { success: false };
      } finally {
        setIsCreating(false);
      }
    },
    [structureId, onSuccess]
  );

  const rename = useCallback(
    async (folderId, newName) => {
      if (!newName?.trim()) { toast.error('Folder name is required'); return { success: false }; }
      setIsRenaming(true);
      try {
        const result = await renameStructureFolder({ folderId, newName: newName.trim(), structureId });
        if (result.error) { toast.error(result.message || 'Failed to rename folder'); return { success: false }; }
        toast.success(result.message || 'Folder renamed successfully');
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('[RENAME_STRUCTURE_FOLDER_HOOK]:', err);
        toast.error('An error occurred while renaming the folder');
        return { success: false };
      } finally {
        setIsRenaming(false);
      }
    },
    [structureId, onSuccess]
  );

  const remove = useCallback(
    async (folderId, cascade = false) => {
      setIsDeleting(true);
      try {
        const result = await deleteStructureFolder({ folderId, cascade, structureId });
        if (result.error) { toast.error(result.message || 'Failed to delete folder'); return { success: false }; }
        toast.success(result.message || `Folder deleted (${result.deletedCount} items)`);
        onSuccess?.();
        return { success: true, deletedCount: result.deletedCount };
      } catch (err) {
        console.error('[DELETE_STRUCTURE_FOLDER_HOOK]:', err);
        toast.error('An error occurred while deleting the folder');
        return { success: false };
      } finally {
        setIsDeleting(false);
      }
    },
    [structureId, onSuccess]
  );

  const move = useCallback(
    async (folderId, newParentFolderId) => {
      setIsMoving(true);
      try {
        const result = await moveStructureFolder({ folderId, newParentFolderId, structureId });
        if (result.error) { toast.error(result.message || 'Failed to move folder'); return { success: false }; }
        toast.success(result.message || 'Folder moved successfully');
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('[MOVE_STRUCTURE_FOLDER_HOOK]:', err);
        toast.error('An error occurred while moving the folder');
        return { success: false };
      } finally {
        setIsMoving(false);
      }
    },
    [structureId, onSuccess]
  );

  return {
    create, rename, remove, move,
    isCreating, isRenaming, isDeleting, isMoving,
    isProcessing: isCreating || isRenaming || isDeleting || isMoving,
  };
}

// ---------------------------------------------------------------------------
// File operation hook
// ---------------------------------------------------------------------------

/**
 * Hook for file move/delete operations on structure files
 * @param {string} structureId
 * @param {Function} onSuccess - callback after successful operation
 */
export function useStructureFileOperations(structureId, onSuccess) {
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const moveFile = useCallback(
    async (fileId, targetFolderId) => {
      setIsMoving(true);
      try {
        const result = await moveStructureFileToFolder({ fileId, targetFolderId, structureId });
        if (result.error) { toast.error(result.message || 'Failed to move file'); return { success: false }; }
        toast.success(result.message || 'File moved successfully');
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('[MOVE_STRUCTURE_FILE_HOOK]:', err);
        toast.error('An error occurred while moving the file');
        return { success: false };
      } finally {
        setIsMoving(false);
      }
    },
    [structureId, onSuccess]
  );

  const removeFile = useCallback(
    async (fileId) => {
      setIsDeleting(true);
      try {
        const result = await deleteStructureFile(fileId);
        if (result.error) { toast.error(result.message || 'Failed to delete file'); return { success: false }; }
        toast.success(result.message || 'File deleted successfully');
        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('[DELETE_STRUCTURE_FILE_HOOK]:', err);
        toast.error('An error occurred while deleting the file');
        return { success: false };
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess]
  );

  return { moveFile, removeFile, isMoving, isDeleting };
}
