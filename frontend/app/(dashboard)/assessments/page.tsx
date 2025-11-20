"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Plus,
  Filter,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AssessmentCreateModal } from "@/components/assessments/assessment-create-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentApi } from "@/lib/api";
import type { AssessmentStatus, AssessmentType } from "@/types/assessment";
import { usePageHeader } from "@/contexts/page-header-context";

export default function AssessmentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "ALL">(
    "ALL",
  );
  const [typeFilter, setTypeFilter] = useState<AssessmentType | "ALL">("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { setPageHeader } = usePageHeader();

  const { data, isLoading } = useQuery({
    queryKey: ["assessments", page, statusFilter, typeFilter],
    queryFn: () =>
      assessmentApi.list({
        page,
        limit: 20,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
      }),
  });

  const getStatusColor = (status: AssessmentStatus) => {
    const colors = {
      PLANNED: "bg-blue-500/10 text-blue-500",
      IN_PROGRESS: "bg-yellow-500/10 text-yellow-500",
      COMPLETED: "bg-green-500/10 text-green-500",
      CANCELLED: "bg-gray-500/10 text-gray-500",
      ARCHIVED: "bg-purple-500/10 text-purple-500",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500";
  };

  const getTypeLabel = (type: AssessmentType) => {
    const labels = {
      INTERNAL_AUDIT: "Internal Audit",
      EXTERNAL_AUDIT: "External Audit",
      PENETRATION_TEST: "Penetration Test",
      VULNERABILITY_SCAN: "Vulnerability Scan",
      CODE_REVIEW: "Code Review",
      SECURITY_REVIEW: "Security Review",
      COMPLIANCE_AUDIT: "Compliance Audit",
      THIRD_PARTY_ASSESSMENT: "3rd Party Assessment",
    };
    return labels[type] || type;
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <ClipboardCheck className="h-5 w-5" />, []);
  const headerActions = useMemo(
    () => (
      <Button onClick={() => setCreateModalOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Assessment
      </Button>
    ),
    [setCreateModalOpen],
  );

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Assessments",
      "Manage security assessments and track findings",
      headerIcon,
      headerActions,
    );
  }, [setPageHeader, headerIcon, headerActions]);

  return (
    <div className="space-y-6 w-full">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as AssessmentStatus | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as AssessmentType | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INTERNAL_AUDIT">Internal Audit</SelectItem>
                  <SelectItem value="EXTERNAL_AUDIT">External Audit</SelectItem>
                  <SelectItem value="PENETRATION_TEST">
                    Penetration Test
                  </SelectItem>
                  <SelectItem value="VULNERABILITY_SCAN">
                    Vulnerability Scan
                  </SelectItem>
                  <SelectItem value="CODE_REVIEW">Code Review</SelectItem>
                  <SelectItem value="SECURITY_REVIEW">
                    Security Review
                  </SelectItem>
                  <SelectItem value="COMPLIANCE_AUDIT">
                    Compliance Audit
                  </SelectItem>
                  <SelectItem value="THIRD_PARTY_ASSESSMENT">
                    3rd Party Assessment
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      <div className="grid gap-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/assessments/${assessment.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {assessment.name}
                      </CardTitle>
                      <CardDescription className="mt-2 flex flex-wrap gap-2">
                        <Badge className={getStatusColor(assessment.status)}>
                          {assessment.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">
                          {getTypeLabel(assessment.assessment_type)}
                        </Badge>
                        {assessment.score !== null &&
                          assessment.score !== undefined && (
                            <Badge variant="secondary">
                              Score: {assessment.score}/100
                            </Badge>
                          )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {assessment.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {assessment.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{assessment.assessor_name}</span>
                        {assessment.assessor_organization && (
                          <span className="text-xs">
                            ({assessment.assessor_organization})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(assessment.start_date),
                            "MMM d, yyyy",
                          )}
                          {assessment.end_date &&
                            ` - ${format(new Date(assessment.end_date), "MMM d, yyyy")}`}
                        </span>
                      </div>
                    </div>
                    {(assessment.vulnerabilities || assessment.assets) && (
                      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                        {assessment.vulnerabilities && (
                          <span>
                            {assessment.vulnerabilities.length} Vulnerabilities
                          </span>
                        )}
                        {assessment.assets && (
                          <span>{assessment.assets.length} Assets</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No assessments found
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first assessment
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Assessment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {data.page} of {data.total_pages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      <AssessmentCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={(assessmentId) =>
          router.push(`/assessments/${assessmentId}`)
        }
      />
    </div>
  );
}
