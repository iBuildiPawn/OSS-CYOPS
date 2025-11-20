"use client";

import {
  Plus,
  Shield,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { VulnerabilityList } from "@/components/vulnerabilities/vulnerability-list";
import { VulnerabilityDataTable } from "@/components/vulnerabilities/vulnerability-data-table";
import { useVulnerabilities } from "@/hooks/use-vulnerabilities";
import { useAsset } from "@/hooks/use-assets";
import type { VulnerabilityListParams } from "@/types/vulnerability";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/contexts/page-header-context";
import { AddVulnerabilityModal } from "@/components/vulnerabilities/add-vulnerability-modal";

export default function VulnerabilitiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assetIdFromUrl = searchParams.get("asset_id");
  const { setPageHeader } = usePageHeader();

  const [filters, setFilters] = useState<VulnerabilityListParams>({
    page: 1,
    limit: 12,
    ...(assetIdFromUrl && { asset_id: assetIdFromUrl }),
  });
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [addVulnerabilityModalOpen, setAddVulnerabilityModalOpen] =
    useState(false);

  const { data, isLoading, error } = useVulnerabilities(filters);

  // Fetch asset details if filtering by asset
  const { data: assetData } = useAsset(assetIdFromUrl || "");

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: VulnerabilityListParams) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleRemoveFilter = (filterKey: keyof VulnerabilityListParams) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    setFilters({ ...newFilters, page: 1 });

    // If removing asset_id, also update URL
    if (filterKey === "asset_id") {
      router.push("/vulnerabilities");
    }
  };

  const handleClearAllFilters = () => {
    setFilters({ page: 1, limit: filters.limit });
    router.push("/vulnerabilities");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.severity) count++;
    if (filters.status) count++;
    if (filters.search) count++;
    if (filters.asset_id) count++;
    return count;
  };

  const asset = assetData?.asset || assetData;

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);
  const headerActions = useMemo(
    () => (
      <Button size="sm" onClick={() => setAddVulnerabilityModalOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Report Vulnerability
      </Button>
    ),
    [],
  );

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Vulnerabilities",
      "Track and manage security vulnerabilities across your systems",
      headerIcon,
      headerActions,
    );
  }, [setPageHeader, headerIcon, headerActions]);

  return (
    <div className="space-y-6 w-full">
      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground">
            Active Filters:
          </span>

          {filters.asset_id && asset && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Asset: {asset.hostname || asset.asset_id || "Loading..."}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("asset_id")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.severity && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Severity: {filters.severity}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("severity")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

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

          {filters.search && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{filters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveFilter("search")}
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
        <Input
          placeholder="Search by title, CVE, or description..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-md"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <Badge
                  variant="default"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">
                  Filter Vulnerabilities
                </h4>
                <p className="text-sm text-muted-foreground">
                  Narrow down your search results
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="severity-filter">Severity</Label>
                  <Select
                    value={filters.severity || "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        severity: value === "all" ? undefined : value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger id="severity-filter">
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(filters.severity || filters.status) && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() =>
                      setFilters({
                        page: 1,
                        limit: filters.limit,
                        search: filters.search,
                      })
                    }
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Vulnerability List with View Toggle */}
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
          {!isLoading && !error ? (
            <VulnerabilityDataTable
              data={data?.data || []}
              totalCount={data?.meta.total || 0}
              currentPage={data?.meta.page || 1}
              pageSize={data?.meta.limit || 12}
              onPageChange={handlePageChange}
              onSearchChange={handleSearchChange}
            />
          ) : (
            <VulnerabilityList
              vulnerabilities={data?.data || []}
              isLoading={isLoading}
              error={error}
              totalCount={data?.meta.total || 0}
              currentPage={data?.meta.page || 1}
              pageSize={data?.meta.limit || 12}
              onPageChange={handlePageChange}
              onFiltersChange={handleFiltersChange}
            />
          )}
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <VulnerabilityList
            vulnerabilities={data?.data || []}
            isLoading={isLoading}
            error={error}
            totalCount={data?.meta.total || 0}
            currentPage={data?.meta.page || 1}
            pageSize={data?.meta.limit || 12}
            onPageChange={handlePageChange}
            onFiltersChange={handleFiltersChange}
          />
        </TabsContent>
      </Tabs>

      {/* Add Vulnerability Modal */}
      <AddVulnerabilityModal
        open={addVulnerabilityModalOpen}
        onOpenChange={setAddVulnerabilityModalOpen}
        assessmentId={null}
      />
    </div>
  );
}
