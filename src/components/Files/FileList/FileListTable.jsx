'use client';

import { useMemo, useState } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Folder, File, MoreVertical, Download, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useFileDownload } from '@/hooks/useFileDownload';
import FolderActionsMenu from '@/components/Files/FolderActionsMenu';

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  } catch {
    return '-';
  }
}

/**
 * File actions dropdown menu
 */
function FileActionsMenu({ file, onDelete, onRename, onMove }) {
  const { handleDownload, isDownloading } = useFileDownload(file.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename?.(file)}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove?.(file)}>
          <Folder className="mr-2 h-4 w-4" />
          Move
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete?.(file)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * File list table with drag-drop support
 * Displays files and folders in a sortable, filterable table
 *
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {Array} props.subfolders - Array of subfolder objects
 * @param {Function} props.onFolderOpen - Callback when double-clicking a folder
 * @param {Function} props.onFileMove - Callback when moving a file
 * @param {Function} props.onFileDelete - Callback to delete a file
 * @param {Function} props.onFileRename - Callback to rename a file
 * @param {Function} props.onFolderDelete - Callback to delete a folder
 * @param {Function} props.onFolderRename - Callback to rename a folder
 * @param {Function} props.onFolderMove - Callback to move a folder
 * @param {boolean} props.isLoading - Loading state
 */
export default function FileListTable({
  files = [],
  subfolders = [],
  onFolderOpen,
  onFileMove,
  onFileDelete,
  onFileRename,
  onFolderDelete,
  onFolderRename,
  onFolderMove,
  isLoading = false,
}) {
  const [draggedItem, setDraggedItem] = useState(null);

  // Combine folders and files into single dataset
  const data = useMemo(() => {
    const folderRows = subfolders.map((folder) => ({
      ...folder,
      isFolder: true,
      dimensione: null,
      tipo: 'Folder',
    }));

    const fileRows = files.map((file) => ({
      ...file,
      isFolder: false,
    }));

    return [...folderRows, ...fileRows];
  }, [subfolders, files]);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required to start drag
      },
    })
  );

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    const draggedRow = data.find((row) => row.id === active.id);
    const targetRow = data.find((row) => row.id === over.id);

    // Only allow dropping files on folders
    if (!draggedRow?.isFolder && targetRow?.isFolder) {
      onFileMove?.(draggedRow.id, targetRow.id);
    }
  };

  // Handle drag start
  const handleDragStart = (event) => {
    const draggedRow = data.find((row) => row.id === event.active.id);
    setDraggedItem(draggedRow);
  };

  // Define columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'nome',
        header: 'Name',
        size: 300,
        Cell: ({ row }) => {
          const isFolder = row.original.isFolder;
          const canDrop = draggedItem && !draggedItem.isFolder && isFolder;

          return (
            <div
              className={`flex items-center gap-2 ${
                canDrop ? 'bg-accent/50 rounded p-1' : ''
              }`}
              onDoubleClick={() => {
                if (isFolder && onFolderOpen) {
                  onFolderOpen(row.original.id);
                }
              }}
            >
              {isFolder ? (
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
              )}
              <span className="truncate" title={row.original.nome}>
                {row.original.nome}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'tipo',
        header: 'Type',
        size: 150,
        Cell: ({ row }) => {
          if (row.original.isFolder) {
            return <span className="text-muted-foreground">Folder</span>;
          }
          const type = row.original.tipo || '';
          const shortType = type.split('/').pop() || type;
          return (
            <span className="text-muted-foreground text-sm" title={type}>
              {shortType}
            </span>
          );
        },
      },
      {
        accessorKey: 'dimensione',
        header: 'Size',
        size: 100,
        Cell: ({ row }) => {
          if (row.original.isFolder) {
            return <span className="text-muted-foreground">-</span>;
          }
          return (
            <span className="text-muted-foreground">
              {formatBytes(row.original.dimensione || 0)}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Modified',
        size: 150,
        Cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.original.updatedAt || row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        enableSorting: false,
        Cell: ({ row }) => {
          if (row.original.isFolder) {
            return (
              <FolderActionsMenu
                folder={row.original}
                onRename={onFolderRename}
                onMove={onFolderMove}
                onDelete={onFolderDelete}
              />
            );
          }
          return (
            <FileActionsMenu
              file={row.original}
              onDelete={onFileDelete}
              onRename={onFileRename}
              onMove={onFileMove}
            />
          );
        },
      },
    ],
    [
      draggedItem,
      onFolderOpen,
      onFileMove,
      onFileDelete,
      onFileRename,
      onFolderDelete,
      onFolderRename,
      onFolderMove,
    ]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <MaterialReactTable
        columns={columns}
        data={data}
        enableRowDragging={!isLoading}
        enableColumnActions={false}
        enableColumnFilters={false}
        enablePagination={true}
        enableSorting={true}
        enableBottomToolbar={true}
        enableTopToolbar={true}
        initialState={{
          pagination: { pageSize: 20, pageIndex: 0 },
          sorting: [
            { id: 'isFolder', desc: true }, // Folders first
            { id: 'nome', desc: false }, // Then by name
          ],
        }}
        state={{
          isLoading,
        }}
        muiTablePaperProps={{
          elevation: 0,
          sx: { border: '1px solid', borderColor: 'divider' },
        }}
        muiTableHeadCellProps={{
          sx: {
            fontWeight: 600,
            fontSize: '0.875rem',
          },
        }}
        muiTableBodyRowProps={({ row }) => ({
          sx: {
            cursor: row.original.isFolder ? 'pointer' : 'default',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
        })}
        muiRowDragHandleProps={{
          sx: {
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          },
        }}
      />
    </DndContext>
  );
}
