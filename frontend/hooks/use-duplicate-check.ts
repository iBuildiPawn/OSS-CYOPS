import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Asset } from "@/types/asset";

interface CheckDuplicateParams {
  name?: string;
  ip_address?: string;
  hostname?: string;
  threshold?: number;
}

interface DuplicateMatch {
  asset: Asset;
  similarity: number;
  matched_on_name: boolean;
  matched_on_ip: boolean;
  matched_on_hostname: boolean;
}

interface CheckDuplicateResponse {
  duplicates: DuplicateMatch[];
  count: number;
}

export function useCheckDuplicateAsset() {
  return useMutation({
    mutationFn: async (params: CheckDuplicateParams) => {
      const response = await api.post<CheckDuplicateResponse>(
        "/api/v1/assets/check-duplicate",
        params,
      );
      return response.data;
    },
  });
}

// Get match type label
export function getMatchTypeLabel(match: DuplicateMatch): string {
  if (match.matched_on_ip) return "Exact IP match";
  if (match.matched_on_hostname) return "Exact hostname match";
  if (match.matched_on_name)
    return `${Math.round(match.similarity)}% name similarity`;
  return "Similar asset";
}

// Get severity color based on similarity
export function getSimilarityColor(similarity: number): string {
  if (similarity === 100) {
    return "text-red-600 dark:text-red-400"; // Exact match - very likely duplicate
  }
  if (similarity >= 90) {
    return "text-orange-600 dark:text-orange-400"; // Very similar
  }
  if (similarity >= 80) {
    return "text-yellow-600 dark:text-yellow-400"; // Similar
  }
  return "text-gray-600 dark:text-gray-400"; // Somewhat similar
}

// Format similarity percentage
export function formatSimilarity(similarity: number): string {
  if (similarity === 100) {
    return "100% (Exact match)";
  }
  return `${Math.round(similarity)}% similar`;
}
