'use client';

import { Folder, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Shared folder actions dropdown (Rename, Move, Delete).
 * Always stops propagation to support both table and grid view contexts.
 */
export default function FolderActionsMenu({ folder, onRename, onMove, onDelete }) {
  const canDelete = !folder.isDefaultCategory;

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!folder.isDefaultCategory && (
          <>
            <DropdownMenuItem onClick={handle(() => onRename?.(folder))}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handle(() => onMove?.(folder))}>
              <Folder className="mr-2 h-4 w-4" />
              Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handle(() => onDelete?.(folder))}
          disabled={!canDelete}
          className="text-destructive focus:text-destructive disabled:opacity-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {!canDelete && '(Protected)'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
