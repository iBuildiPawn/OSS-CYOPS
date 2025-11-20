"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AssetCriticality,
  AssetStatus,
  Environment,
  SystemType,
} from "@/types/asset";

interface AssetFiltersProps {
  onFilterChange: (filters: FilterParams) => void;
}

export interface FilterParams {
  search?: string;
  criticality?: AssetCriticality;
  status?: AssetStatus;
  environment?: Environment;
  system_type?: SystemType;
  tags?: string[];
}

export function AssetFilters({ onFilterChange }: AssetFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onFilterChangeRef = useRef(onFilterChange);

  // Keep ref updated
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // Initialize filters from URL
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [criticality, setCriticality] = useState<AssetCriticality | "all">(
    (searchParams.get("criticality") as AssetCriticality) || "all",
  );
  const [status, setStatus] = useState<AssetStatus | "all">(
    (searchParams.get("status") as AssetStatus) || "all",
  );
  const [environment, setEnvironment] = useState<Environment | "all">(
    (searchParams.get("environment") as Environment) || "all",
  );
  const [systemType, setSystemType] = useState<SystemType | "all">(
    (searchParams.get("system_type") as SystemType) || "all",
  );

  const updateFilters = useCallback(() => {
    const filters: FilterParams = {};

    if (search.trim()) {
      filters.search = search.trim();
    }
    if (criticality !== "all") {
      filters.criticality = criticality as AssetCriticality;
    }
    if (status !== "all") {
      filters.status = status as AssetStatus;
    }
    if (environment !== "all") {
      filters.environment = environment as Environment;
    }
    if (systemType !== "all") {
      filters.system_type = systemType as SystemType;
    }

    // Update URL query params
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(newUrl, { scroll: false });

    // Notify parent using ref to avoid dependency
    onFilterChangeRef.current(filters);
  }, [search, criticality, status, environment, systemType, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters();
    }, 500); // Increased to 500ms for better UX

    return () => clearTimeout(timer);
  }, [search, updateFilters]);

  // Update filters when other fields change (immediate, no debounce)
  useEffect(() => {
    updateFilters();
  }, [criticality, status, environment, systemType, updateFilters]);

  const clearAllFilters = () => {
    setSearch("");
    setCriticality("all");
    setStatus("all");
    setEnvironment("all");
    setSystemType("all");
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (criticality !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (environment !== "all" ? 1 : 0) +
    (systemType !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by hostname, IP, or asset ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={criticality}
            onValueChange={(value) =>
              setCriticality(value as AssetCriticality | "all")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Criticality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Criticality</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value as AssetStatus | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
              <SelectItem value="UNDER_MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={environment}
            onValueChange={(value) =>
              setEnvironment(value as Environment | "all")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="STAGING">Staging</SelectItem>
              <SelectItem value="DEVELOPMENT">Development</SelectItem>
              <SelectItem value="TEST">Test</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={systemType}
            onValueChange={(value) =>
              setSystemType(value as SystemType | "all")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="System Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SERVER">Server</SelectItem>
              <SelectItem value="WORKSTATION">Workstation</SelectItem>
              <SelectItem value="NETWORK_DEVICE">Network Device</SelectItem>
              <SelectItem value="APPLICATION">Application</SelectItem>
              <SelectItem value="CONTAINER">Container</SelectItem>
              <SelectItem value="CLOUD_SERVICE">Cloud Service</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="whitespace-nowrap"
            >
              Clear All ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearch("")}
              />
            </Badge>
          )}
          {criticality !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Criticality: {criticality}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setCriticality("all")}
              />
            </Badge>
          )}
          {status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setStatus("all")}
              />
            </Badge>
          )}
          {environment !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Environment: {environment}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setEnvironment("all")}
              />
            </Badge>
          )}
          {systemType !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type: {systemType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSystemType("all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
