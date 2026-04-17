"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Individual folder tree item with collapse/expand
 */
function FolderTreeItem({
  folder,
  currentFolderId,
  onSelectFolder,
  level = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = currentFolderId === folder.id;
  const isDefaultCategory = folder.isDefaultCategory;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelectFolder(folder.id);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-accent font-medium",
          level > 0 && "ml-4",
        )}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <span className="w-4" />
        )}

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
        ) : (
          <Folder
            className={cn(
              "h-4 w-4 flex-shrink-0",
              isDefaultCategory ? "text-blue-600" : "text-blue-500",
            )}
          />
        )}

        {/* Folder Name */}
        <span
          className={cn(
            "text-sm truncate flex-1",
            isDefaultCategory && "font-semibold",
          )}
          title={folder.nome}
        >
          {folder.nome}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              currentFolderId={currentFolderId}
              onSelectFolder={onSelectFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Folder tree sidebar navigation component
 * Displays folders in a hierarchical tree structure
 *
 * @param {Object} props
 * @param {Array} props.rootFolders - Array of root-level folders with children
 * @param {string} props.currentFolderId - Currently selected folder ID
 * @param {Function} props.onSelectFolder - Callback when selecting a folder
 * @param {boolean} props.isLoading - Loading state
 */
export default function FolderTree({
  rootFolders = [],
  currentFolderId,
  onSelectFolder,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!rootFolders || rootFolders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No folders found
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {rootFolders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          currentFolderId={currentFolderId}
          onSelectFolder={onSelectFolder}
          level={0}
        />
      ))}
    </div>
  );
}
