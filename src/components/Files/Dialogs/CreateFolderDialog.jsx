"use client";

import { Folder } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Dialog for creating a new folder
 *
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback to change open state
 * @param {Function} props.onSubmit - Callback with folder name when confirmed
 * @param {string} props.parentFolderName - Name of parent folder (for display)
 * @param {boolean} props.isCreating - Loading state during creation
 */
export default function CreateFolderDialog({
  open,
  onOpenChange,
  onSubmit,
  parentFolderName = "Root",
  isCreating = false,
}) {
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!folderName || folderName.trim().length === 0) {
      setError("Folder name is required");
      return;
    }

    if (folderName.length > 100) {
      setError("Folder name must be 100 characters or less");
      return;
    }

    // Call submit callback
    onSubmit(folderName.trim());

    // Reset form
    setFolderName("");
    setError("");
  };

  const handleCancel = () => {
    setFolderName("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-500" />
              Create New Folder
            </DialogTitle>
            <DialogDescription>
              Create a new folder in <strong>{parentFolderName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name..."
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError("");
                }}
                disabled={isCreating}
                maxLength={100}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                {folderName.length}/100 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
