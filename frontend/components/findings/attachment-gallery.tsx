"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  Eye,
  FileIcon,
  ImageIcon,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FindingAttachment,
  AttachmentType,
  ATTACHMENT_TYPE_LABELS,
  formatFileSize,
  getAttachmentFileUrl,
  getAttachmentDownloadUrl,
} from "@/types/finding-attachment";

interface AttachmentGalleryProps {
  attachments: FindingAttachment[];
  onDelete?: (attachmentId: string) => Promise<void>;
  onView?: (attachment: FindingAttachment) => void;
  canDelete?: boolean;
}

export function AttachmentGallery({
  attachments,
  onDelete,
  onView,
  canDelete = false,
}: AttachmentGalleryProps) {
  const [filter, setFilter] = useState<AttachmentType | "ALL">("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAttachments =
    filter === "ALL"
      ? attachments
      : attachments.filter((a) => a.attachment_type === filter);

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (attachment: FindingAttachment) => {
    try {
      const url = getAttachmentDownloadUrl(attachment.id);
      const token = getAuthToken();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          No attachments
        </h3>
        <p className="text-sm text-gray-500">
          Upload screenshots or files to document this finding
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Evidence & Documentation
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {filteredAttachments.length} attachment
            {filteredAttachments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">
              All Types ({attachments.length})
            </SelectItem>
            {Object.entries(ATTACHMENT_TYPE_LABELS).map(([value, label]) => {
              const count = attachments.filter(
                (a) => a.attachment_type === value,
              ).length;
              return (
                <SelectItem key={value} value={value}>
                  {label} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Report-style Evidence List */}
      <div className="space-y-6">
        {filteredAttachments.map((attachment, index) => (
          <AttachmentCard
            key={attachment.id}
            attachment={attachment}
            index={index + 1}
            onView={onView}
            onDownload={handleDownload}
            onDelete={canDelete ? () => setDeleteId(attachment.id) : undefined}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AttachmentCardProps {
  attachment: FindingAttachment;
  index: number;
  onView?: (attachment: FindingAttachment) => void;
  onDownload: (attachment: FindingAttachment) => void;
  onDelete?: () => void;
}

function AttachmentCard({
  attachment,
  index,
  onView,
  onDownload,
  onDelete,
}: AttachmentCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const typeColors: Record<AttachmentType, string> = {
    PROOF: "text-orange-600", // Original vulnerability evidence
    REMEDIATION: "text-green-600", // Fix applied
    VERIFICATION: "text-blue-600", // Testing results
    OTHER: "text-gray-600",
  };

  // Load image with authentication
  useEffect(() => {
    if (!attachment.is_image) return;

    const loadImage = async () => {
      try {
        setImageLoading(true);
        const url = getAttachmentFileUrl(attachment.id, false); // Full size for report
        const token = getAuthToken();

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to load image");

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setImageError(false);
      } catch (error) {
        console.error("Failed to load image:", error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [attachment.id, attachment.is_image]);

  return (
    <div className="space-y-3 border-l-2 border-gray-200 pl-4">
      {/* Evidence Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">#{index}</span>
            <h4
              className={`text-sm font-semibold ${typeColors[attachment.attachment_type]}`}
            >
              {ATTACHMENT_TYPE_LABELS[attachment.attachment_type]}
            </h4>
          </div>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Description */}
      {attachment.description && (
        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
          <p className="italic">{attachment.description}</p>
        </div>
      )}

      {/* Image/File Display */}
      {attachment.is_image ? (
        <div className="space-y-2">
          {imageLoading ? (
            <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
              <div className="text-sm text-gray-400">Loading image...</div>
            </div>
          ) : imageError || !imageUrl ? (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-50 rounded border border-gray-200">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Failed to load image</p>
            </div>
          ) : (
            <div className="rounded border border-gray-300 overflow-hidden bg-white">
              <img
                src={imageUrl}
                alt={attachment.original_name}
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>
          )}
          <p className="text-xs text-center text-gray-500 italic">
            Figure {index}: {attachment.description || attachment.original_name}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded border border-gray-200">
          <FileIcon className="h-8 w-8 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {attachment.original_name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(attachment)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Metadata Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {attachment.uploaded_by_user && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{attachment.uploaded_by_user.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {attachment.is_image && attachment.width && attachment.height && (
          <span className="text-gray-400">
            {attachment.width}×{attachment.height}px
          </span>
        )}
      </div>
    </div>
  );
}
