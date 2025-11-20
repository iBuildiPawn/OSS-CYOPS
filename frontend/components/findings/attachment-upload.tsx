"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon, ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AttachmentType,
  ATTACHMENT_TYPE_LABELS,
  ATTACHMENT_TYPE_DESCRIPTIONS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ACCEPTED_FILE_TYPES,
  formatFileSize,
} from "@/types/finding-attachment";

interface AttachmentUploadProps {
  onUpload: (
    file: File,
    attachmentType: AttachmentType,
    description: string,
  ) => Promise<void>;
  isUploading?: boolean;
  defaultAttachmentType?: AttachmentType;
  multiple?: boolean;
}

interface PendingFile {
  file: File;
  preview?: string;
  attachmentType: AttachmentType;
  description: string;
}

export function AttachmentUpload({
  onUpload,
  isUploading = false,
  defaultAttachmentType = "PROOF",
  multiple = true,
}: AttachmentUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map((e: any) => {
            if (e.code === "file-too-large") {
              return `${file.name}: File is too large (max ${MAX_FILE_SIZE_MB}MB)`;
            }
            if (e.code === "file-invalid-type") {
              return `${file.name}: Invalid file type`;
            }
            return `${file.name}: ${e.message}`;
          });
          return errorMessages.join(", ");
        });
        setError(errors.join("; "));
        return;
      }

      // Add accepted files to pending list
      const newFiles: PendingFile[] = acceptedFiles.map((file) => {
        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        return {
          file,
          preview,
          attachmentType: defaultAttachmentType,
          description: "",
        };
      });

      setPendingFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
    },
    [defaultAttachmentType, multiple],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {},
    ),
    maxSize: MAX_FILE_SIZE,
    multiple,
  });

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      // Revoke preview URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFile = (index: number, updates: Partial<PendingFile>) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], ...updates };
      return newFiles;
    });
  };

  const handleUploadAll = async () => {
    setError(null);

    for (const pendingFile of pendingFiles) {
      try {
        await onUpload(
          pendingFile.file,
          pendingFile.attachmentType,
          pendingFile.description,
        );
      } catch (err: any) {
        setError(err.message || "Failed to upload file");
        return;
      }
    }

    // Clear pending files after successful upload
    pendingFiles.forEach((pf) => {
      if (pf.preview) {
        URL.revokeObjectURL(pf.preview);
      }
    });
    setPendingFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-10 w-10 text-gray-400" />
          {isDragActive ? (
            <p className="text-sm text-blue-600 font-medium">
              Drop the files here...
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-xs text-gray-500">
                Images, PDFs, and documents up to {MAX_FILE_SIZE_MB}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Files to Upload ({pendingFiles.length})
            </h3>
            <Button onClick={handleUploadAll} disabled={isUploading} size="sm">
              {isUploading ? "Uploading..." : "Upload All"}
            </Button>
          </div>

          <div className="space-y-3">
            {pendingFiles.map((pendingFile, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-white"
              >
                <div className="flex items-start space-x-3">
                  {/* Preview or Icon */}
                  <div className="flex-shrink-0">
                    {pendingFile.preview ? (
                      <img
                        src={pendingFile.preview}
                        alt={pendingFile.file.name}
                        className="h-16 w-16 object-cover rounded"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <FileIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pendingFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(pendingFile.file.size)}
                      {pendingFile.file.type && ` • ${pendingFile.file.type}`}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Attachment Type */}
                <div className="space-y-2">
                  <Label htmlFor={`type-${index}`}>Attachment Type</Label>
                  <Select
                    value={pendingFile.attachmentType}
                    onValueChange={(value) =>
                      updateFile(index, {
                        attachmentType: value as AttachmentType,
                      })
                    }
                    disabled={isUploading}
                  >
                    <SelectTrigger id={`type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ATTACHMENT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div>
                              <div className="font-medium">{label}</div>
                              <div className="text-xs text-gray-500">
                                {
                                  ATTACHMENT_TYPE_DESCRIPTIONS[
                                    value as AttachmentType
                                  ]
                                }
                              </div>
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor={`desc-${index}`}>
                    Description (Optional)
                  </Label>
                  <Textarea
                    id={`desc-${index}`}
                    value={pendingFile.description}
                    onChange={(e) =>
                      updateFile(index, { description: e.target.value })
                    }
                    placeholder="Add a description for this file..."
                    rows={2}
                    disabled={isUploading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
