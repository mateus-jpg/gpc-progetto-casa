"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import {
  ArrowUp,
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
import { useState } from "react";
import { toast } from "sonner";
import FolderActionsMenu from "@/components/Files/FolderActionsMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileDownload } from "@/hooks/useFileDownload";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Parent folder ".." item for navigation (also droppable)
 */
function ParentFolderItem({ onNavigateUp, parentFolderId }) {
  // Make parent folder droppable
  const { setNodeRef, isOver } = useDroppable({
    id: "drop-parent-folder",
    data: {
      type: "folder",
      folderId: parentFolderId,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "relative group cursor-pointer hover:shadow-md transition-all border-dashed",
        isOver && "ring-2 ring-blue-500 bg-blue-50",
      )}
      onClick={onNavigateUp}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="mb-3">
            <div className="relative">
              <Folder className="w-16 h-16 text-gray-400" />
              <ArrowUp className="w-6 h-6 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Name */}
          <p className="text-sm font-medium text-center text-gray-600">..</p>
          <p className="text-xs text-muted-foreground mt-1">Parent Folder</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType, className = "w-12 h-12") {
  if (!mimeType) return <File className={className} />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className={cn(className, "text-green-500")} />;
  }
  if (mimeType.startsWith("video/")) {
    return <FileVideo className={cn(className, "text-purple-500")} />;
  }
  if (mimeType.startsWith("audio/")) {
    return <FileAudio className={cn(className, "text-pink-500")} />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className={cn(className, "text-red-500")} />;
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return <FileArchive className={cn(className, "text-orange-500")} />;
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("html")
  ) {
    return <FileCode className={cn(className, "text-blue-500")} />;
  }

  return <FileText className={cn(className, "text-gray-500")} />;
}

/**
 * Grid item for a folder (draggable and droppable)
 */
function FolderGridItem({
  folder,
  onOpen,
  onRename,
  onMove,
  onDelete,
  isSelected,
  isDragOverlay = false,
}) {
  // Make folder draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
    data: {
      type: "folder",
      folder,
    },
  });

  // Make folder droppable (can receive files/folders)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: {
      type: "folder",
      folderId: folder.id,
    },
  });

  // Combine refs
  const setRefs = (element) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <Card
      ref={isDragOverlay ? undefined : setRefs}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={cn(
        "relative group cursor-pointer hover:shadow-md transition-all",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50",
        isOver && "ring-2 ring-blue-500 bg-blue-50",
      )}
      onClick={() => !isDragging && onOpen(folder.id)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="mb-3">
            <Folder className="w-16 h-16 text-blue-500" />
          </div>

          {/* Name */}
          <p
            className="text-sm font-medium text-center truncate w-full px-2"
            title={folder.nome}
          >
            {folder.nome}
          </p>

          {/* Badge for default folders */}
          {folder.isDefaultCategory && (
            <span className="text-xs text-muted-foreground mt-1">Default</span>
          )}
        </div>

        {/* Actions Menu */}
        {!isDragOverlay && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <FolderActionsMenu
              folder={folder}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Grid item for a file (draggable)
 */
function FileGridItem({
  file,
  onDelete,
  onRename,
  onMove,
  isSelected,
  isDragOverlay = false,
}) {
  const { handleDownload, isDownloading } = useFileDownload(file.id);

  // Make file draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: {
      type: "file",
      file,
    },
  });

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={cn(
        "relative group cursor-pointer hover:shadow-md transition-all",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50",
      )}
      onClick={!isDragging ? handleDownload : undefined}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="mb-3">{getFileIcon(file.tipo, "w-16 h-16")}</div>

          {/* Name */}
          <p
            className="text-sm font-medium text-center truncate w-full px-2"
            title={file.nome}
          >
            {file.nome}
          </p>

          {/* Size */}
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(file.dimensione || 0)}
          </p>

          {/* Modified date */}
          {file.updatedAt && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(file.updatedAt), "dd/MM/yyyy")}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        {!isDragOverlay && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename?.(file);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove?.(file);
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(file);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Google Drive-style grid view for files and folders with drag-and-drop
 */
export default function FileGridView({
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
  selectedItems = [],
}) {
  const [activeItem, setActiveItem] = useState(null);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const draggedItem = active.data.current;
    const targetFolder = over.data.current;

    // Only handle drops on folders
    if (targetFolder?.type !== "folder") return;

    // Don't allow dropping folder into itself
    if (
      draggedItem.type === "folder" &&
      draggedItem.folder.id === targetFolder.folderId
    ) {
      return;
    }

    // Handle file move
    if (draggedItem.type === "file") {
      onFileMove?.(draggedItem.file.id, targetFolder.folderId);
      toast.success(`Moved "${draggedItem.file.nome}" to folder`);
    }

    // Handle folder move
    if (draggedItem.type === "folder") {
      onFolderMove?.(draggedItem.folder.id, targetFolder.folderId);
      toast.success(`Moved folder "${draggedItem.folder.nome}"`);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  const handleNavigateUp = () => {
    if (currentFolder?.parentFolderId) {
      onFolderOpen?.(currentFolder.parentFolderId);
    } else {
      // Navigate to root
      onFolderOpen?.(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded mb-3" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const showParentFolder = currentFolder !== null;
  const isEmpty = subfolders.length === 0 && files.length === 0;

  if (isEmpty && !showParentFolder) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Folder className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          This folder is empty
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Upload files or create subfolders to get started
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Parent folder (..) */}
        {showParentFolder && (
          <ParentFolderItem
            onNavigateUp={handleNavigateUp}
            parentFolderId={currentFolder?.parentFolderId || null}
          />
        )}

        {/* Folders */}
        {subfolders.map((folder) => (
          <FolderGridItem
            key={folder.id}
            folder={folder}
            onOpen={onFolderOpen}
            onRename={onFolderRename}
            onMove={onFolderMove}
            onDelete={onFolderDelete}
            isSelected={selectedItems.includes(folder.id)}
          />
        ))}

        {/* Files */}
        {files.map((file) => (
          <FileGridItem
            key={file.id}
            file={file}
            onDelete={onFileDelete}
            onRename={onFileRename}
            onMove={onFileMove}
            isSelected={selectedItems.includes(file.id)}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem?.type === "folder" && (
          <FolderGridItem
            folder={activeItem.folder}
            onOpen={() => {}}
            isDragOverlay
          />
        )}
        {activeItem?.type === "file" && (
          <FileGridItem
            file={activeItem.file}
            onDelete={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
