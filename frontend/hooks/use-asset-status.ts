import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { handleAPIError, handleOptimisticError } from "@/lib/error-handler";
import type { AssetStatus } from "@/types/asset";
import { toast } from "sonner";

interface UpdateStatusParams {
  assetId: string;
  status: AssetStatus;
  notes?: string;
}

export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, status, notes }: UpdateStatusParams) => {
      const response = await api.patch(`/api/v1/assets/${assetId}/status`, {
        status,
        notes,
      });
      return response.data;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["asset", variables.assetId],
      });

      // Snapshot the previous value
      const previousAsset = queryClient.getQueryData([
        "asset",
        variables.assetId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData(["asset", variables.assetId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            status: variables.status,
          },
        };
      });

      // Return context with previous value
      return { previousAsset };
    },
    onSuccess: (data, variables) => {
      toast.success("Asset status updated successfully");

      // Invalidate asset queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ["assetStats"] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAsset) {
        queryClient.setQueryData(
          ["asset", variables.assetId],
          context.previousAsset,
        );
      }

      // Handle error with conflict detection
      handleOptimisticError(
        error,
        () =>
          queryClient.invalidateQueries({
            queryKey: ["asset", variables.assetId],
          }),
        "Update Asset Status",
      );
    },
  });
}

// Status validation helper
export function canTransitionStatus(
  currentStatus: AssetStatus,
  newStatus: AssetStatus,
): { allowed: boolean; reason?: string } {
  // Cannot change from DECOMMISSIONED
  if (currentStatus === "DECOMMISSIONED") {
    return {
      allowed: false,
      reason: "Cannot change status from DECOMMISSIONED (final state)",
    };
  }

  // Same status - no change needed
  if (currentStatus === newStatus) {
    return {
      allowed: false,
      reason: "Asset is already in this status",
    };
  }

  // All other transitions are allowed
  return { allowed: true };
}

// Get status badge color
export function getStatusColor(status: AssetStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    case "UNDER_MAINTENANCE":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "DECOMMISSIONED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

// Format status for display
export function formatStatus(status: AssetStatus): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
