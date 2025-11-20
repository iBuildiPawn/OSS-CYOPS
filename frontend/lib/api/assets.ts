import { apiClient } from "./client";
import type {
  AddTagsRequest,
  Asset,
  AssetDetailResponse,
  AssetListParams,
  AssetListResponse,
  AssetStats,
  CheckDuplicateRequest,
  CreateAssetRequest,
  CreateAssetResponse,
  DuplicateCheckResponse,
  UpdateAssetRequest,
  UpdateAssetStatusRequest,
} from "@/types/asset";
import type {
  FindingListParams,
  FindingListResponse,
  Vulnerability,
} from "@/types/vulnerability";

// Asset API functions
export const assetApi = {
  // List assets with filters and pagination
  list: async (params?: AssetListParams): Promise<AssetListResponse> => {
    const response = await apiClient.get<AssetListResponse>("/assets", {
      params,
    });
    return response.data;
  },

  // Get asset by ID with optional vulnerability details
  get: async (
    id: string,
    includeVulnerabilities = false,
  ): Promise<AssetDetailResponse> => {
    const response = await apiClient.get<AssetDetailResponse>(`/assets/${id}`, {
      params: { include_vulnerabilities: includeVulnerabilities },
    });
    return response.data;
  },

  // Create new asset
  create: async (data: CreateAssetRequest): Promise<CreateAssetResponse> => {
    const response = await apiClient.post<CreateAssetResponse>("/assets", data);
    return response.data;
  },

  // Update asset
  update: async (id: string, data: UpdateAssetRequest): Promise<Asset> => {
    const response = await apiClient.put<Asset>(`/assets/${id}`, data);
    return response.data;
  },

  // Delete asset (soft delete)
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assets/${id}`,
    );
    return response.data;
  },

  // Update asset status
  updateStatus: async (
    id: string,
    data: UpdateAssetStatusRequest,
  ): Promise<Asset> => {
    const response = await apiClient.patch<Asset>(`/assets/${id}/status`, data);
    return response.data;
  },

  // Add tags to asset
  addTags: async (
    id: string,
    data: AddTagsRequest,
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/assets/${id}/tags`,
      data,
    );
    return response.data;
  },

  // Remove tag from asset
  removeTag: async (id: string, tag: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assets/${id}/tags/${tag}`,
    );
    return response.data;
  },

  // Get asset statistics
  getStats: async (): Promise<{ data: AssetStats }> => {
    const response = await apiClient.get<{ data: AssetStats }>("/assets/stats");
    return response.data;
  },

  // Check for duplicate assets
  checkDuplicate: async (
    data: CheckDuplicateRequest,
  ): Promise<DuplicateCheckResponse> => {
    const response = await apiClient.post<DuplicateCheckResponse>(
      "/assets/check-duplicate",
      data,
    );
    return response.data;
  },

  // Get vulnerabilities for an asset
  getVulnerabilities: async (
    id: string,
  ): Promise<{ data: Vulnerability[] }> => {
    const response = await apiClient.get<{ data: Vulnerability[] }>(
      `/assets/${id}/vulnerabilities`,
    );
    return response.data;
  },

  // Get findings for an asset
  getFindings: async (
    id: string,
    params?: FindingListParams,
  ): Promise<FindingListResponse> => {
    const response = await apiClient.get<FindingListResponse>(
      `/assets/${id}/findings`,
      { params },
    );
    return response.data;
  },
};
