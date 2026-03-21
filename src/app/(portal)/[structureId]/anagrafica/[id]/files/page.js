'use client';

import { useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FolderPlus,
  Upload,
  RefreshCw,
  ArrowLeft,
  Grid3x3,
  List,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FolderTree from '@/components/Files/FolderTree/FolderTree';
import FileGridView from '@/components/Files/FileList/FileGridView';
import FileListTable from '@/components/Files/FileList/FileListTable';
import FolderBreadcrumbs from '@/components/Files/Breadcrumbs/FolderBreadcrumbs';
import CreateFolderDialog from '@/components/Files/Dialogs/CreateFolderDialog';
import UploadFilesDialog from '@/components/Files/Dialogs/UploadFilesDialog';
import MoveItemDialog from '@/components/Files/Dialogs/MoveItemDialog';
import {
  useFolderTree,
  useFolderContents,
  invalidateFolderTreeCache,
} from '@/hooks/useFolderTree';
import { useFolderOperations } from '@/hooks/useFolderOperations';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useParams } from 'next/navigation';

/**
 * Files page with Google Drive-style grid view
 */
export default function FilesPage() {
  const params = useParams();
  const anagraficaId = params.id;
  const structureId = params.structureId;

  const { mutate } = useSWRConfig();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);

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
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  });

  // Setup file operations
  const fileOps = useFileOperations(structureId, () => {
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

  // Open the move dialog for a file or folder
  const handleMoveClick = useCallback((item) => {
    setMovingItem(item);
    setMoveDialogOpen(true);
  }, []);

  // Execute move after destination is selected in the dialog
  const handleMoveConfirm = useCallback(
    async (targetFolderId) => {
      if (!movingItem) return;
      if (movingItem.isFolder) {
        await folderOps.move(movingItem.id, targetFolderId);
      } else {
        await fileOps.moveFile(movingItem.id, targetFolderId);
      }
      setMoveDialogOpen(false);
      setMovingItem(null);
    },
    [movingItem, folderOps, fileOps]
  );

  // Handle refresh
  const handleRefresh = () => {
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  };

  const currentFolderName = currentFolder?.nome || 'Root';

  const handleFileMove = useCallback((fileIdOrObj, targetFolderId) => {
    if (targetFolderId !== undefined) {
      fileOps.moveFile(fileIdOrObj, targetFolderId);
    } else {
      handleMoveClick({ ...fileIdOrObj, isFolder: false });
    }
  }, [fileOps, handleMoveClick]);

  const handleFileDelete = useCallback((file) => {
    if (confirm(`Are you sure you want to delete "${file.nome}"?`)) {
      fileOps.removeFile(file.id);
    }
  }, [fileOps]);

  const handleFolderDelete = useCallback((folder) => {
    const hasContents = subfolders.length > 0 || files.length > 0;
    const message = hasContents
      ? `"${folder.nome}" is not empty. Delete all contents?`
      : `Are you sure you want to delete "${folder.nome}"?`;
    if (confirm(message)) {
      folderOps.remove(folder.id, hasContents);
    }
  }, [subfolders.length, files.length, folderOps]);

  const handleFolderRename = useCallback((folder) => {
    const newName = prompt('Enter new folder name:', folder.nome);
    if (newName && newName !== folder.nome) {
      folderOps.rename(folder.id, newName);
    }
  }, [folderOps]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files & Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage files and folders for this record
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${structureId}/anagrafica/${anagraficaId}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Record
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>File Browser</CardTitle>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

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
            <div className="w-64 flex-shrink-0 border-r pr-4">
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
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <FolderTree
                    rootFolders={rootFolders}
                    currentFolderId={currentFolderId}
                    onSelectFolder={handleFolderSelect}
                    isLoading={isLoadingTree}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel: File Grid/List */}
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
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Files
                      </Button>
                    }
                  />
                </div>

                <Separator />

                {/* File Grid or List View */}
                {viewMode === 'grid' ? (
                  <FileGridView
                    files={files}
                    subfolders={subfolders}
                    currentFolder={currentFolder}
                    onFolderOpen={handleFolderSelect}
                    onFileMove={handleFileMove}
                    onFileDelete={handleFileDelete}
                    onFolderMove={(folderIdOrObj, targetFolderId) => {
                      if (targetFolderId !== undefined) {
                        folderOps.move(folderIdOrObj, targetFolderId);
                      } else {
                        handleMoveClick({ ...folderIdOrObj, isFolder: true });
                      }
                    }}
                    onFolderDelete={handleFolderDelete}
                    onFolderRename={handleFolderRename}
                    onFileRename={() => alert('File rename not yet implemented')}
                    isLoading={isLoadingContents}
                  />
                ) : (
                  <FileListTable
                    files={files}
                    subfolders={subfolders}
                    onFolderOpen={handleFolderSelect}
                    onFileMove={handleFileMove}
                    onFileDelete={handleFileDelete}
                    onFolderDelete={handleFolderDelete}
                    onFolderMove={(folder) => handleMoveClick({ ...folder, isFolder: true })}
                    onFolderRename={handleFolderRename}
                    onFileRename={() => alert('File rename not yet implemented')}
                    isLoading={isLoadingContents}
                  />
                )}
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

          {/* Move Dialog */}
          <MoveItemDialog
            open={moveDialogOpen}
            onOpenChange={setMoveDialogOpen}
            item={movingItem}
            folders={folders}
            onConfirm={handleMoveConfirm}
            isMoving={fileOps.isMoving || folderOps.isMoving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
