"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  FileText,
  Plus,
  Search,
  Server,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusHistoryTimeline } from "@/components/vulnerabilities/status-history-timeline";
import { VulnerabilitySeverityBadge } from "@/components/vulnerabilities/vulnerability-severity-badge";
import { VulnerabilityDetailSkeleton } from "@/components/vulnerabilities/vulnerability-skeletons";
import { VulnerabilityStatusBadge } from "@/components/vulnerabilities/vulnerability-status-badge";
import { VulnerabilityFindingsList } from "@/components/vulnerabilities/vulnerability-findings-list";
import {
  useAddAffectedSystemsToVulnerability,
  useAffectedSystems,
  useRemoveAffectedSystemFromVulnerability,
  useVulnerabilityAffectedSystems,
} from "@/hooks/use-affected-systems";
import {
  useAssignVulnerability,
  useDeleteVulnerability,
  useUpdateVulnerabilityStatus,
  useVulnerability,
} from "@/hooks/use-vulnerabilities";
import { adminApi } from "@/lib/api";
import { useVulnerabilityFindingsByVulnerability } from "@/hooks/use-vulnerability-findings";
import type {
  AffectedSystem,
  UpdateStatusRequest,
  VulnerabilityStatus,
} from "@/types/vulnerability";
import {
  isValidStatusTransition,
  STATUS_TRANSITIONS,
} from "@/types/vulnerability";

interface Props {
  params: Promise<{ id: string }>;
}

// Helper function to safely format dates
function formatDate(
  dateString: string,
  formatFn: (date: Date) => string,
): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return formatFn(date);
  } catch {
    return dateString;
  }
}

export default function VulnerabilityDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useVulnerability(id);
  const updateStatusMutation = useUpdateVulnerabilityStatus(id);
  const assignMutation = useAssignVulnerability(id);
  const deleteMutation = useDeleteVulnerability();

  // Affected systems hooks
  const { data: affectedSystemsData, isLoading: isLoadingAffectedSystems } =
    useVulnerabilityAffectedSystems(id);
  const { data: allSystemsData } = useAffectedSystems({ limit: 1000 }); // Fetch more systems
  const addAffectedSystemsMutation = useAddAffectedSystemsToVulnerability(id);
  const removeAffectedSystemMutation =
    useRemoveAffectedSystemFromVulnerability(id);

  // Findings hooks
  const {
    data: findingsData,
    isLoading: isLoadingFindings,
    refetch: refetchFindings,
  } = useVulnerabilityFindingsByVulnerability(id);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    VulnerabilityStatus | ""
  >("");
  const [statusNotes, setStatusNotes] = useState("");

  // Affected systems dialog state
  const [systemsDialogOpen, setSystemsDialogOpen] = useState(false);
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [systemSearchQuery, setSystemSearchQuery] = useState("");

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);

  const vulnerability = data?.data;
  const affectedSystems = affectedSystemsData?.data || [];
  const allSystems = allSystemsData?.data || [];

  // Filter out already associated systems and apply search
  const availableSystems = allSystems
    .filter((system) => !affectedSystems.some((as) => as.id === system.id))
    .filter((system) => {
      if (!systemSearchQuery.trim()) return true;
      const query = systemSearchQuery.toLowerCase();
      return (
        system.name?.toLowerCase().includes(query) ||
        system.hostname?.toLowerCase().includes(query) ||
        system.ip_address?.toLowerCase().includes(query) ||
        system.type?.toLowerCase().includes(query) ||
        system.environment?.toLowerCase().includes(query)
      );
    });

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !vulnerability) return;

    try {
      const updateData: UpdateStatusRequest = {
        status: selectedStatus as VulnerabilityStatus,
        notes: statusNotes || undefined,
      };

      await updateStatusMutation.mutateAsync(updateData);

      toast.success("Status updated successfully", {
        description: `Vulnerability status changed to ${selectedStatus}`,
      });

      setStatusDialogOpen(false);
      setSelectedStatus("");
      setStatusNotes("");
    } catch (err) {
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);

      toast.success("Vulnerability deleted", {
        description: "The vulnerability has been removed from the system.",
      });

      router.push("/vulnerabilities");
    } catch (err) {
      toast.error("Failed to delete vulnerability", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleAddAffectedSystems = async () => {
    if (selectedSystemIds.length === 0) return;

    try {
      await addAffectedSystemsMutation.mutateAsync({
        system_ids: selectedSystemIds,
      });

      toast.success("Systems added", {
        description: `${selectedSystemIds.length} system(s) added to vulnerability`,
      });

      setSystemsDialogOpen(false);
      setSelectedSystemIds([]);
      setSystemSearchQuery("");
    } catch (err) {
      toast.error("Failed to add systems", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const toggleSystemSelection = (systemId: string) => {
    setSelectedSystemIds((prev) =>
      prev.includes(systemId)
        ? prev.filter((id) => id !== systemId)
        : [...prev, systemId],
    );
  };

  const handleRemoveAffectedSystem = async (systemId: string) => {
    try {
      await removeAffectedSystemMutation.mutateAsync(systemId);

      toast.success("System removed", {
        description: "System has been removed from this vulnerability",
      });
    } catch (err) {
      toast.error("Failed to remove system", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Fetch users when assignment dialog opens
  const handleOpenAssignDialog = async () => {
    setAssignDialogOpen(true);
    try {
      const response = await adminApi.listUsers({ per_page: 100 });
      setUsers(response.users || []);
      // Pre-select current assignee if exists
      if (vulnerability?.assigned_to_id) {
        setSelectedUserId(vulnerability.assigned_to_id);
      }
    } catch (err) {
      toast.error("Failed to load users", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;

    try {
      await assignMutation.mutateAsync({
        assigned_to_id: selectedUserId === "unassign" ? null : selectedUserId,
      });

      toast.success("Vulnerability assigned", {
        description:
          selectedUserId === "unassign"
            ? "Vulnerability has been unassigned"
            : "Vulnerability has been assigned successfully",
      });

      setAssignDialogOpen(false);
      setSelectedUserId("");
    } catch (err) {
      toast.error("Failed to assign vulnerability", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Get valid status transitions for current status
  const validTransitions = vulnerability
    ? STATUS_TRANSITIONS[vulnerability.status] || []
    : [];

  if (isLoading) {
    return <VulnerabilityDetailSkeleton />;
  }

  if (error || !vulnerability) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error?.message || "Vulnerability not found"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vulnerabilities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <Shield className="h-6 w-6 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {vulnerability.title}
                </h1>
                {vulnerability.cve_id && (
                  <p className="text-muted-foreground mt-1">
                    {vulnerability.cve_id}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <VulnerabilitySeverityBadge severity={vulnerability.severity} />
              <VulnerabilityStatusBadge status={vulnerability.status} />
              {vulnerability.cvss_score && (
                <Badge variant="outline">
                  CVSS: {vulnerability.cvss_score.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vulnerabilities/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>

          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={validTransitions.length === 0}>
                <Clock className="h-4 w-4 mr-2" />
                Update Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Vulnerability Status</DialogTitle>
                <DialogDescription>
                  Change the status of this vulnerability and add notes about
                  the update.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value) =>
                      setSelectedStatus(value as VulnerabilityStatus)
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {validTransitions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add notes about this status change..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStatusDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending
                    ? "Updating..."
                    : "Update Status"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenAssignDialog}
              >
                <User className="h-4 w-4 mr-2" />
                Assign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Vulnerability</DialogTitle>
                <DialogDescription>
                  Assign this vulnerability to a user for tracking and
                  resolution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassign">
                        <span className="text-muted-foreground">Unassign</span>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name || user.email}</span>
                            {user.role && (
                              <Badge variant="outline" className="text-xs">
                                {user.role.name}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false);
                    setSelectedUserId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedUserId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this vulnerability record. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {vulnerability.description}
              </p>
            </CardContent>
          </Card>

          {/* Impact Assessment */}
          {vulnerability.impact_assessment && (
            <Card>
              <CardHeader>
                <CardTitle>Impact Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {vulnerability.impact_assessment}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Steps to Reproduce */}
          {vulnerability.steps_to_reproduce && (
            <Card>
              <CardHeader>
                <CardTitle>Steps to Reproduce</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap font-mono">
                  {vulnerability.steps_to_reproduce}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Mitigation Recommendations */}
          {vulnerability.mitigation_recommendations && (
            <Card>
              <CardHeader>
                <CardTitle>Mitigation Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {vulnerability.mitigation_recommendations}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Remediation Notes */}
          {vulnerability.remediation_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Remediation Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {vulnerability.remediation_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Affected Systems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Affected Systems
                  </CardTitle>
                  <CardDescription>
                    Systems and assets affected by this vulnerability
                  </CardDescription>
                </div>
                <Dialog
                  open={systemsDialogOpen}
                  onOpenChange={(open) => {
                    setSystemsDialogOpen(open);
                    if (!open) {
                      setSelectedSystemIds([]);
                      setSystemSearchQuery("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Systems
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Affected Systems</DialogTitle>
                      <DialogDescription>
                        Select systems to associate with this vulnerability
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, hostname, IP, type, or environment..."
                          value={systemSearchQuery}
                          onChange={(e) => setSystemSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {/* Results Count */}
                      {systemSearchQuery && (
                        <p className="text-xs text-muted-foreground">
                          Found {availableSystems.length} system(s)
                        </p>
                      )}

                      {/* Systems List */}
                      {availableSystems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {systemSearchQuery
                            ? "No systems match your search criteria."
                            : "No available systems to add. All systems are already associated with this vulnerability."}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {availableSystems.map((system) => (
                            <div
                              key={system.id}
                              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                              onClick={() => toggleSystemSelection(system.id)}
                            >
                              <Checkbox
                                checked={selectedSystemIds.includes(system.id)}
                                onCheckedChange={() =>
                                  toggleSystemSelection(system.id)
                                }
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">
                                    {system.name}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {system.type}
                                  </Badge>
                                  {system.environment && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {system.environment}
                                    </Badge>
                                  )}
                                </div>
                                {(system.hostname || system.ip_address) && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {[system.hostname, system.ip_address]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSystemsDialogOpen(false);
                          setSelectedSystemIds([]);
                          setSystemSearchQuery("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddAffectedSystems}
                        disabled={
                          selectedSystemIds.length === 0 ||
                          addAffectedSystemsMutation.isPending
                        }
                      >
                        {addAffectedSystemsMutation.isPending
                          ? "Adding..."
                          : `Add ${selectedSystemIds.length} System${selectedSystemIds.length !== 1 ? "s" : ""}`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAffectedSystems ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : affectedSystems.length > 0 ? (
                <div className="space-y-3">
                  {affectedSystems.map((system) => (
                    <div
                      key={system.id}
                      className="flex items-start justify-between p-3 border rounded-lg group"
                    >
                      <div className="flex items-start gap-3">
                        <Server className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{system.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {system.type}
                            </Badge>
                            {system.environment && (
                              <Badge variant="secondary" className="text-xs">
                                {system.environment}
                              </Badge>
                            )}
                          </div>
                          {system.version && (
                            <p className="text-xs text-muted-foreground">
                              Version: {system.version}
                            </p>
                          )}
                          {(system.hostname || system.ip_address) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {[system.hostname, system.ip_address]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAffectedSystem(system.id)}
                        disabled={removeAffectedSystemMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No affected systems added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vulnerability Findings */}
          {!isLoadingFindings && findingsData?.data && (
            <VulnerabilityFindingsList
              vulnerabilityId={id}
              findings={findingsData.data}
              onUpdate={() => refetchFindings()}
            />
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Discovery Date
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {formatDate(vulnerability.discovery_date, (date) =>
                    format(date, "MMMM d, yyyy"),
                  )}
                </div>
              </div>

              {vulnerability.created_by && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Created By
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {vulnerability.created_by.name}
                  </div>
                </div>
              )}

              {vulnerability.assigned_to && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Assigned To
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {vulnerability.assigned_to.name}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </p>
                <p className="text-sm">
                  {formatDate(vulnerability.created_at, (date) =>
                    formatDistanceToNow(date, { addSuffix: true }),
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </p>
                <p className="text-sm">
                  {formatDate(vulnerability.updated_at, (date) =>
                    formatDistanceToNow(date, { addSuffix: true }),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CVSS Information */}
          {(vulnerability.cvss_score || vulnerability.cvss_vector) && (
            <Card>
              <CardHeader>
                <CardTitle>CVSS Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vulnerability.cvss_score && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      CVSS Score
                    </p>
                    <Badge variant="outline" className="text-lg">
                      {vulnerability.cvss_score.toFixed(1)}
                    </Badge>
                  </div>
                )}
                {vulnerability.cvss_vector && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      CVSS Vector
                    </p>
                    <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                      {vulnerability.cvss_vector}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status History Timeline */}
          <StatusHistoryTimeline
            history={vulnerability.status_history}
            isLoading={false}
          />
        </div>
      </div>
    </div>
  );
}
