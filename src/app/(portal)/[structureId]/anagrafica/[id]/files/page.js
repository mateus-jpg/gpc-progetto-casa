"use client";

import { ArrowLeft, FolderPlus, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { getFileUrl } from "@/actions/files/files";
import FolderBreadcrumbs from "@/components/Files/Breadcrumbs/FolderBreadcrumbs";
import CreateFolderDialog from "@/components/Files/Dialogs/CreateFolderDialog";
import MoveItemDialog from "@/components/Files/Dialogs/MoveItemDialog";
import UploadFilesDialog from "@/components/Files/Dialogs/UploadFilesDialog";
import MobileFileList from "@/components/Files/FileList/MobileFileList";
import { FileDownloadContext } from "@/hooks/useFileDownload";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useFolderOperations } from "@/hooks/useFolderOperations";
import {
  invalidateFolderTreeCache,
  useFolderContents,
  useFolderTree,
} from "@/hooks/useFolderTree";
import { cn } from "@/lib/utils";

export default function FilesPage() {
  const params = useParams();
  const anagraficaId = params.id;
  const structureId = params.structureId;

  const { mutate } = useSWRConfig();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);

  const {
    folders,
    isLoading: isLoadingTree,
    mutate: mutateTree,
  } = useFolderTree(anagraficaId, structureId);

  const {
    folder: currentFolder,
    files,
    subfolders,
    breadcrumbs,
    isLoading: isLoadingContents,
    mutate: mutateContents,
  } = useFolderContents(currentFolderId, anagraficaId, structureId);

  const folderOps = useFolderOperations(anagraficaId, structureId, () => {
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  });

  const fileOps = useFileOperations(structureId, () => {
    mutateContents();
  });

  const handleFolderSelect = useCallback((folderId) => {
    setCurrentFolderId(folderId);
  }, []);

  const handleCreateFolder = async (folderName) => {
    const result = await folderOps.create(folderName, currentFolderId);
    if (result.success) {
      setCreateFolderDialogOpen(false);
    }
  };

  const handleMoveClick = useCallback((item) => {
    setMovingItem(item);
    setMoveDialogOpen(true);
  }, []);

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
    [movingItem, folderOps, fileOps],
  );

  const handleRefresh = () => {
    mutateTree();
    mutateContents();
    invalidateFolderTreeCache(mutate, anagraficaId);
  };

  const currentFolderName = currentFolder?.nome || "Root";

  const handleFileMove = useCallback(
    (fileIdOrObj, targetFolderId) => {
      if (targetFolderId !== undefined) {
        fileOps.moveFile(fileIdOrObj, targetFolderId);
      } else {
        handleMoveClick({ ...fileIdOrObj, isFolder: false });
      }
    },
    [fileOps, handleMoveClick],
  );

  const handleFileDelete = useCallback(
    (file) => {
      if (confirm(`Are you sure you want to delete "${file.nome}"?`)) {
        fileOps.removeFile(file.id);
      }
    },
    [fileOps],
  );

  const getScopedFileUrl = useCallback(
    (fileId) => getFileUrl(fileId, structureId),
    [structureId],
  );

  const handleFolderDelete = useCallback(
    (folder) => {
      const hasContents = subfolders.length > 0 || files.length > 0;
      const message = hasContents
        ? `"${folder.nome}" is not empty. Delete all contents?`
        : `Are you sure you want to delete "${folder.nome}"?`;
      if (confirm(message)) {
        folderOps.remove(folder.id, hasContents);
      }
    },
    [subfolders.length, files.length, folderOps],
  );

  const handleFolderRename = useCallback(
    (folder) => {
      const newName = prompt("Enter new folder name:", folder.nome);
      if (newName && newName !== folder.nome) {
        folderOps.rename(folder.id, newName);
      }
    },
    [folderOps],
  );

  const isLoading = isLoadingTree || isLoadingContents;

  return (
    <div
      className="flex flex-col bg-muted/50 -mt-4 md:-mt-6"
      style={{ height: "calc(100dvh - var(--header-height))" }}
    >
      {/* Sticky header */}
      <header className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${structureId}/anagrafica/${anagraficaId}`}>
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div>
            <h1 className="text-sm font-semibold leading-tight tracking-tight">
              File &amp; Documenti
            </h1>
            <p className="text-[11px] text-primary-foreground/60 leading-tight">
              Gestione documenti
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Aggiorna"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 disabled:opacity-40 transition-opacity"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </button>
      </header>

      {/* Breadcrumbs */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        <FolderBreadcrumbs
          breadcrumbs={breadcrumbs}
          onNavigate={handleFolderSelect}
        />
      </div>

      {/* Scrollable file list */}
      <main className="flex-1 overflow-y-auto">
        <FileDownloadContext.Provider value={getScopedFileUrl}>
          <MobileFileList
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
            onFileRename={() => alert("File rename not yet implemented")}
            isLoading={isLoadingContents}
          />
        </FileDownloadContext.Provider>
      </main>

      {/* Sticky bottom action bar */}
      <div
        className="flex-shrink-0 bg-card border-t border-border px-4 pt-3 flex gap-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setCreateFolderDialogOpen(true)}
          disabled={folderOps.isProcessing}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-border text-sm font-medium text-foreground active:bg-muted/50 disabled:opacity-40 transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          Nuova Cartella
        </button>

        <UploadFilesDialog
          anagraficaId={anagraficaId}
          structureId={structureId}
          currentFolderId={currentFolderId}
          folders={folders}
          onSuccess={() => mutateContents()}
          trigger={
            <button
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-orange-600 text-white text-sm font-semibold active:bg-orange-700 transition-colors shadow-sm shadow-orange-200"
              type="button"
            >
              <Upload className="w-4 h-4" />
              Carica File
            </button>
          }
        />
      </div>

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onSubmit={handleCreateFolder}
        parentFolderName={currentFolderName}
        isCreating={folderOps.isCreating}
      />

      <MoveItemDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        item={movingItem}
        folders={folders}
        onConfirm={handleMoveConfirm}
        isMoving={fileOps.isMoving || folderOps.isMoving}
      />
    </div>
  );
}
