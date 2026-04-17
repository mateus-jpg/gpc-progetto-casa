"use client";

import { FolderPlus, RefreshCw, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useFolderOperations } from "@/hooks/useFolderOperations";
import {
  invalidateFolderTreeCache,
  useFolderContents,
  useFolderTree,
} from "@/hooks/useFolderTree";
import FolderBreadcrumbs from "./Breadcrumbs/FolderBreadcrumbs";
import CreateFolderDialog from "./Dialogs/CreateFolderDialog";
import UploadFilesDialog from "./Dialogs/UploadFilesDialog";
import FileListTable from "./FileList/FileListTable";
import FolderTree from "./FolderTree/FolderTree";

/**
 * Main file browser component
 * Integrates folder tree, file list, and all dialogs
 *
 * @param {Object} props
 * @param {string} props.anagraficaId - Anagrafica ID
 * @param {string} props.structureId - Current structure ID
 */
export default function FileBrowser({ anagraficaId, structureId }) {
  const { mutate } = useSWRConfig();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);

  // Fetch folder tree
  const {
    folders,
    rootFolders,
    isLoading: isLoadingTree,
    mutate: mutateTree,
  } = useFolderTree(anagraficaId);

  // Fetch current folder contents
  const {
    folder: currentFolder,
    files,
    subfolders,
    breadcrumbs,
    isLoading: isLoadingContents,
    mutate: mutateContents,
  } = useFolderContents(currentFolderId, anagraficaId);

  // Setup folder operations
  const folderOps = useFolderOperations(anagraficaId, structureId, () => {
    // Refresh data after any folder operation
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  });

  // Setup file operations
  const fileOps = useFileOperations(structureId, () => {
    // Refresh data after any file operation
    mutateContents();
  });

  // Handle folder navigation
  const handleFolderSelect = useCallback((folderId) => {
    setCurrentFolderId(folderId);
  }, []);

  // Handle create folder
  const handleCreateFolder = async (folderName) => {
    const result = await folderOps.create(folderName, currentFolderId);
    if (result.success) {
      setCreateFolderDialogOpen(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  };

  // Get current folder name for dialog
  const currentFolderName = currentFolder?.nome || "Root";

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            Files & Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingTree || isLoadingContents}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Left Sidebar: Folder Tree */}
          <div className="w-64 flex-shrink-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  FOLDERS
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCreateFolderDialogOpen(true)}
                  disabled={folderOps.isProcessing}
                  title="Create new folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              <Separator />
              <div className="max-h-[500px] overflow-y-auto pr-2">
                <FolderTree
                  rootFolders={rootFolders}
                  currentFolderId={currentFolderId}
                  onSelectFolder={handleFolderSelect}
                  isLoading={isLoadingTree}
                />
              </div>
            </div>
          </div>

          {/* Right Panel: File List */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4">
              {/* Breadcrumbs and Actions */}
              <div className="flex items-center justify-between">
                <FolderBreadcrumbs
                  breadcrumbs={breadcrumbs}
                  onNavigate={handleFolderSelect}
                />
                <UploadFilesDialog
                  anagraficaId={anagraficaId}
                  structureId={structureId}
                  currentFolderId={currentFolderId}
                  folders={folders}
                  onSuccess={() => mutateContents()}
                  trigger={
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  }
                />
              </div>

              <Separator />

              {/* File and Folder List */}
              <FileListTable
                files={files}
                subfolders={subfolders}
                onFolderOpen={handleFolderSelect}
                onFileMove={(fileId, targetFolderId) => {
                  fileOps.moveFile(fileId, targetFolderId);
                }}
                onFileDelete={(file) => {
                  if (
                    confirm(
                      `Are you sure you want to delete "${file.nome}"? This action cannot be undone.`,
                    )
                  ) {
                    fileOps.removeFile(file.id);
                  }
                }}
                onFolderDelete={(folder) => {
                  const hasContents = subfolders.length > 0 || files.length > 0;
                  const message = hasContents
                    ? `"${folder.nome}" is not empty. Delete all contents?`
                    : `Are you sure you want to delete "${folder.nome}"?`;

                  if (confirm(message)) {
                    folderOps.remove(folder.id, hasContents);
                  }
                }}
                onFolderRename={(folder) => {
                  const newName = prompt("Enter new folder name:", folder.nome);
                  if (newName && newName !== folder.nome) {
                    folderOps.rename(folder.id, newName);
                  }
                }}
                onFileRename={(file) => {
                  // TODO: Implement file rename
                  alert("File rename not yet implemented");
                }}
                isLoading={isLoadingContents}
              />
            </div>
          </div>
        </div>

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          open={createFolderDialogOpen}
          onOpenChange={setCreateFolderDialogOpen}
          onSubmit={handleCreateFolder}
          parentFolderName={currentFolderName}
          isCreating={folderOps.isCreating}
        />
      </CardContent>
    </Card>
  );
}
