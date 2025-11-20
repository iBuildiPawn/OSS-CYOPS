"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Trash2,
  Calendar,
  User,
  FileText,
  Target,
  Link as LinkIcon,
  Plus,
  X,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import {
  assessmentApi,
  vulnerabilityApi,
  assessmentReportApi,
} from "@/lib/api";
import { toast } from "sonner";
import type {
  UpdateAssessmentRequest,
  AssessmentType,
  AssessmentStatus,
} from "@/types/assessment";
import type { AssessmentReport } from "@/types/assessment-report";
import { AssessmentReportUploadDialog } from "@/components/assessments/assessment-report-upload-dialog";
import { AssessmentReportList } from "@/components/assessments/assessment-report-list";
import { AssessmentReportViewer } from "@/components/assessments/assessment-report-viewer";
import { AssessmentReportVersionHistory } from "@/components/assessments/assessment-report-version-history";
import { usePageHeader } from "@/contexts/page-header-context";

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLinkVulnDialog, setShowLinkVulnDialog] = useState(false);
  const [vulnSearch, setVulnSearch] = useState("");
  const { setPageHeader } = usePageHeader();

  // Report upload and viewing state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AssessmentReport | null>(
    null,
  );
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionHistoryReport, setVersionHistoryReport] =
    useState<AssessmentReport | null>(null);

  const assessmentId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => assessmentApi.get(assessmentId),
  });

  const assessment = data?.data;

  // Initialize form hook FIRST (before using reset in memoized values)
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<UpdateAssessmentRequest>({
    values: assessment
      ? {
          name: assessment.name,
          description: assessment.description,
          status: assessment.status,
          assessor_name: assessment.assessor_name,
          assessor_organization: assessment.assessor_organization,
          start_date: format(new Date(assessment.start_date), "yyyy-MM-dd"),
          end_date: assessment.end_date
            ? format(new Date(assessment.end_date), "yyyy-MM-dd")
            : undefined,
          report_url: assessment.report_url,
          executive_summary: assessment.executive_summary,
          findings_summary: assessment.findings_summary,
          recommendations: assessment.recommendations,
          score: assessment.score ?? undefined,
        }
      : undefined,
  });

  const status = watch("status");

  // Define mutations BEFORE memoized values that reference them
  const updateMutation = useMutation({
    mutationFn: (data: UpdateAssessmentRequest) =>
      assessmentApi.update(assessmentId, data),
    onSuccess: () => {
      toast.success("Assessment updated successfully");
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to update assessment");
      toast.error("Failed to update assessment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => assessmentApi.delete(assessmentId),
    onSuccess: () => {
      toast.success("Assessment deleted successfully");
      router.push("/assessments");
    },
    onError: (error: any) => {
      toast.error("Failed to delete assessment");
    },
  });

  // Memoize header elements (MUST be before any conditional returns)
  const headerIcon = useMemo(() => <Target className="h-5 w-5" />, []);
  const headerActions = useMemo(
    () => (
      <div className="flex gap-2">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} size="sm">
            Edit Assessment
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              reset();
            }}
          >
            Cancel
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this assessment? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    ),
    [isEditing, setIsEditing, reset, deleteMutation],
  );

  // Set page header with dynamic assessment name (MUST be before any conditional returns)
  useEffect(() => {
    if (assessment) {
      setPageHeader(
        assessment.name || "Assessment",
        `${getTypeLabel(assessment.assessment_type || "INTERNAL_AUDIT")} - ${assessment.status.replace("_", " ") || ""}`,
        headerIcon,
        headerActions,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assessment?.name,
    assessment?.status,
    assessment?.assessment_type,
    isEditing,
  ]);

  // Fetch vulnerabilities for linking
  const { data: vulnerabilitiesData } = useQuery({
    queryKey: ["vulnerabilities", vulnSearch],
    queryFn: () =>
      vulnerabilityApi.list({ page: 1, limit: 50, search: vulnSearch }),
    enabled: showLinkVulnDialog,
  });

  // Link vulnerability mutation
  const linkVulnMutation = useMutation({
    mutationFn: (vulnerabilityId: string) =>
      assessmentApi.linkVulnerability(assessmentId, {
        vulnerability_id: vulnerabilityId,
      }),
    onSuccess: () => {
      toast.success("Vulnerability linked successfully");
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
      setShowLinkVulnDialog(false);
      setVulnSearch("");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to link vulnerability",
      );
    },
  });

  // Unlink vulnerability mutation
  const unlinkVulnMutation = useMutation({
    mutationFn: (vulnerabilityId: string) =>
      assessmentApi.unlinkVulnerability(assessmentId, vulnerabilityId),
    onSuccess: () => {
      toast.success("Vulnerability unlinked successfully");
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
    },
    onError: (error: any) => {
      toast.error("Failed to unlink vulnerability");
    },
  });

  const onSubmit = (data: UpdateAssessmentRequest) => {
    setError(null);
    updateMutation.mutate(data);
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-6 w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Assessment not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const assessmentTypes: { value: AssessmentType; label: string }[] = [
    { value: "INTERNAL_AUDIT", label: "Internal Audit" },
    { value: "EXTERNAL_AUDIT", label: "External Audit" },
    { value: "PENETRATION_TEST", label: "Penetration Test" },
    { value: "VULNERABILITY_SCAN", label: "Vulnerability Scan" },
    { value: "CODE_REVIEW", label: "Code Review" },
    { value: "SECURITY_REVIEW", label: "Security Review" },
    { value: "COMPLIANCE_AUDIT", label: "Compliance Audit" },
    { value: "THIRD_PARTY_ASSESSMENT", label: "3rd Party Assessment" },
  ];

  const statusOptions: { value: AssessmentStatus; label: string }[] = [
    { value: "PLANNED", label: "Planned" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "ARCHIVED", label: "Archived" },
  ];

  return (
    <div className="space-y-6 w-full">
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="findings">
            Findings
            {assessment.vulnerabilities && (
              <Badge variant="secondary" className="ml-2">
                {assessment.vulnerabilities.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assets">
            Assets
            {assessment.assets && (
              <Badge variant="secondary" className="ml-2">
                {assessment.assets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assessment Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    rows={3}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assessment Type</Label>
                  <div className="text-sm text-muted-foreground">
                    {getTypeLabel(assessment.assessment_type)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setValue("status", value as AssessmentStatus)
                    }
                    disabled={!isEditing || updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assessor Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assessor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assessor_name">Assessor Name</Label>
                    <Input
                      id="assessor_name"
                      {...register("assessor_name")}
                      disabled={!isEditing || updateMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessor_organization">
                      Assessor Organization
                    </Label>
                    <Input
                      id="assessor_organization"
                      {...register("assessor_organization")}
                      disabled={!isEditing || updateMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Controller
                      name="start_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : "",
                            );
                          }}
                          disabled={!isEditing || updateMutation.isPending}
                          placeholder="Select start date"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Controller
                      name="end_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : undefined,
                            );
                          }}
                          disabled={!isEditing || updateMutation.isPending}
                          placeholder="Select end date"
                        />
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report & Findings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report & Findings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report_url">Report URL</Label>
                  <Input
                    id="report_url"
                    {...register("report_url")}
                    placeholder="https://"
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="executive_summary">Executive Summary</Label>
                  <Textarea
                    id="executive_summary"
                    {...register("executive_summary")}
                    rows={4}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="findings_summary">Findings Summary</Label>
                  <Textarea
                    id="findings_summary"
                    {...register("findings_summary")}
                    rows={4}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recommendations">Recommendations</Label>
                  <Textarea
                    id="recommendations"
                    {...register("recommendations")}
                    rows={4}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    {...register("score", {
                      valueAsNumber: true,
                    })}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {isEditing && (
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 md:flex-initial"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Linked Vulnerabilities</CardTitle>
                  <CardDescription>
                    Vulnerabilities associated with this assessment
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/vulnerabilities/new?assessment_id=${assessmentId}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Finding
                    </Link>
                  </Button>
                  <Dialog
                    open={showLinkVulnDialog}
                    onOpenChange={setShowLinkVulnDialog}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link Existing
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Link Vulnerability</DialogTitle>
                        <DialogDescription>
                          Search and select a vulnerability to link to this
                          assessment
                        </DialogDescription>
                      </DialogHeader>
                      <Command className="border rounded-lg">
                        <CommandInput
                          placeholder="Search vulnerabilities..."
                          value={vulnSearch}
                          onValueChange={setVulnSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No vulnerabilities found.</CommandEmpty>
                          <CommandGroup>
                            {vulnerabilitiesData?.data?.map((vuln) => {
                              const isLinked = assessment.vulnerabilities?.some(
                                (v) => v.id === vuln.id,
                              );
                              return (
                                <CommandItem
                                  key={vuln.id}
                                  disabled={
                                    isLinked || linkVulnMutation.isPending
                                  }
                                  onSelect={() => {
                                    if (!isLinked) {
                                      linkVulnMutation.mutate(vuln.id);
                                    }
                                  }}
                                >
                                  <div className="flex-1">
                                    <p className="font-medium">{vuln.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {vuln.severity} -{" "}
                                      {vuln.cve_id || "No CVE"}
                                    </p>
                                  </div>
                                  {isLinked && (
                                    <Badge variant="secondary">
                                      Already linked
                                    </Badge>
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {assessment.vulnerabilities &&
              assessment.vulnerabilities.length > 0 ? (
                <div className="space-y-2">
                  {assessment.vulnerabilities.map((vuln) => (
                    <div
                      key={vuln.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{vuln.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {vuln.severity} - {vuln.cve_id || "No CVE"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/vulnerabilities/${vuln.id}`}>
                          <Button variant="ghost" size="sm">
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkVulnMutation.mutate(vuln.id)}
                          disabled={unlinkVulnMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No vulnerabilities linked to this assessment
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Affected Assets</CardTitle>
              <CardDescription>
                Assets automatically extracted from linked vulnerabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessment.assets && assessment.assets.length > 0 ? (
                <div className="space-y-2">
                  {assessment.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{asset.hostname}</p>
                        <p className="text-sm text-muted-foreground">
                          {asset.ip_address || "No IP"} - {asset.system_type}
                        </p>
                      </div>
                      <Link href={`/assets/${asset.id}`}>
                        <Button variant="ghost" size="sm">
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No assets linked to this assessment
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assessment Reports</CardTitle>
                  <CardDescription>
                    Upload and manage PDF reports for this assessment
                  </CardDescription>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AssessmentReportList
                assessmentId={assessmentId}
                onViewReport={(report) => {
                  setSelectedReport(report);
                  setViewerOpen(true);
                }}
                onViewVersions={(report) => {
                  setVersionHistoryReport(report);
                  setVersionHistoryOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals and Dialogs */}
      <AssessmentReportUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        assessmentId={assessmentId}
      />

      {selectedReport && (
        <AssessmentReportViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          fileUrl={assessmentReportApi.getFileUrl(
            assessmentId,
            selectedReport.id,
          )}
          filename={selectedReport.original_name}
          onDownload={() => {
            assessmentReportApi.downloadFile(
              assessmentId,
              selectedReport.id,
              selectedReport.original_name,
            );
            toast.success("Download started");
          }}
        />
      )}

      {versionHistoryReport && (
        <AssessmentReportVersionHistory
          open={versionHistoryOpen}
          onOpenChange={setVersionHistoryOpen}
          assessmentId={assessmentId}
          report={versionHistoryReport}
          onViewVersion={(report) => {
            setSelectedReport(report);
            setViewerOpen(true);
          }}
        />
      )}
    </div>
  );
}
