import { apiClient } from "./client";
import type {
  AffectedSystem,
  AssignVulnerabilityRequest,
  CreateVulnerabilityRequest,
  CreateVulnerabilityResponse,
  UpdateStatusRequest,
  UpdateVulnerabilityRequest,
  VulnerabilityDetailResponse,
  VulnerabilityListParams,
  VulnerabilityListResponse,
  VulnerabilityResponse,
  VulnerabilityStats,
} from "@/types/vulnerability";

// Vulnerability API functions
export const vulnerabilityApi = {
  // List vulnerabilities with filters and pagination
  list: async (
    params?: VulnerabilityListParams,
  ): Promise<VulnerabilityListResponse> => {
    const response = await apiClient.get<VulnerabilityListResponse>(
      "/vulnerabilities",
      { params },
    );
    return response.data;
  },

  // Get vulnerability by ID with full details
  get: async (id: string): Promise<VulnerabilityDetailResponse> => {
    const response = await apiClient.get<VulnerabilityDetailResponse>(
      `/vulnerabilities/${id}`,
    );
    return response.data;
  },

  // Create new vulnerability
  create: async (
    data: CreateVulnerabilityRequest,
  ): Promise<CreateVulnerabilityResponse> => {
    const response = await apiClient.post<CreateVulnerabilityResponse>(
      "/vulnerabilities",
      data,
    );
    return response.data;
  },

  // Update vulnerability
  update: async (
    id: string,
    data: UpdateVulnerabilityRequest,
  ): Promise<VulnerabilityResponse> => {
    const response = await apiClient.put<VulnerabilityResponse>(
      `/vulnerabilities/${id}`,
      data,
    );
    return response.data;
  },

  // Update vulnerability status
  updateStatus: async (
    id: string,
    data: UpdateStatusRequest,
  ): Promise<VulnerabilityResponse> => {
    const response = await apiClient.patch<VulnerabilityResponse>(
      `/vulnerabilities/${id}/status`,
      data,
    );
    return response.data;
  },

  // Assign vulnerability to user
  assign: async (
    id: string,
    data: AssignVulnerabilityRequest,
  ): Promise<VulnerabilityResponse> => {
    const response = await apiClient.patch<VulnerabilityResponse>(
      `/vulnerabilities/${id}/assign`,
      data,
    );
    return response.data;
  },

  // Delete vulnerability (soft delete)
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/vulnerabilities/${id}`,
    );
    return response.data;
  },

  // Get vulnerability statistics
  getStats: async (): Promise<{ data: VulnerabilityStats }> => {
    const response = await apiClient.get<{ data: VulnerabilityStats }>(
      "/vulnerabilities/stats",
    );
    return response.data;
  },

  // Get affected systems for a vulnerability
  getAffectedSystems: async (
    id: string,
  ): Promise<{ data: AffectedSystem[] }> => {
    const response = await apiClient.get<{ data: AffectedSystem[] }>(
      `/vulnerabilities/${id}/affected-systems`,
    );
    return response.data;
  },

  // Add affected systems to vulnerability
  addAffectedSystems: async (
    id: string,
    systemIds: string[],
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/vulnerabilities/${id}/affected-systems`,
      {
        system_ids: systemIds,
      },
    );
    return response.data;
  },

  // Import from Nessus file
  importNessusFile: async (
    file: File,
    skipDuplicates: boolean = true,
  ): Promise<{ message: string; result: any }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skip_duplicates", skipDuplicates.toString());

    const response = await apiClient.post<{ message: string; result: any }>(
      "/vulnerabilities/import/nessus",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Preview Nessus import
  previewNessusImport: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<any>(
      "/vulnerabilities/import/nessus/preview",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Upload attachment to vulnerability
  uploadAttachment: async (
    vulnerabilityId: string,
    file: File,
    attachmentType: string = "PROOF",
    description?: string,
  ): Promise<{ message: string; data: any }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("attachment_type", attachmentType);
    if (description) {
      formData.append("description", description);
    }

    const response = await apiClient.post<{ message: string; data: any }>(
      `/vulnerabilities/${vulnerabilityId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Get attachments for a vulnerability
  getAttachments: async (vulnerabilityId: string): Promise<{ data: any[] }> => {
    const response = await apiClient.get<{ data: any[] }>(
      `/vulnerabilities/${vulnerabilityId}/attachments`,
    );
    return response.data;
  },
};
