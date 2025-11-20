"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileSearch,
  Filter,
  X,
  LayoutGrid,
  Table as TableIcon,
  TrendingUp,
  Activity,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FindingDetailView } from "@/components/findings/finding-detail-view";
import { FindingsDataTable } from "@/components/findings/findings-data-table";
import { vulnerabilityFindingApi } from "@/lib/api";
import type {
  FindingListParams,
  VulnerabilityFinding,
} from "@/types/vulnerability";
import { usePageHeader } from "@/contexts/page-header-context";

export default function FindingsPage() {
  const searchParams = useSearchParams();
  const defaultStatus = searchParams.get("status") || undefined;
  const { setPageHeader } = usePageHeader();

  const [filters, setFilters] = useState<FindingListParams>({
    page: 1,
    limit: 20,
    status: defaultStatus,
  });
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [selectedFinding, setSelectedFinding] =
    useState<VulnerabilityFinding | null>(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["findings", filters],
    queryFn: () => vulnerabilityFindingApi.list(filters),
  });

  // Fetch statistics from API (with same filters for consistency)
  const { data: statsData } = useQuery({
    queryKey: ["findings-stats", filters.status],
    queryFn: () =>
      vulnerabilityFindingApi.getStatistics({
        status: filters.status,
      }),
  });

  const findings = data?.data || [];
  const meta = data?.meta;

  // Get statistics from API response
  const stats = {
    total: statsData?.data.total || 0,
    open: statsData?.data.open || 0,
    mitigated: statsData?.data.mitigated || 0,
    fixed: statsData?.data.fixed || 0,
    verified: statsData?.data.verified || 0,
    accepted: statsData?.data.accepted || 0,
    exception: statsData?.data.exception || 0,
    resolutionRate: statsData?.data.resolution_rate || 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Circle className="h-4 w-4 text-red-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "MITIGATED":
        return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
      case "FIXED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "VERIFIED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "RISK_ACCEPTED":
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case "FALSE_POSITIVE":
        return <XCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "destructive";
      case "IN_PROGRESS":
        return "default";
      case "FIXED":
      case "VERIFIED":
        return "default";
      default:
        return "secondary";
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleRemoveFilter = (filterKey: keyof FindingListParams) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    setFilters({ ...newFilters, page: 1 });
  };

  const handleClearAllFilters = () => {
    setFilters({ page: 1, limit: filters.limit });
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.scanner_name) count++;
    if (filters.port) count++;
    if (filters.protocol) count++;
    return count;
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <FileSearch className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Vulnerability Findings",
      "Track individual vulnerability instances discovered by scanners across your systems",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  if (isLoading) {
    return (
      <>
        <div className="space-y-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-[500px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </>
    );
  }

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Findings
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all systems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open & Active</CardTitle>
            <Circle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.open + stats.mitigated}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.open} open, {stats.mitigated} mitigated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fixed & Verified
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.fixed + stats.verified}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.fixed} fixed, {stats.verified} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.resolutionRate)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fixed or verified findings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount() > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground">
            Active Filters:
          </span>

          {filters.status && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Status: {filters.status.replace("_", " ")}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("status")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.scanner_name && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Scanner: {filters.scanner_name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("scanner_name")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.port && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Port: {filters.port}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("port")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.protocol && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Protocol: {filters.protocol}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("protocol")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="ml-auto text-xs h-7"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount() > 0 && (
                <Badge
                  variant="default"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {activeFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Filter Findings</h4>
                <p className="text-sm text-muted-foreground">
                  Narrow down your search results
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value === "all" ? undefined : value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="MITIGATED">Mitigated</SelectItem>
                      <SelectItem value="FIXED">Fixed</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="RISK_ACCEPTED">
                        Risk Accepted
                      </SelectItem>
                      <SelectItem value="FALSE_POSITIVE">
                        False Positive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scanner-filter">Scanner</Label>
                  <Input
                    id="scanner-filter"
                    placeholder="e.g., Nessus"
                    value={filters.scanner_name || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        scanner_name: e.target.value || undefined,
                        page: 1,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="port-filter">Port</Label>
                    <Input
                      id="port-filter"
                      placeholder="e.g., 443"
                      value={filters.port || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          port: e.target.value || undefined,
                          page: 1,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protocol-filter">Protocol</Label>
                    <Input
                      id="protocol-filter"
                      placeholder="e.g., TCP"
                      value={filters.protocol || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          protocol: e.target.value || undefined,
                          page: 1,
                        }))
                      }
                    />
                  </div>
                </div>
                {activeFiltersCount() > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleClearAllFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {meta && (
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1} -{" "}
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}{" "}
            findings
          </p>
        )}
      </div>

      {/* View Toggle and Content */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "grid" | "table")}
      >
        <div className="flex items-center justify-end mb-4">
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table" className="mt-0">
          <FindingsDataTable
            data={findings}
            totalCount={meta?.total || 0}
            currentPage={meta?.page || 1}
            pageSize={meta?.limit || 20}
            onPageChange={handlePageChange}
            onFindingClick={(finding) => {
              setSelectedFinding(finding);
              setDetailViewOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          {findings.length > 0 ? (
            <>
              <div className="space-y-3">
                {findings.map((finding: VulnerabilityFinding) => (
                  <Card
                    key={finding.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedFinding(finding);
                      setDetailViewOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                            {getStatusIcon(finding.status)}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={getStatusBadgeVariant(finding.status)}
                              >
                                {finding.status.replace("_", " ")}
                              </Badge>
                              <span className="font-medium">
                                {finding.affected_system?.hostname ||
                                  finding.affected_system?.ip_address ||
                                  "Unknown Host"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {finding.port}/{finding.protocol}
                              </Badge>
                              {finding.service_name && (
                                <span className="text-xs text-muted-foreground">
                                  {finding.service_name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {finding.vulnerability?.title || "Vulnerability"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Scanner: {finding.scanner_name}</span>
                              <span>
                                First detected:{" "}
                                {new Date(
                                  finding.first_detected,
                                ).toLocaleDateString()}
                              </span>
                              <span>
                                Last seen:{" "}
                                {new Date(
                                  finding.last_seen,
                                ).toLocaleDateString()}
                              </span>
                              {finding.fixed_at && (
                                <span className="text-green-600 font-medium">
                                  Fixed:{" "}
                                  {new Date(
                                    finding.fixed_at,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {finding.vulnerability && (
                          <div className="text-right">
                            <Badge
                              variant={
                                finding.vulnerability.severity === "CRITICAL"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={
                                finding.vulnerability.severity === "HIGH"
                                  ? "bg-orange-500"
                                  : ""
                              }
                            >
                              {finding.vulnerability.severity}
                            </Badge>
                            {finding.vulnerability.cvss_score && (
                              <p className="text-xs text-muted-foreground mt-1">
                                CVSS: {finding.vulnerability.cvss_score}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Grid Pagination */}
              {meta && meta.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {meta.page} of {meta.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(meta.page - 1)}
                      disabled={meta.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(meta.page + 1)}
                      disabled={meta.page >= meta.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No findings found
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {activeFiltersCount() > 0
                    ? "Try adjusting your filters to see more results"
                    : "Vulnerability findings from scanners will appear here"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Finding Detail View Modal */}
      {selectedFinding && (
        <FindingDetailView
          finding={selectedFinding}
          isOpen={detailViewOpen}
          onClose={() => {
            setDetailViewOpen(false);
            setSelectedFinding(null);
          }}
          canUpload={false}
        />
      )}
    </>
  );
}
