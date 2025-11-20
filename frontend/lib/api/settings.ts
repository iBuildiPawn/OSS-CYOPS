import { apiClient } from "./client";

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface MCPStatus {
  enabled: boolean;
  key: string;
}

export interface ToggleMCPRequest {
  enabled: boolean;
}

export interface ToggleMCPResponse {
  message: string;
  enabled: boolean;
}

// System Settings API functions
export const settingsApi = {
  // Get all system settings
  getAllSettings: async (): Promise<{ settings: SystemSetting[] }> => {
    const response = await apiClient.get<{ settings: SystemSetting[] }>(
      "/settings",
    );
    return response.data;
  },

  // Get specific system setting
  getSetting: async (key: string): Promise<{ setting: SystemSetting }> => {
    const response = await apiClient.get<{ setting: SystemSetting }>(
      `/settings/${key}`,
    );
    return response.data;
  },

  // Update system setting
  updateSetting: async (
    key: string,
    value: string,
    description?: string,
  ): Promise<{ message: string; setting: SystemSetting }> => {
    const response = await apiClient.put<{
      message: string;
      setting: SystemSetting;
    }>(`/settings/${key}`, { value, description });
    return response.data;
  },

  // Get MCP server status
  getMCPStatus: async (): Promise<MCPStatus> => {
    const response = await apiClient.get<MCPStatus>("/settings/mcp/status");
    return response.data;
  },

  // Toggle MCP server
  toggleMCPServer: async (enabled: boolean): Promise<ToggleMCPResponse> => {
    const response = await apiClient.post<ToggleMCPResponse>(
      "/settings/mcp/toggle",
      { enabled },
    );
    return response.data;
  },
};
