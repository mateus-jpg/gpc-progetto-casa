/**
 * Custom hook for file operations (move, drag-drop, etc.)
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { deleteFile } from "@/actions/files/files";
import { moveFilesToFolder, moveFileToFolder } from "@/actions/files/folders";

/**
 * Hook for managing file operations
 * @param {string} structureId - Current structure ID
 * @param {Function} onSuccess - Callback after successful operation
 * @returns {Object} File operation handlers
 */
export function useFileOperations(structureId, onSuccess) {
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Move single file to a folder
   */
  const moveFile = useCallback(
    async (fileId, targetFolderId) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      setIsMoving(true);
      try {
        const result = await moveFileToFolder({
          fileId,
          targetFolderId,
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to move file");
          return { success: false };
        }

        toast.success(result.message || "File moved successfully");
        if (onSuccess) onSuccess();
        return { success: true };
      } catch (error) {
        console.error("[MOVE_FILE_ERROR]:", error);
        toast.error("An error occurred while moving the file");
        return { success: false };
      } finally {
        setIsMoving(false);
      }
    },
    [structureId, onSuccess],
  );

  /**
   * Move multiple files to a folder
   */
  const moveFiles = useCallback(
    async (fileIds, targetFolderId) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      if (!fileIds || fileIds.length === 0) {
        toast.error("No files selected");
        return { success: false };
      }

      setIsMoving(true);
      try {
        const result = await moveFilesToFolder({
          fileIds,
          targetFolderId,
          structureId,
        });

        if (result.error) {
          toast.error(result.message || "Failed to move files");
          return { success: false };
        }

        toast.success(
          result.message || `${result.movedCount} file(s) moved successfully`,
        );
        if (onSuccess) onSuccess();
        return { success: true, ...result };
      } catch (error) {
        console.error("[MOVE_FILES_ERROR]:", error);
        toast.error("An error occurred while moving files");
        return { success: false };
      } finally {
        setIsMoving(false);
      }
    },
    [structureId, onSuccess],
  );

  /**
   * Delete a file
   */
  const removeFile = useCallback(
    async (fileId) => {
      if (!structureId) {
        toast.error("Structure ID is required");
        return { success: false };
      }

      setIsDeleting(true);
      try {
        const result = await deleteFile(fileId, structureId);

        if (result.error) {
          toast.error(result.message || "Failed to delete file");
          return { success: false };
        }

        toast.success(result.message || "File deleted successfully");
        if (onSuccess) onSuccess();
        return { success: true };
      } catch (error) {
        console.error("[DELETE_FILE_ERROR]:", error);
        toast.error("An error occurred while deleting the file");
        return { success: false };
      } finally {
        setIsDeleting(false);
      }
    },
    [structureId, onSuccess],
  );

  /**
   * Handle drag end event (for dnd-kit)
   */
  const handleDragEnd = useCallback(
    async (event, folders) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      // Check if dropped on a folder
      const targetFolder = folders.find((f) => f.id === over.id);
      if (!targetFolder) {
        return;
      }

      // Check if dragging multiple files (batch operation)
      if (Array.isArray(active.id)) {
        return await moveFiles(active.id, targetFolder.id);
      }

      // Single file move
      return await moveFile(active.id, targetFolder.id);
    },
    [moveFile, moveFiles],
  );

  /**
   * Check if file can be dropped on target
   */
  const canDrop = useCallback((draggedItem, target) => {
    // Can't drop file on another file
    if (!target.isFolder) {
      return false;
    }

    // Can't drop on itself
    if (draggedItem.id === target.id) {
      return false;
    }

    // Can drop files on any folder
    if (!draggedItem.isFolder) {
      return true;
    }

    // Can't drop folder on its own descendant
    if (target.path?.startsWith(`${draggedItem.path}/`)) {
      return false;
    }

    return true;
  }, []);

  return {
    moveFile,
    moveFiles,
    removeFile,
    handleDragEnd,
    canDrop,
    isMoving,
    isDeleting,
  };
}

/**
 * Hook for handling file selection (multi-select)
 */
export function useFileSelection() {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const toggleSelection = useCallback((fileId) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  }, []);

  const selectMultiple = useCallback((fileIds) => {
    setSelectedFiles(fileIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const isSelected = useCallback(
    (fileId) => {
      return selectedFiles.includes(fileId);
    },
    [selectedFiles],
  );

  return {
    selectedFiles,
    toggleSelection,
    selectMultiple,
    clearSelection,
    isSelected,
    hasSelection: selectedFiles.length > 0,
    selectionCount: selectedFiles.length,
  };
}
