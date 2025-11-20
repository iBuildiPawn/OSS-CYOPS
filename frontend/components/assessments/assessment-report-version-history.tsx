"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  History,
  Eye,
  Download,
  FileText,
  User,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentReportApi } from "@/lib/api";
import { toast } from "sonner";
import type { AssessmentReport } from "@/types/assessment-report";

interface AssessmentReportVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  report: AssessmentReport | null;
  onViewVersion: (report: AssessmentReport) => void;
}

export function AssessmentReportVersionHistory({
  open,
  onOpenChange,
  assessmentId,
  report,
  onViewVersion,
}: AssessmentReportVersionHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId, "report", report?.id, "versions"],
    queryFn: () =>
      report ? assessmentReportApi.getVersions(assessmentId, report.id) : null,
    enabled: open && !!report,
  });

  const handleDownload = (versionReport: AssessmentReport) => {
    assessmentReportApi.downloadFile(
      assessmentId,
      versionReport.id,
      versionReport.original_name,
    );
    toast.success("Download started");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            {report && `All versions of "${report.title}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-6 w-1/4 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : data?.data && data.data.length > 0 ? (
            <div className="space-y-3">
              {data.data.map((version, index) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_latest ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          Version {version.version}
                        </h4>
                        {version.is_latest && (
                          <Badge className="bg-primary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Latest
                          </Badge>
                        )}
                      </div>

                      {version.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {version.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{version.original_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{formatFileSize(version.file_size)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>
                            {version.uploaded_by_user?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(
                              new Date(version.created_at),
                              "MMM d, yyyy h:mm a",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onViewVersion(version);
                          onOpenChange(false);
                        }}
                        title="View this version"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(version)}
                        title="Download this version"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No version history available
            </div>
          )}
        </div>

        {data?.meta && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            Total versions: {data.meta.count}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
