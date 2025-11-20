"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Server,
  Network,
  Clock,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";
import { AuthenticatedImage } from "@/components/reports/authenticated-image";
import type {
  VulnerabilityFinding,
  VulnerabilityDetail,
} from "@/types/vulnerability";
import type { FindingAttachment } from "@/types/finding-attachment";

interface FindingDetailsSectionProps {
  finding: VulnerabilityFinding;
  vulnerability: VulnerabilityDetail;
}

export function FindingDetailsSection({
  finding,
  vulnerability,
}: FindingDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    findingId: string;
    attachmentId: string;
    description?: string;
  } | null>(null);

  // Fetch finding attachments
  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ["finding-attachments", finding.id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ data: FindingAttachment[] }>(
          `/vulnerabilities/findings/${finding.id}/attachments`,
        );
        return response.data;
      } catch (error: any) {
        // If 404, return empty array (no attachments)
        if (error?.statusCode === 404 || error?.response?.status === 404) {
          return { data: [] };
        }
        throw error;
      }
    },
    enabled: isExpanded,
    retry: false, // Don't retry 404 errors
    meta: {
      // Suppress error logging for expected 404s
      suppressErrorToast: true,
    },
  });

  const attachments = attachmentsData?.data || [];
  const proofImages = attachments.filter(
    (att) =>
      att.is_image &&
      (att.attachment_type === "PROOF" ||
        att.attachment_type === "REMEDIATION" ||
        att.attachment_type === "VERIFICATION"),
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-red-500/10 text-red-500 border-red-500/20",
      MITIGATED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      FIXED: "bg-green-500/10 text-green-500 border-green-500/20",
      VERIFIED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      ACCEPTED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertCircle className="h-4 w-4" />;
      case "MITIGATED":
      case "FIXED":
        return <CheckCircle className="h-4 w-4" />;
      case "VERIFIED":
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };


  return (
    <>
      <Card className="border-l-4">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mt-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    {finding.affected_system?.hostname ||
                      finding.affected_system?.name ||
                      "Unknown System"}
                  </span>
                  {finding.affected_system?.ip_address && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {finding.affected_system.ip_address}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  {finding.port && (
                    <span className="flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      Port: {finding.port}/{finding.protocol || "tcp"}
                    </span>
                  )}
                  {finding.service_name && (
                    <span>Service: {finding.service_name}</span>
                  )}
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(finding.status)} flex items-center gap-1 text-xs`}
                  >
                    {getStatusIcon(finding.status)}
                    {finding.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-4">
            {/* Finding Details */}
            <div className="grid gap-4 text-sm">
              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    First Detected
                  </p>
                  <p className="font-mono text-xs">
                    {format(new Date(finding.first_detected), "PPP p")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Last Seen
                  </p>
                  <p className="font-mono text-xs">
                    {format(new Date(finding.last_seen), "PPP p")}
                  </p>
                </div>
              </div>

              {/* Scanner Info */}
              {finding.scanner_name && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Scanner
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{finding.scanner_name}</Badge>
                    {finding.plugin_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Plugin: {finding.plugin_id}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Plugin Output */}
              {finding.plugin_output && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Scanner Output
                  </p>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                        {finding.plugin_output}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Remediation Details */}
              {(finding.status === "FIXED" ||
                finding.status === "VERIFIED" ||
                finding.fix_notes) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Remediation Details
                  </p>

                  <div className="grid gap-2">
                    {finding.fixed_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Fixed on:</span>
                        <span className="font-mono">
                          {format(new Date(finding.fixed_at), "PPP p")}
                        </span>
                      </div>
                    )}

                    {finding.verified_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          Verified on:
                        </span>
                        <span className="font-mono">
                          {format(new Date(finding.verified_at), "PPP p")}
                        </span>
                      </div>
                    )}

                    {finding.fix_notes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Fix Notes
                        </p>
                        <Card className="bg-muted/50">
                          <CardContent className="p-3">
                            <p className="text-xs whitespace-pre-wrap">
                              {finding.fix_notes}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proof Images */}
              {attachmentsLoading ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    Loading attachments...
                  </p>
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : proofImages.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Proof Images ({proofImages.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {proofImages.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="relative group cursor-pointer"
                        onClick={() =>
                          setSelectedImage({
                            findingId: finding.id,
                            attachmentId: attachment.id,
                            description:
                              attachment.description || attachment.original_name,
                          })
                        }
                      >
                        <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                          <AuthenticatedImage
                            findingId={finding.id}
                            attachmentId={attachment.id}
                            alt={
                              attachment.description || attachment.original_name
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            {attachment.attachment_type}
                          </Badge>
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {attachment.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                finding.status !== "OPEN" && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    No proof images attached
                  </div>
                )
              )}

              {/* Risk Acceptance */}
              {finding.status === "RISK_ACCEPTED" && finding.acceptance_reason && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Risk Accepted
                  </p>
                  <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardContent className="p-3">
                      <p className="text-xs whitespace-pre-wrap">
                        {finding.acceptance_reason}
                      </p>
                      {finding.expires_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expires: {format(new Date(finding.expires_at), "PPP")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedImage?.description || "Proof Image"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[70vh] bg-muted rounded-lg overflow-hidden">
            {selectedImage && (
              <AuthenticatedImage
                findingId={selectedImage.findingId}
                attachmentId={selectedImage.attachmentId}
                alt={selectedImage.description || "Proof"}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
