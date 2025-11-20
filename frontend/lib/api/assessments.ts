import { apiClient } from "./client";
import type {
  Assessment,
  AssessmentListParams,
  AssessmentListResponse,
  AssessmentStats,
  CreateAssessmentRequest,
  LinkAssetRequest,
  LinkVulnerabilityRequest,
  UpdateAssessmentRequest,
} from "@/types/assessment";

// Assessment API
export const assessmentApi = {
  // List assessments with filters and pagination
  list: async (
    params?: AssessmentListParams,
  ): Promise<AssessmentListResponse> => {
    const response = await apiClient.get<AssessmentListResponse>(
      "/assessments",
      { params },
    );
    return response.data;
  },

  // Get assessment by ID with full details
  get: async (id: string): Promise<{ data: Assessment }> => {
    const response = await apiClient.get<{ data: Assessment }>(
      `/assessments/${id}`,
    );
    return response.data;
  },

  // Create new assessment
  create: async (
    data: CreateAssessmentRequest,
  ): Promise<{ data: Assessment }> => {
    const response = await apiClient.post<{ data: Assessment }>(
      "/assessments",
      data,
    );
    return response.data;
  },

  // Update assessment
  update: async (
    id: string,
    data: UpdateAssessmentRequest,
  ): Promise<{ data: Assessment }> => {
    const response = await apiClient.put<{ data: Assessment }>(
      `/assessments/${id}`,
      data,
    );
    return response.data;
  },

  // Delete assessment (soft delete)
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assessments/${id}`,
    );
    return response.data;
  },

  // Get assessment statistics
  getStats: async (): Promise<{ data: AssessmentStats }> => {
    const response = await apiClient.get<{ data: AssessmentStats }>(
      "/assessments/stats",
    );
    return response.data;
  },

  // Link vulnerability to assessment
  linkVulnerability: async (
    id: string,
    data: LinkVulnerabilityRequest,
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/assessments/${id}/vulnerabilities`,
      data,
    );
    return response.data;
  },

  // Unlink vulnerability from assessment
  unlinkVulnerability: async (
    id: string,
    vulnerabilityId: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assessments/${id}/vulnerabilities/${vulnerabilityId}`,
    );
    return response.data;
  },

  // Link asset to assessment
  linkAsset: async (
    id: string,
    data: LinkAssetRequest,
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/assessments/${id}/assets`,
      data,
    );
    return response.data;
  },

  // Unlink asset from assessment
  unlinkAsset: async (
    id: string,
    assetId: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assessments/${id}/assets/${assetId}`,
    );
    return response.data;
  },
};
