import { apiClient, type ApiResponse } from "./client";
import type {
  APIKey,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  UpdateAPIKeyStatusRequest,
} from "@/types/api-key";

interface ListAPIKeysResponse {
  api_keys: APIKey[];
  total: number;
}

export const apiKeyApi = {
  // List all API keys for the authenticated user
  list: async (): Promise<APIKey[]> => {
    const response = await apiClient.get<ListAPIKeysResponse>("/api-keys");
    return response.data.api_keys;
  },

  // Get a specific API key by ID
  get: async (id: string): Promise<APIKey> => {
    const response = await apiClient.get<APIKey>(`/api-keys/${id}`);
    return response.data;
  },

  // Create a new API key
  create: async (data: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> => {
    const response = await apiClient.post<CreateAPIKeyResponse>(
      "/api-keys",
      data,
    );
    return response.data;
  },

  // Update API key status
  updateStatus: async (
    id: string,
    data: UpdateAPIKeyStatusRequest,
  ): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(
      `/api-keys/${id}/status`,
      data,
    );
    return response.data;
  },

  // Revoke an API key (permanent)
  revoke: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/api-keys/${id}/revoke`,
    );
    return response.data;
  },

  // Delete an API key (soft delete)
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/api-keys/${id}`,
    );
    return response.data;
  },
};
