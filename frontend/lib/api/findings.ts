import { apiClient } from "./client";
import type {
  AcceptRiskRequest,
  FindingDetailResponse,
  FindingListParams,
  FindingListResponse,
  MarkFindingFixedRequest,
  MarkFindingVerifiedRequest,
  VulnerabilityFinding,
} from "@/types/vulnerability";

// Vulnerability Finding API
export const vulnerabilityFindingApi = {
  // List all findings with filters
  list: async (params?: FindingListParams): Promise<FindingListResponse> => {
    const response = await apiClient.get<FindingListResponse>(
      "/vulnerabilities/findings",
      { params },
    );
    return response.data;
  },

  // Get specific finding by ID
  get: async (id: string): Promise<FindingDetailResponse> => {
    const response = await apiClient.get<FindingDetailResponse>(
      `/vulnerabilities/findings/${id}`,
    );
    return response.data;
  },

  // Get findings for a specific vulnerability
  listByVulnerability: async (
    vulnerabilityId: string,
    params?: FindingListParams,
  ): Promise<FindingListResponse> => {
    const response = await apiClient.get<FindingListResponse>(
      `/vulnerabilities/${vulnerabilityId}/findings`,
      { params },
    );
    return response.data;
  },

  // Get findings for a specific system/asset
  listBySystem: async (
    systemId: string,
    params?: FindingListParams,
  ): Promise<FindingListResponse> => {
    const response = await apiClient.get<FindingListResponse>(
      `/affected-systems/${systemId}/findings`,
      { params },
    );
    return response.data;
  },

  // Mark finding as fixed
  markFixed: async (
    id: string,
    data: MarkFindingFixedRequest,
  ): Promise<VulnerabilityFinding> => {
    const response = await apiClient.post<VulnerabilityFinding>(
      `/vulnerabilities/findings/${id}/mark-fixed`,
      data,
    );
    return response.data;
  },

  // Mark finding as verified
  markVerified: async (
    id: string,
    data: MarkFindingVerifiedRequest,
  ): Promise<VulnerabilityFinding> => {
    const response = await apiClient.post<VulnerabilityFinding>(
      `/vulnerabilities/findings/${id}/mark-verified`,
      data,
    );
    return response.data;
  },

  // Accept risk for a finding
  acceptRisk: async (
    id: string,
    data: AcceptRiskRequest,
  ): Promise<VulnerabilityFinding> => {
    const response = await apiClient.post<VulnerabilityFinding>(
      `/vulnerabilities/findings/${id}/accept-risk`,
      data,
    );
    return response.data;
  },

  // Upload attachment to a finding
  uploadAttachment: async (
    id: string,
    file: File,
    type: string,
    description?: string,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (description) {
      formData.append("description", description);
    }

    const response = await apiClient.post(
      `/vulnerabilities/findings/${id}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Get findings statistics
  getStatistics: async (
    params?: FindingListParams,
  ): Promise<{
    data: {
      total: number;
      open: number;
      mitigated: number;
      fixed: number;
      verified: number;
      accepted: number;
      exception: number;
      resolution_rate: number;
    };
  }> => {
    const response = await apiClient.get("/vulnerabilities/findings/stats", {
      params,
    });
    return response.data;
  },
};
