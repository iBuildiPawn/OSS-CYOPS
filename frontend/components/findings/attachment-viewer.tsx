"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import { getAuthToken } from "@/lib/api";
import {
  FindingAttachment,
  AttachmentType,
  ATTACHMENT_TYPE_LABELS,
  formatFileSize,
  getAttachmentFileUrl,
  getAttachmentDownloadUrl,
} from "@/types/finding-attachment";

interface AttachmentViewerProps {
  attachment: FindingAttachment | null;
  attachments?: FindingAttachment[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (attachment: FindingAttachment) => void;
}

export function AttachmentViewer({
  attachment,
  attachments = [],
  isOpen,
  onClose,
  onNavigate,
}: AttachmentViewerProps) {
  if (!attachment) return null;

  const currentIndex = attachments.findIndex((a) => a.id === attachment.id);
  const hasNavigation = attachments.length > 1 && currentIndex !== -1;

  const handlePrevious = () => {
    if (!hasNavigation || !onNavigate) return;
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
    onNavigate(attachments[prevIndex]);
  };

  const handleNext = () => {
    if (!hasNavigation || !onNavigate) return;
    const nextIndex =
      currentIndex < attachments.length - 1 ? currentIndex + 1 : 0;
    onNavigate(attachments[nextIndex]);
  };

  const handleDownload = async () => {
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

  const typeColors: Record<AttachmentType, string> = {
    PROOF: "bg-red-100 text-red-800",
    REMEDIATION: "bg-green-100 text-green-800",
    VERIFICATION: "bg-blue-100 text-blue-800",
    OTHER: "bg-gray-100 text-gray-800",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {attachment.original_name}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={typeColors[attachment.attachment_type]}>
                  {ATTACHMENT_TYPE_LABELS[attachment.attachment_type]}
                </Badge>
                <span className="text-sm text-gray-500">
                  {formatFileSize(attachment.file_size)}
                </span>
                {attachment.is_image &&
                  attachment.width &&
                  attachment.height && (
                    <span className="text-sm text-gray-500">
                      {attachment.width} × {attachment.height}
                    </span>
                  )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="relative flex-1 overflow-auto bg-gray-50">
          {/* Navigation Arrows */}
          {hasNavigation && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image or File Preview */}
          <div className="flex items-center justify-center min-h-[400px] p-8">
            {attachment.is_image ? (
              <img
                src={getAttachmentFileUrl(attachment.id, false)}
                alt={attachment.original_name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-200 rounded-full mb-4">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Preview not available for this file type
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {attachment.mime_type}
                </p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>

          {/* Counter */}
          {hasNavigation && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {attachments.length}
            </div>
          )}
        </div>

        {/* Footer with Metadata */}
        <div className="px-6 py-4 border-t bg-white space-y-3">
          {attachment.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Description
              </h4>
              <p className="text-sm text-gray-600">{attachment.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              {attachment.uploaded_by_user && (
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Uploaded by {attachment.uploaded_by_user.name}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(attachment.created_at).toLocaleString()}</span>
              </div>
            </div>

            {attachment.normalized && (
              <Badge variant="secondary" className="text-xs">
                Normalized for Reporting
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
