"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { affectedSystemApi } from "@/lib/api";
import type {
  AddAffectedSystemsRequest,
  AffectedSystem,
  AffectedSystemListParams,
  CreateAffectedSystemRequest,
  UpdateAffectedSystemRequest,
} from "@/types/vulnerability";

// Query keys for React Query
export const affectedSystemKeys = {
  all: ["affectedSystems"] as const,
  lists: () => [...affectedSystemKeys.all, "list"] as const,
  list: (params?: AffectedSystemListParams) =>
    [...affectedSystemKeys.lists(), params] as const,
  details: () => [...affectedSystemKeys.all, "detail"] as const,
  detail: (id: string) => [...affectedSystemKeys.details(), id] as const,
  vulnerabilityAffectedSystems: (vulnerabilityId: string) =>
    ["vulnerabilities", vulnerabilityId, "affectedSystems"] as const,
};

// Hook to fetch list of affected systems
export function useAffectedSystems(params?: AffectedSystemListParams) {
  return useQuery({
    queryKey: affectedSystemKeys.list(params),
    queryFn: () => affectedSystemApi.list(params),
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch single affected system by ID
export function useAffectedSystem(id: string) {
  return useQuery({
    queryKey: affectedSystemKeys.detail(id),
    queryFn: () => affectedSystemApi.get(id),
    enabled: !!id, // Only run query if id exists
  });
}

// Hook to fetch affected systems for a specific vulnerability
export function useVulnerabilityAffectedSystems(vulnerabilityId: string) {
  return useQuery({
    queryKey: affectedSystemKeys.vulnerabilityAffectedSystems(vulnerabilityId),
    queryFn: () => affectedSystemApi.getForVulnerability(vulnerabilityId),
    enabled: !!vulnerabilityId,
    staleTime: 30000,
  });
}

// Hook to create a new affected system
export function useCreateAffectedSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAffectedSystemRequest) =>
      affectedSystemApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch affected system list queries
      queryClient.invalidateQueries({ queryKey: affectedSystemKeys.lists() });
    },
  });
}

// Hook to update an existing affected system
export function useUpdateAffectedSystem(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAffectedSystemRequest) =>
      affectedSystemApi.update(id, data),
    onSuccess: (updatedSystem) => {
      // Update the cache for this specific system
      queryClient.setQueryData(affectedSystemKeys.detail(id), {
        data: updatedSystem,
      });
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: affectedSystemKeys.lists() });
    },
  });
}

// Hook to delete an affected system (soft delete)
export function useDeleteAffectedSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => affectedSystemApi.delete(id),
    onSuccess: () => {
      // Invalidate all affected system queries
      queryClient.invalidateQueries({ queryKey: affectedSystemKeys.all });
    },
  });
}

// Hook to add affected systems to a vulnerability
export function useAddAffectedSystemsToVulnerability(vulnerabilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddAffectedSystemsRequest) =>
      affectedSystemApi.addToVulnerability(vulnerabilityId, data),
    onSuccess: () => {
      // Invalidate the vulnerability's affected systems
      queryClient.invalidateQueries({
        queryKey:
          affectedSystemKeys.vulnerabilityAffectedSystems(vulnerabilityId),
      });
      // Also invalidate vulnerability detail to update any counts
      queryClient.invalidateQueries({
        queryKey: ["vulnerabilities", "detail", vulnerabilityId],
      });
    },
  });
}

// Hook to remove affected systems from a vulnerability (if we add this endpoint later)
export function useRemoveAffectedSystemFromVulnerability(
  vulnerabilityId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (systemId: string) =>
      affectedSystemApi.removeFromVulnerability(vulnerabilityId, systemId),
    onSuccess: () => {
      // Invalidate the vulnerability's affected systems
      queryClient.invalidateQueries({
        queryKey:
          affectedSystemKeys.vulnerabilityAffectedSystems(vulnerabilityId),
      });
      queryClient.invalidateQueries({
        queryKey: ["vulnerabilities", "detail", vulnerabilityId],
      });
    },
  });
}
