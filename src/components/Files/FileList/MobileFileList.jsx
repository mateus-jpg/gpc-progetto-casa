"use client";

import { format } from "date-fns";
import {
  ArrowUp,
  ChevronRight,
  Download,
  Edit,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileDownload } from "@/hooks/useFileDownload";
import { cn, formatBytes } from "@/lib/utils";

function getFileIcon(mimeType) {
  if (!mimeType) return <File className="w-5 h-5 text-stone-500" />;
  if (mimeType.startsWith("image/"))
    return <FileImage className="w-5 h-5 text-emerald-500" />;
  if (mimeType.startsWith("video/"))
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  if (mimeType.startsWith("audio/"))
    return <FileAudio className="w-5 h-5 text-pink-500" />;
  if (mimeType === "application/pdf")
    return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return <FileArchive className="w-5 h-5 text-orange-500" />;
  if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html"))
    return <FileCode className="w-5 h-5 text-blue-500" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="w-5 h-5 text-blue-600" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return <FileText className="w-5 h-5 text-emerald-600" />;
  return <FileText className="w-5 h-5 text-stone-500" />;
}

function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-5 pb-1.5">
      <p className="text-[11px] font-semibold tracking-widest text-stone-400 uppercase">
        {label}
      </p>
    </div>
  );
}

function ParentFolderRow({ onNavigateUp }) {
  return (
    <button
      type="button"
      onClick={onNavigateUp}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-100 active:bg-stone-50 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 relative">
        <Folder className="w-5 h-5 text-stone-400" />
        <ArrowUp className="w-2.5 h-2.5 text-stone-500 absolute bottom-1.5 right-1.5" />
      </div>
      <span className="text-sm font-medium text-stone-500 flex-1 text-left">..</span>
      <ChevronRight className="w-4 h-4 text-stone-300" />
    </button>
  );
}

function FolderRow({ folder, onOpen, onRename, onMove, onDelete }) {
  return (
    <div className="flex items-center bg-white border-b border-stone-100">
      <button
        type="button"
        className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0 active:bg-stone-50 transition-colors"
        onClick={() => onOpen(folder.id)}
      >
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Folder className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-stone-900 truncate">
            {folder.nome}
          </p>
          {folder.isDefaultCategory && (
            <p className="text-xs text-stone-400 mt-0.5">Cartella predefinita</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="w-12 h-full flex items-center justify-center flex-shrink-0 active:bg-stone-50"
            aria-label="Azioni cartella"
          >
            <MoreVertical className="w-4 h-4 text-stone-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {!folder.isDefaultCategory && (
            <>
              <DropdownMenuItem
                className="text-sm py-2.5"
                onClick={() => onRename?.(folder)}
              >
                <Edit className="mr-2.5 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm py-2.5"
                onClick={() => onMove?.(folder)}
              >
                <Folder className="mr-2.5 h-4 w-4" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-sm py-2.5 text-destructive focus:text-destructive"
            onClick={() => onDelete?.(folder)}
            disabled={folder.isDefaultCategory}
          >
            <Trash2 className="mr-2.5 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FileRow({ file, onDelete, onRename, onMove }) {
  const { handleDownload, isDownloading } = useFileDownload(file.id);

  return (
    <div className="flex items-center bg-white border-b border-stone-100">
      <button
        type="button"
        className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0 active:bg-stone-50 transition-colors disabled:opacity-60"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
          {getFileIcon(file.tipo)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-stone-900 truncate">
            {file.nome}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {formatBytes(file.dimensione || 0)}
            {file.updatedAt &&
              ` · ${format(new Date(file.updatedAt), "dd/MM/yy")}`}
          </p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="w-12 h-full flex items-center justify-center flex-shrink-0 active:bg-stone-50"
            aria-label="Azioni file"
          >
            <MoreVertical className="w-4 h-4 text-stone-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem
            className="text-sm py-2.5"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="mr-2.5 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-sm py-2.5"
            onClick={() => onRename?.(file)}
          >
            <Edit className="mr-2.5 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-sm py-2.5"
            onClick={() => onMove?.(file)}
          >
            <Folder className="mr-2.5 h-4 w-4" />
            Move
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-sm py-2.5 text-destructive focus:text-destructive"
            onClick={() => onDelete?.(file)}
          >
            <Trash2 className="mr-2.5 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-100 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 bg-stone-100 rounded w-2/3" />
        <div className="h-2.5 bg-stone-100 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function MobileFileList({
  files = [],
  subfolders = [],
  currentFolder = null,
  onFolderOpen,
  onFileDelete,
  onFileRename,
  onFolderDelete,
  onFolderRename,
  onFolderMove,
  onFileMove,
  isLoading = false,
}) {
  const handleNavigateUp = () => {
    if (currentFolder?.parentFolderId) {
      onFolderOpen?.(currentFolder.parentFolderId);
    } else {
      onFolderOpen?.(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <SectionHeader label="Folders" />
        {[...Array(3)].map((_, i) => (
          <SkeletonRow key={`sf-${i}`} />
        ))}
        <SectionHeader label="Files" />
        {[...Array(5)].map((_, i) => (
          <SkeletonRow key={`fi-${i}`} />
        ))}
      </div>
    );
  }

  const isEmpty = subfolders.length === 0 && files.length === 0;
  const showParentFolder = currentFolder !== null;

  if (isEmpty && !showParentFolder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <Folder className="w-10 h-10 text-stone-300" />
        </div>
        <p className="text-base font-semibold text-stone-700">This folder is empty</p>
        <p className="text-sm text-stone-400 mt-1.5 leading-relaxed">
          Upload files or create subfolders to get started
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {showParentFolder && (
        <ParentFolderRow onNavigateUp={handleNavigateUp} />
      )}

      {subfolders.length > 0 && (
        <>
          <SectionHeader label="Folders" />
          {subfolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={onFolderOpen}
              onRename={onFolderRename}
              onMove={onFolderMove}
              onDelete={onFolderDelete}
            />
          ))}
        </>
      )}

      {files.length > 0 && (
        <>
          <SectionHeader label="Files" />
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onDelete={onFileDelete}
              onRename={onFileRename}
              onMove={onFileMove}
            />
          ))}
        </>
      )}
    </div>
  );
}
