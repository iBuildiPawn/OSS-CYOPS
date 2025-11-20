import { apiClient } from "./client";
import type {
  AffectedSystem,
  AffectedSystemListResponse,
  CreateAffectedSystemRequest,
  UpdateAffectedSystemRequest,
} from "@/types/vulnerability";

// Affected System API functions
export const affectedSystemApi = {
  // List all affected systems with filters
  list: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    environment?: string;
    search?: string;
  }): Promise<AffectedSystemListResponse> => {
    const response = await apiClient.get<AffectedSystemListResponse>(
      "/affected-systems",
      { params },
    );
    return response.data;
  },

  // Get affected system by ID
  get: async (id: string): Promise<{ data: AffectedSystem }> => {
    const response = await apiClient.get<{ data: AffectedSystem }>(
      `/affected-systems/${id}`,
    );
    return response.data;
  },

  // Get affected systems for a vulnerability
  getForVulnerability: async (
    vulnerabilityId: string,
  ): Promise<{ data: AffectedSystem[] }> => {
    const response = await apiClient.get<{ data: AffectedSystem[] }>(
      `/vulnerabilities/${vulnerabilityId}/affected-systems`,
    );
    return response.data;
  },

  // Create new affected system
  create: async (
    data: CreateAffectedSystemRequest,
  ): Promise<{ data: AffectedSystem }> => {
    const response = await apiClient.post<{ data: AffectedSystem }>(
      "/affected-systems",
      data,
    );
    return response.data;
  },

  // Update affected system
  update: async (
    id: string,
    data: UpdateAffectedSystemRequest,
  ): Promise<{ data: AffectedSystem }> => {
    const response = await apiClient.put<{ data: AffectedSystem }>(
      `/affected-systems/${id}`,
      data,
    );
    return response.data;
  },

  // Delete affected system
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/affected-systems/${id}`,
    );
    return response.data;
  },

  // Add affected systems to vulnerability
  addToVulnerability: async (
    vulnerabilityId: string,
    data: { system_ids: string[] },
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/vulnerabilities/${vulnerabilityId}/affected-systems`,
      data,
    );
    return response.data;
  },

  // Remove affected system from vulnerability
  removeFromVulnerability: async (
    vulnerabilityId: string,
    systemId: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/vulnerabilities/${vulnerabilityId}/affected-systems/${systemId}`,
    );
    return response.data;
  },
};
