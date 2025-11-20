"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AssetCriticality,
  AssetListParams,
  AssetStatus,
  AssetWithVulnCount,
  Environment,
  SystemType,
} from "@/types/asset";
import { AssetCard } from "./asset-card";

interface AssetListProps {
  assets: AssetWithVulnCount[];
  isLoading?: boolean;
  error?: Error | null;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onFiltersChange?: (filters: AssetListParams) => void;
}

export function AssetList({
  assets,
  isLoading = false,
  error = null,
  totalCount = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  onFiltersChange,
}: AssetListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCriticality, setSelectedCriticality] = useState<
    AssetCriticality | "ALL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | "ALL">(
    "ALL",
  );
  const [selectedEnvironment, setSelectedEnvironment] = useState<
    Environment | "ALL"
  >("ALL");
  const [selectedSystemType, setSelectedSystemType] = useState<
    SystemType | "ALL"
  >("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = () => {
    if (onFiltersChange) {
      onFiltersChange({
        search: searchQuery || undefined,
        criticality:
          selectedCriticality !== "ALL" ? selectedCriticality : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        environment:
          selectedEnvironment !== "ALL" ? selectedEnvironment : undefined,
        system_type:
          selectedSystemType !== "ALL" ? selectedSystemType : undefined,
        page: 1,
        limit: pageSize,
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCriticality("ALL");
    setSelectedStatus("ALL");
    setSelectedEnvironment("ALL");
    setSelectedSystemType("ALL");
    if (onFiltersChange) {
      onFiltersChange({ page: 1, limit: pageSize });
    }
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCriticality !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedEnvironment !== "ALL" ||
    selectedSystemType !== "ALL";

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Search and filter assets</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by hostname, IP, asset ID, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>

            {/* Filter Selects */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criticality">Criticality</Label>
                <Select
                  value={selectedCriticality}
                  onValueChange={(value) =>
                    setSelectedCriticality(value as AssetCriticality | "ALL")
                  }
                >
                  <SelectTrigger id="criticality">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) =>
                    setSelectedStatus(value as AssetStatus | "ALL")
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DECOMMISSIONED">
                      Decommissioned
                    </SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">
                      Under Maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={selectedEnvironment}
                  onValueChange={(value) =>
                    setSelectedEnvironment(value as Environment | "ALL")
                  }
                >
                  <SelectTrigger id="environment">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                    <SelectItem value="STAGING">Staging</SelectItem>
                    <SelectItem value="DEVELOPMENT">Development</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_type">System Type</Label>
                <Select
                  value={selectedSystemType}
                  onValueChange={(value) =>
                    setSelectedSystemType(value as SystemType | "ALL")
                  }
                >
                  <SelectTrigger id="system_type">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="WORKSTATION">Workstation</SelectItem>
                    <SelectItem value="NETWORK_DEVICE">
                      Network Device
                    </SelectItem>
                    <SelectItem value="APPLICATION">Application</SelectItem>
                    <SelectItem value="CONTAINER">Container</SelectItem>
                    <SelectItem value="CLOUD_SERVICE">Cloud Service</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters & Clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span>Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary">Search: {searchQuery}</Badge>
                  )}
                  {selectedCriticality !== "ALL" && (
                    <Badge variant="secondary">
                      Criticality: {selectedCriticality}
                    </Badge>
                  )}
                  {selectedStatus !== "ALL" && (
                    <Badge variant="secondary">Status: {selectedStatus}</Badge>
                  )}
                  {selectedEnvironment !== "ALL" && (
                    <Badge variant="secondary">
                      Environment: {selectedEnvironment}
                    </Badge>
                  )}
                  {selectedSystemType !== "ALL" && (
                    <Badge variant="secondary">
                      Type: {selectedSystemType}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "No assets found"
            : `Showing ${assets.length} of ${totalCount} assets`}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "Failed to load assets. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asset Cards Grid */}
      {!isLoading && !error && assets.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && assets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "Get started by adding your first asset."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                    className={cn(
                      "w-8 h-8 p-0",
                      currentPage === pageNum && "pointer-events-none",
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
