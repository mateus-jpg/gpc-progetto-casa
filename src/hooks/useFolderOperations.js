/**
 * Custom hook for folder CRUD operations
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createFolder,
  deleteFolder,
  moveFolder,
  renameFolder,
} from "@/actions/files/folders";

/**
 * Hook for managing folder operations
 * @param {string} anagraficaId - Anagrafica ID
 * @param {string} structureId - Current structure ID
 * @param {Function} onSuccess - Callback after successful operation
 * @returns {Object} Folder operation handlers
 */
export function useFolderOperations(anagraficaId, structureId, onSuccess) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  /**
   * Create a new folder
   */
  const create = useCallback(
    async (folderName, parentFolderId = null) => {
      if (!anagraficaId || !structureId) {
        toast.error("Required parameters missing");
        return { success: false };
      }

      if (!folderName || folderName.trim().length === 0) {
        toast.error("Folder name is required");
        return { success: false };
      }

      if (folderName.length > 100) {
        toast.error("Folder name must be 100 characters or less");
        return { success: false };
      }

      setIsCreating(true);
      try {
        const result = await createFolder({
          anagraficaId,
          nome: folderName.trim(),
          parentFolderId,
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to create folder");
          return { success: false };
        }

        toast.success("Folder created successfully");
        if (onSuccess) onSuccess();
        return { success: true, folder: result.folder };
      } catch (error) {
        console.error("[CREATE_FOLDER_ERROR]:", error);
        toast.error("An error occurred while creating the folder");
        return { success: false };
      } finally {
        setIsCreating(false);
      }
    },
    [anagraficaId, structureId, onSuccess],
  );

  /**
   * Rename a folder
   */
  const rename = useCallback(
    async (folderId, newName) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      if (!newName || newName.trim().length === 0) {
        toast.error("Folder name is required");
        return { success: false };
      }

      if (newName.length > 100) {
        toast.error("Folder name must be 100 characters or less");
        return { success: false };
      }

      setIsRenaming(true);
      try {
        const result = await renameFolder({
          folderId,
          newName: newName.trim(),
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to rename folder");
          return { success: false };
        }

        toast.success(result.message || "Folder renamed successfully");
        if (onSuccess) onSuccess();
        return { success: true };
      } catch (error) {
        console.error("[RENAME_FOLDER_ERROR]:", error);
        toast.error("An error occurred while renaming the folder");
        return { success: false };
      } finally {
        setIsRenaming(false);
      }
    },
    [structureId, onSuccess],
  );

  /**
   * Delete a folder
   */
  const remove = useCallback(
    async (folderId, cascade = false) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      setIsDeleting(true);
      try {
        const result = await deleteFolder({
          folderId,
          cascade,
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to delete folder");
          return { success: false };
        }

        toast.success(
          result.message || `Folder deleted (${result.deletedCount} items)`,
        );
        if (onSuccess) onSuccess();
        return { success: true, deletedCount: result.deletedCount };
      } catch (error) {
        console.error("[DELETE_FOLDER_ERROR]:", error);
        toast.error("An error occurred while deleting the folder");
        return { success: false };
      } finally {
        setIsDeleting(false);
      }
    },
    [structureId, onSuccess],
  );

  /**
   * Move a folder to a new parent
   */
  const move = useCallback(
    async (folderId, newParentFolderId) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      setIsMoving(true);
      try {
        const result = await moveFolder({
          folderId,
          newParentFolderId,
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to move folder");
          return { success: false };
        }

        toast.success(result.message || "Folder moved successfully");
        if (onSuccess) onSuccess();
        return { success: true };
      } catch (error) {
        console.error("[MOVE_FOLDER_ERROR]:", error);
        toast.error("An error occurred while moving the folder");
        return { success: false };
      } finally {
        setIsMoving(false);
      }
    },
    [structureId, onSuccess],
  );

  return {
    create,
    rename,
    remove,
    move,
    isCreating,
    isRenaming,
    isDeleting,
    isMoving,
    isProcessing: isCreating || isRenaming || isDeleting || isMoving,
  };
}

/**
 * Hook for folder navigation state
 */
export function useFolderNavigation(initialFolderId = null) {
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [navigationHistory, setNavigationHistory] = useState([]);

  const navigateTo = useCallback((folderId) => {
    setCurrentFolderId((prev) => {
      if (prev !== null) {
        setNavigationHistory((history) => [...history, prev]);
      }
      return folderId;
    });
  }, []);

  const navigateBack = useCallback(() => {
    setNavigationHistory((history) => {
      if (history.length === 0) return history;
      const newHistory = [...history];
      const prevFolder = newHistory.pop();
      setCurrentFolderId(prevFolder);
      return newHistory;
    });
  }, []);

  const navigateToRoot = useCallback(() => {
    setCurrentFolderId(null);
    setNavigationHistory([]);
  }, []);

  const canGoBack = navigationHistory.length > 0;

  return {
    currentFolderId,
    navigateTo,
    navigateBack,
    navigateToRoot,
    canGoBack,
    navigationHistory,
  };
}
