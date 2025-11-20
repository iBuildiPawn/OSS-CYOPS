"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vulnerabilityApi } from "@/lib/api";
import type {
  AssignVulnerabilityRequest,
  CreateVulnerabilityRequest,
  UpdateStatusRequest,
  UpdateVulnerabilityRequest,
  Vulnerability,
  VulnerabilityListParams,
} from "@/types/vulnerability";

// Query keys for React Query
export const vulnerabilityKeys = {
  all: ["vulnerabilities"] as const,
  lists: () => [...vulnerabilityKeys.all, "list"] as const,
  list: (params?: VulnerabilityListParams) =>
    [...vulnerabilityKeys.lists(), params] as const,
  details: () => [...vulnerabilityKeys.all, "detail"] as const,
  detail: (id: string) => [...vulnerabilityKeys.details(), id] as const,
  stats: () => [...vulnerabilityKeys.all, "stats"] as const,
};

// Hook to fetch list of vulnerabilities
export function useVulnerabilities(params?: VulnerabilityListParams) {
  return useQuery({
    queryKey: vulnerabilityKeys.list(params),
    queryFn: () => vulnerabilityApi.list(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Poll every 60 seconds for continuous updates
  });
}

// Hook to fetch single vulnerability by ID
export function useVulnerability(id: string) {
  return useQuery({
    queryKey: vulnerabilityKeys.detail(id),
    queryFn: () => vulnerabilityApi.get(id),
    enabled: !!id, // Only run query if id exists
  });
}

// Hook to fetch vulnerability statistics
export function useVulnerabilityStats() {
  return useQuery({
    queryKey: vulnerabilityKeys.stats(),
    queryFn: () => vulnerabilityApi.getStats(),
    staleTime: 60000, // 1 minute
  });
}

// Hook to create a new vulnerability
export function useCreateVulnerability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVulnerabilityRequest) =>
      vulnerabilityApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch vulnerability list queries
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.stats() });
    },
  });
}

// Hook to update an existing vulnerability
export function useUpdateVulnerability(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateVulnerabilityRequest) =>
      vulnerabilityApi.update(id, data),
    onSuccess: (updatedVulnerability) => {
      // Update the cache for this specific vulnerability
      // API already returns an object with shape { data: ... }
      // set the cache to the response directly to keep shape consistent
      queryClient.setQueryData(vulnerabilityKeys.detail(id), updatedVulnerability);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.stats() });
    },
  });
}

// Hook to update vulnerability status
export function useUpdateVulnerabilityStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStatusRequest) =>
      vulnerabilityApi.updateStatus(id, data),
    onSuccess: (updatedVulnerability) => {
      // Update the cache for this specific vulnerability
      // API already returns an object with shape { data: ... }
      // set the cache to the response directly to keep shape consistent
      queryClient.setQueryData(vulnerabilityKeys.detail(id), updatedVulnerability);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.stats() });
      // Invalidate overview page queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ["recent-vulnerabilities"] });
      queryClient.invalidateQueries({ queryKey: ["vulnerability-stats"] });
    },
  });
}

// Hook to assign a vulnerability to a user
export function useAssignVulnerability(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignVulnerabilityRequest) =>
      vulnerabilityApi.assign(id, data),
    onSuccess: (updatedVulnerability) => {
      // Update the cache for this specific vulnerability
      // API already returns an object with shape { data: ... }
      // set the cache to the response directly to keep shape consistent
      queryClient.setQueryData(vulnerabilityKeys.detail(id), updatedVulnerability);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.lists() });
    },
  });
}

// Hook to delete a vulnerability (soft delete)
export function useDeleteVulnerability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vulnerabilityApi.delete(id),
    onSuccess: () => {
      // Invalidate all vulnerability queries
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.all });
    },
  });
}

// Hook to get affected systems for a vulnerability
export function useAffectedSystems(vulnerabilityId: string) {
  return useQuery({
    queryKey: [
      ...vulnerabilityKeys.detail(vulnerabilityId),
      "affected-systems",
    ],
    queryFn: () => vulnerabilityApi.getAffectedSystems(vulnerabilityId),
    enabled: !!vulnerabilityId,
  });
}
