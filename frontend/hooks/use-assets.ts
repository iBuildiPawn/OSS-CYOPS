"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetApi } from "@/lib/api";
import type {
  AddTagsRequest,
  Asset,
  AssetListParams,
  CreateAssetRequest,
  UpdateAssetRequest,
  UpdateAssetStatusRequest,
} from "@/types/asset";

// Query keys for React Query
export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (params?: AssetListParams) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  stats: () => [...assetKeys.all, "stats"] as const,
  vulnerabilities: (id: string) =>
    [...assetKeys.detail(id), "vulnerabilities"] as const,
};

// Hook to fetch list of assets
export function useAssets(params?: AssetListParams) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => assetApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60000, // Poll every 60 seconds for continuous updates
  });
}

// Hook to fetch single asset by ID
export function useAsset(id: string, includeVulnerabilities = false) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => assetApi.get(id, includeVulnerabilities),
    enabled: !!id, // Only run query if id exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to fetch asset statistics
export function useAssetStats() {
  return useQuery({
    queryKey: assetKeys.stats(),
    queryFn: () => assetApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch vulnerabilities for an asset
export function useAssetVulnerabilities(assetId: string) {
  return useQuery({
    queryKey: assetKeys.vulnerabilities(assetId),
    queryFn: () => assetApi.getVulnerabilities(assetId),
    enabled: !!assetId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to create a new asset
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetRequest) => assetApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch asset list queries
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });
}

// Hook to update an existing asset
export function useUpdateAsset(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAssetRequest) => assetApi.update(id, data),
    onSuccess: (updatedAsset) => {
      // Update the cache for this specific asset
      queryClient.setQueryData(assetKeys.detail(id), updatedAsset);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });
}

// Hook to update asset status
export function useUpdateAssetStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAssetStatusRequest) =>
      assetApi.updateStatus(id, data),
    onSuccess: (updatedAsset) => {
      // Update the cache for this specific asset
      queryClient.setQueryData(assetKeys.detail(id), updatedAsset);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });
}

// Hook to add tags to an asset
export function useAddAssetTags(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddTagsRequest) => assetApi.addTags(id, data),
    onSuccess: () => {
      // Invalidate the asset detail to refetch with new tags
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

// Hook to remove a tag from an asset
export function useRemoveAssetTag(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tag: string) => assetApi.removeTag(id, tag),
    onSuccess: () => {
      // Invalidate the asset detail to refetch without the removed tag
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

// Hook to delete an asset (soft delete)
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove the asset from cache
      queryClient.removeQueries({ queryKey: assetKeys.detail(deletedId) });
      // Invalidate all asset queries
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

// Hook to check for duplicate assets
export function useCheckDuplicateAsset() {
  return useMutation({
    mutationFn: (data: {
      hostname?: string;
      ip_address?: string;
      environment: import("@/types/asset").Environment;
    }) => assetApi.checkDuplicate(data),
  });
}
