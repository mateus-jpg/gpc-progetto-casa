"use client";

import { File as FileIcon, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { uploadFiles } from "@/actions/files/files";
import DatePicker from "@/components/form/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dropzone, DropzoneContent } from "@/components/ui/shadcn-io/dropzone";
import { formatBytes } from "@/lib/utils";

const MIME_BY_EXTENSION = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
};

function resolveFileType(file) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[ext] || file.type;
}

/**
 * File item display component with metadata fields
 */
function FileItem({ fileData, onUpdate, onRemove }) {
  return (
    <div className="p-4 rounded border bg-muted/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {formatBytes(fileData.file.size)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Nome Documento */}
      <div className="space-y-1">
        <Label htmlFor={`name-${fileData.id}`} className="text-xs">
          Nome Documento *
        </Label>
        <Input
          id={`name-${fileData.id}`}
          value={fileData.displayName}
          onChange={(e) =>
            onUpdate({ ...fileData, displayName: e.target.value })
          }
          placeholder="Nome del documento"
          className="h-9"
        />
      </div>

      {/* Data Documento & Scadenza */}
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          label="Data Doc."
          value={fileData.documentDate}
          onChange={(date) => onUpdate({ ...fileData, documentDate: date })}
          fromYear={2000}
          toYear={new Date().getFullYear()}
        />
        <DatePicker
          label="Scadenza (Opz.)"
          value={fileData.expirationDate}
          onChange={(date) => onUpdate({ ...fileData, expirationDate: date })}
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 10}
        />
      </div>
    </div>
  );
}

/**
 * Enhanced upload dialog with folder selection
 *
 * @param {Object} props
 * @param {string} props.anagraficaId - Anagrafica ID
 * @param {string} props.structureId - Structure ID
 * @param {string} props.currentFolderId - Currently selected folder ID
 * @param {Array} props.folders - Array of available folders
 * @param {Function} props.onSuccess - Callback after successful upload
 * @param {React.Node} props.trigger - Custom trigger button (optional)
 */
export default function UploadFilesDialog({
  anagraficaId,
  structureId,
  currentFolderId,
  folders = [],
  onSuccess,
  trigger,
}) {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId);
  const [isUploading, setIsUploading] = useState(false);

  // Sync selected folder to current folder each time dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId);
    }
  }, [open, currentFolderId]);

  const handleDrop = useCallback((acceptedFiles) => {
    // Convert files to file data objects with metadata
    const newFileData = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      displayName: file.name,
      documentDate: new Date(),
      expirationDate: null,
    }));
    setSelectedFiles((prev) => [...prev, ...newFileData]);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateFile = useCallback((index, updatedFileData) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) => (i === index ? updatedFileData : item)),
    );
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (!selectedFolderId) {
      toast.error("Please select a folder");
      return;
    }

    // Validate that all files have a document name
    const missingNames = selectedFiles.filter((f) => !f.displayName.trim());
    if (missingNames.length > 0) {
      toast.error("Please provide a document name for all files");
      return;
    }

    setIsUploading(true);
    try {
      // Convert files to required format with metadata
      const filesWithBuffers = await Promise.all(
        selectedFiles.map(async (fileData) => ({
          name: fileData.file.name,
          type: resolveFileType(fileData.file),
          size: fileData.file.size,
          buffer: await fileData.file.arrayBuffer(),
          displayName: fileData.displayName,
          documentDate: fileData.documentDate,
          expirationDate: fileData.expirationDate,
        })),
      );

      const result = await uploadFiles({
        anagraficaId,
        folderId: selectedFolderId,
        files: filesWithBuffers,
        structureId,
        tags: [],
      });

      if (result.error) {
        toast.error(result.message || "Failed to upload files");
        return;
      }

      toast.success(
        `Uploaded ${result.uploadedCount} file(s) successfully${
          result.errorCount > 0 ? ` (${result.errorCount} failed)` : ""
        }`,
      );

      // Reset and close
      setSelectedFiles([]);
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("[UPLOAD_ERROR]:", error);
      toast.error("An error occurred while uploading files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </DialogTitle>
          <DialogDescription>
            Select files to upload to the selected folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="folder">Upload to Folder</Label>
            <Select
              value={selectedFolderId || ""}
              onValueChange={setSelectedFolderId}
              disabled={isUploading}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.path || `/${folder.nome}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Dropzone */}
          <div className="space-y-2">
            <Label>Files</Label>
            <Dropzone
              onDrop={handleDrop}
              accept={{
                "application/pdf": [".pdf"],
                "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
                "application/msword": [".doc"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                  [".docx"],
                "application/vnd.ms-excel": [".xls"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  [".xlsx"],
                "text/plain": [".txt"],
                "text/csv": [".csv"],
              }}
              maxSize={10 * 1024 * 1024} // 10MB
              maxFiles={10}
              disabled={isUploading}
            >
              <DropzoneContent>
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max 10 files, 10MB each
                  </p>
                </div>
              </DropzoneContent>
            </Dropzone>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {selectedFiles.map((fileData, index) => (
                  <FileItem
                    key={fileData.id}
                    fileData={fileData}
                    onUpdate={(updated) => handleUpdateFile(index, updated)}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading
              ? "Uploading..."
              : `Upload ${selectedFiles.length} file(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
