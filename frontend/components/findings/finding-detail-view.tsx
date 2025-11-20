"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Server,
  Calendar,
  User,
  FileText,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";
import { AttachmentUpload } from "./attachment-upload";
import { AttachmentGallery } from "./attachment-gallery";
import { AttachmentViewer } from "./attachment-viewer";
import {
  FINDING_STATUS_CONFIG,
  type VulnerabilityFinding,
} from "@/types/vulnerability";
import type {
  FindingAttachment,
  AttachmentType,
} from "@/types/finding-attachment";

interface FindingDetailViewProps {
  finding: VulnerabilityFinding;
  isOpen: boolean;
  onClose: () => void;
  canUpload?: boolean;
}

export function FindingDetailView({
  finding,
  isOpen,
  onClose,
  canUpload = true,
}: FindingDetailViewProps) {
  const [attachments, setAttachments] = useState<FindingAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<FindingAttachment | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Fetch attachments when dialog opens
  useEffect(() => {
    if (isOpen && finding.id) {
      fetchAttachments();
    }
  }, [isOpen, finding.id]);

  const fetchAttachments = async () => {
    setIsLoadingAttachments(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/vulnerabilities/findings/${finding.id}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch attachments");

      const data = await response.json();
      setAttachments(data.data || []);
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
      toast.error("Failed to load attachments");
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleUpload = async (
    file: File,
    attachmentType: AttachmentType,
    description: string,
  ) => {
    setIsUploading(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("attachment_type", attachmentType);
      if (description) {
        formData.append("description", description);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/vulnerabilities/findings/${finding.id}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      toast.success("File uploaded successfully");

      // Refresh attachments list
      await fetchAttachments();
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/vulnerabilities/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to delete attachment");

      toast.success("Attachment deleted");
      await fetchAttachments();
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      toast.error("Failed to delete attachment");
    }
  };

  const handleView = (attachment: FindingAttachment) => {
    setSelectedAttachment(attachment);
    setViewerOpen(true);
  };

  const statusConfig = FINDING_STATUS_CONFIG[finding.status];
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-[90vw] sm:!max-w-[80vw] md:!max-w-[70vw] lg:!max-w-[60vw] xl:!max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Finding Details
            </DialogTitle>
            <DialogDescription>
              {finding.affected_system?.hostname || "Unknown System"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status and Metadata */}
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  statusConfig.color === "green"
                    ? "default"
                    : statusConfig.color === "red"
                      ? "destructive"
                      : "secondary"
                }
                className="flex items-center gap-1"
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(finding.first_detected), "MMM dd, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Hostname:</span>
                    <div className="font-medium">
                      {finding.affected_system?.hostname || "N/A"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">IP Address:</span>
                    <div className="font-medium">
                      {finding.affected_system?.ip_address || "N/A"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Port/Protocol:</span>
                    <div className="font-medium">
                      {finding.port}/{finding.protocol}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <div className="font-medium">{finding.service_name}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plugin Details */}
            {finding.plugin_output && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Plugin Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {finding.plugin_output}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Proof of Remediation Section */}
            {attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Proof of Remediation ({attachments.length})
                  </CardTitle>
                  <CardDescription>
                    Evidence demonstrating that the vulnerability has been fixed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAttachments ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading proof of remediation...
                    </div>
                  ) : canUpload ? (
                    <Tabs defaultValue="evidence" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="evidence">
                          Evidence ({attachments.length})
                        </TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                      </TabsList>

                      <TabsContent value="evidence" className="mt-4">
                        <AttachmentGallery
                          attachments={attachments}
                          onView={undefined}
                          onDelete={handleDelete}
                          canDelete={true}
                        />
                      </TabsContent>

                      <TabsContent value="upload" className="mt-4">
                        <AttachmentUpload
                          onUpload={handleUpload}
                          isUploading={isUploading}
                          defaultAttachmentType={
                            finding.status === "OPEN"
                              ? "PROOF"
                              : finding.status === "FIXED"
                                ? "REMEDIATION"
                                : "VERIFICATION"
                          }
                          multiple={true}
                        />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <AttachmentGallery
                      attachments={attachments}
                      onView={undefined}
                      onDelete={undefined}
                      canDelete={false}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Finding Status Information */}
            {(finding.fixed_at ||
              finding.verified_at ||
              finding.risk_accepted_at) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {finding.fixed_at && (
                      <div className="text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Fixed
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(finding.fixed_at),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </span>
                        </div>
                        {finding.fix_notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {finding.fix_notes}
                          </p>
                        )}
                      </div>
                    )}
                    {finding.verified_at && (
                      <div className="text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(finding.verified_at),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    {finding.risk_accepted_at && (
                      <div className="text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Risk Accepted
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(finding.risk_accepted_at),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </span>
                        </div>
                        {finding.acceptance_reason && (
                          <p className="text-xs text-gray-600 mt-1">
                            {finding.acceptance_reason}
                          </p>
                        )}
                        {finding.expires_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Expires:{" "}
                            {format(
                              new Date(finding.expires_at),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer */}
      <AttachmentViewer
        attachment={selectedAttachment}
        attachments={attachments}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedAttachment(null);
        }}
        onNavigate={setSelectedAttachment}
      />
    </>
  );
}
