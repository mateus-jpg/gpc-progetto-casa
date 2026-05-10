"use client";

import { Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Dialog for moving a file or folder to a different destination folder.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {Object} props.item - The file or folder being moved (needs id, nome, isFolder)
 * @param {Array} props.folders - Flat list of all available folders
 * @param {Function} props.onConfirm - Called with targetFolderId (null = root)
 * @param {boolean} props.isMoving
 */
export default function MoveItemDialog({
  open,
  onOpenChange,
  item,
  folders = [],
  onConfirm,
  isMoving = false,
}) {
  const [selectedFolderId, setSelectedFolderId] = useState(undefined);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelectedFolderId(undefined);
  }, [open]);

  const handleConfirm = () => {
    if (selectedFolderId !== undefined) {
      onConfirm(selectedFolderId);
    }
  };

  // Exclude the item itself (if it's a folder) from the destination list
  const availableFolders = folders.filter((f) => {
    if (item?.isFolder && f.id === item.id) return false;
    return true;
  });

  const hasSelection = selectedFolderId !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move &ldquo;{item?.nome}&rdquo;</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            Select destination folder:
          </p>
          <ScrollArea className="h-64 border rounded-md p-2">
            {/* Root option */}
            <button
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 rounded-md flex items-center gap-2 hover:bg-accent text-sm",
                selectedFolderId === null && "bg-accent font-medium",
              )}
              onClick={() => setSelectedFolderId(null)}
            >
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              Root
            </button>

            {availableFolders.map((folder) => (
              <button
                type="button"
                key={folder.id}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md flex items-center gap-2 hover:bg-accent text-sm",
                  selectedFolderId === folder.id && "bg-accent font-medium",
                )}
                onClick={() => setSelectedFolderId(folder.id)}
                style={{ paddingLeft: `${12 + (folder.depth || 0) * 16}px` }}
              >
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">{folder.nome}</span>
              </button>
            ))}

            {availableFolders.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-4 text-center">
                No folders available
              </p>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!hasSelection || isMoving}>
            {isMoving ? "Moving..." : "Move Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
