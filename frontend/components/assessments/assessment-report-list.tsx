"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  History,
  User,
  Calendar,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentReportApi } from "@/lib/api";
import { toast } from "sonner";
import type { AssessmentReport } from "@/types/assessment-report";

interface AssessmentReportListProps {
  assessmentId: string;
  onViewReport: (report: AssessmentReport) => void;
  onViewVersions: (report: AssessmentReport) => void;
}

export function AssessmentReportList({
  assessmentId,
  onViewReport,
  onViewVersions,
}: AssessmentReportListProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<AssessmentReport | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId, "reports"],
    queryFn: () => assessmentReportApi.list(assessmentId, false),
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) =>
      assessmentReportApi.delete(assessmentId, reportId),
    onSuccess: () => {
      toast.success("Report deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["assessment", assessmentId, "reports"],
      });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete report");
    },
  });

  const handleDelete = (report: AssessmentReport) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteMutation.mutate(reportToDelete.id);
    }
  };

  const handleDownload = (report: AssessmentReport) => {
    assessmentReportApi.downloadFile(
      assessmentId,
      report.id,
      report.original_name,
    );
    toast.success("Download started");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const reports = data?.data || [];

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports uploaded</h3>
          <p className="text-muted-foreground text-center">
            Upload your first PDF report to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="hover:bg-accent/50 transition-colors"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-500" />
                    {report.title}
                    {report.version > 1 && (
                      <Badge variant="secondary" className="ml-2">
                        v{report.version}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {report.description || "No description provided"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewReport(report)}
                    title="View PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(report)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {report.version > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewVersions(report)}
                      title="Version History"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(report)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileDown className="h-4 w-4" />
                  <span>{report.original_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{formatFileSize(report.file_size)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{report.uploaded_by_user?.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reportToDelete?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
