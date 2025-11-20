import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { handleOptimisticError } from "@/lib/error-handler";
import { toast } from "sonner";

interface AddTagsParams {
  assetId: string;
  tags: string[];
}

interface RemoveTagParams {
  assetId: string;
  tag: string;
}

export function useAddAssetTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, tags }: AddTagsParams) => {
      const response = await api.post(`/api/v1/assets/${assetId}/tags`, {
        tags,
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
        const existingTags = old.data.tags || [];
        const newTags = variables.tags.map((tag) => ({ tag }));
        return {
          ...old,
          data: {
            ...old.data,
            tags: [...existingTags, ...newTags],
          },
        };
      });

      return { previousAsset };
    },
    onSuccess: (data, variables) => {
      toast.success(`Added ${variables.tags.length} tag(s) successfully`);

      // Invalidate asset queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", variables.assetId] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAsset) {
        queryClient.setQueryData(
          ["asset", variables.assetId],
          context.previousAsset,
        );
      }

      handleOptimisticError(
        error,
        () =>
          queryClient.invalidateQueries({
            queryKey: ["asset", variables.assetId],
          }),
        "Add Tags",
      );
    },
  });
}

export function useRemoveAssetTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, tag }: RemoveTagParams) => {
      const response = await api.delete(
        `/api/v1/assets/${assetId}/tags/${encodeURIComponent(tag)}`,
      );
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
        const existingTags = old.data.tags || [];
        return {
          ...old,
          data: {
            ...old.data,
            tags: existingTags.filter((t: any) => t.tag !== variables.tag),
          },
        };
      });

      return { previousAsset };
    },
    onSuccess: (data, variables) => {
      toast.success("Tag removed successfully");

      // Invalidate asset queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", variables.assetId] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAsset) {
        queryClient.setQueryData(
          ["asset", variables.assetId],
          context.previousAsset,
        );
      }

      handleOptimisticError(
        error,
        () =>
          queryClient.invalidateQueries({
            queryKey: ["asset", variables.assetId],
          }),
        "Remove Tag",
      );
    },
  });
}

// Tag validation helper
export function validateTag(tag: string): { valid: boolean; error?: string } {
  // Trim and lowercase
  const normalized = tag.trim().toLowerCase();

  if (normalized.length === 0) {
    return { valid: false, error: "Tag cannot be empty" };
  }

  if (normalized.length > 50) {
    return { valid: false, error: "Tag must be 50 characters or less" };
  }

  // Allow alphanumeric, hyphens, underscores
  if (!/^[a-z0-9-_]+$/.test(normalized)) {
    return {
      valid: false,
      error: "Tag can only contain letters, numbers, hyphens, and underscores",
    };
  }

  return { valid: true };
}

// Normalize tag (consistent with backend)
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

// Get tag color (cycle through colors for visual variety)
const TAG_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
];

export function getTagColor(tag: string, index?: number): string {
  if (typeof index === "number") {
    return TAG_COLORS[index % TAG_COLORS.length];
  }

  // Hash the tag string to get consistent color
  const hash = tag.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
