"use client";

import { Plus, Server, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAssets } from "@/hooks/use-assets";
import type { AssetListParams } from "@/types/asset";
import {
  AssetFilters,
  type FilterParams,
} from "@/components/assets/asset-filters";
import { AssetList } from "@/components/assets/asset-list";
import { AssetDataTable } from "@/components/assets/asset-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/contexts/page-header-context";
import { AddAssetModal } from "@/components/assets/add-asset-modal";

export default function AssetsPage() {
  const [params, setParams] = useState<AssetListParams>({
    page: 1,
    limit: 50,
  });
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false);
  const { setPageHeader } = usePageHeader();

  const { data, isLoading, error } = useAssets(params);

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: FilterParams) => {
    setParams((prev) => ({
      ...newFilters,
      page: 1, // Reset to first page when filters change
      limit: prev.limit || 50,
    }));
  };

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({ ...prev, search, page: 1 }));
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Server className="h-5 w-5" />, []);
  const headerActions = useMemo(
    () => (
      <Button size="sm" onClick={() => setAddAssetModalOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add New Asset
      </Button>
    ),
    [],
  );

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Asset Management",
      "Manage and track all organizational assets and their security posture",
      headerIcon,
      headerActions,
    );
  }, [setPageHeader, headerIcon, headerActions]);

  return (
    <div className="space-y-6 w-full">
      {/* Filters */}
      <AssetFilters onFilterChange={handleFiltersChange} />

      {/* Asset List with View Toggle */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "grid" | "table")}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Assets</h2>
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
            <AssetDataTable
              data={data?.data || []}
              totalCount={data?.total || 0}
              currentPage={params.page || 1}
              pageSize={params.limit || 50}
              onPageChange={handlePageChange}
              onSearchChange={handleSearchChange}
            />
          ) : (
            <AssetList
              assets={data?.data || []}
              isLoading={isLoading}
              error={error}
              totalCount={data?.total || 0}
              currentPage={params.page || 1}
              pageSize={params.limit || 50}
              onPageChange={handlePageChange}
            />
          )}
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <AssetList
            assets={data?.data || []}
            isLoading={isLoading}
            error={error}
            totalCount={data?.total || 0}
            currentPage={params.page || 1}
            pageSize={params.limit || 50}
            onPageChange={handlePageChange}
          />
        </TabsContent>
      </Tabs>

      {/* Add Asset Modal */}
      <AddAssetModal
        open={addAssetModalOpen}
        onOpenChange={setAddAssetModalOpen}
      />
    </div>
  );
}
