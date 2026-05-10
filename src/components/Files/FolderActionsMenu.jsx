"use client";

import { Edit, Folder, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Shared folder actions dropdown (Rename, Move, Delete).
 * Always stops propagation to support both table and grid view contexts.
 */
export default function FolderActionsMenu({
  folder,
  onRename,
  onMove,
  onDelete,
}) {
  const canDelete = !folder.isDefaultCategory;

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {!folder.isDefaultCategory && (
          <>
            <DropdownMenuItem
              className="text-sm py-2.5"
              onClick={handle(() => onRename?.(folder))}
            >
              <Edit className="mr-2.5 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-sm py-2.5"
              onClick={handle(() => onMove?.(folder))}
            >
              <Folder className="mr-2.5 h-4 w-4" />
              Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="text-sm py-2.5 text-destructive focus:text-destructive disabled:opacity-50"
          onClick={handle(() => onDelete?.(folder))}
          disabled={!canDelete}
        >
          <Trash2 className="mr-2.5 h-4 w-4" />
          Delete {!canDelete && "(Protected)"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
