import { apiClient } from "./client";

// Integration Configuration API functions
export const integrationConfigApi = {
  // Create integration configuration
  create: async (data: {
    name: string;
    type: string;
    base_url: string;
    access_key: string;
    secret_key: string;
    config?: Record<string, any>;
    auto_sync?: boolean;
    sync_interval_mins?: number;
  }): Promise<{ message: string; data: any }> => {
    const response = await apiClient.post(
      "/vulnerabilities/integrations/configs",
      data,
    );
    return response.data;
  },

  // List integration configurations
  list: async (type?: string): Promise<{ data: any[] }> => {
    const params = type ? { type } : {};
    const response = await apiClient.get(
      "/vulnerabilities/integrations/configs",
      { params },
    );
    return response.data;
  },

  // Get single integration configuration
  get: async (id: string): Promise<{ data: any }> => {
    const response = await apiClient.get(
      `/vulnerabilities/integrations/configs/${id}`,
    );
    return response.data;
  },

  // Update integration configuration
  update: async (
    id: string,
    data: {
      name?: string;
      base_url?: string;
      access_key?: string;
      secret_key?: string;
      config?: Record<string, any>;
      active?: boolean;
      auto_sync?: boolean;
      sync_interval_mins?: number;
    },
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(
      `/vulnerabilities/integrations/configs/${id}`,
      data,
    );
    return response.data;
  },

  // Delete integration configuration
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/vulnerabilities/integrations/configs/${id}`,
    );
    return response.data;
  },

  // Test connection
  testConnection: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/vulnerabilities/integrations/configs/${id}/test`,
    );
    return response.data;
  },
};

// Nessus Integration API Types
export interface NessusScan {
  id: number;
  uuid: string;
  name: string;
  status: string;
  creation_date: number;
  last_modification_date: number;
  folder_id: number;
  read: boolean;
  shared: boolean;
  user_permissions: number;
  owner: string;
}

export interface NessusScanDetail {
  info: {
    uuid: string;
    name: string;
    status: string;
    scan_start: number;
    scan_end: number;
    targets: string;
    hostcount: number;
    vulnerabilitycount: number;
  };
  hosts: Array<{
    host_id: number;
    hostname: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }>;
  vulnerabilities: Array<{
    plugin_id: number;
    plugin_name: string;
    plugin_family: string;
    count: number;
    severity_index: number;
  }>;
}

export interface NessusScanPreview {
  scan_id: number;
  total_vulnerabilities: number;
  total_affected_hosts: number;
  unique_hosts: number;
  severity_breakdown: {
    CRITICAL?: number;
    HIGH?: number;
    MEDIUM?: number;
    LOW?: number;
    NONE?: number;
  };
  vulnerabilities_preview: Array<any>;
}

export interface ImportScanRequest {
  environment?: string;
  auto_create_assets?: boolean;
  update_existing?: boolean;
  default_assignee_id?: string | null;
}

export interface ImportMultipleScansRequest extends ImportScanRequest {
  scan_ids: number[];
}

export interface ImportAllScansRequest extends ImportScanRequest {
  status_filter?: "completed" | "running" | "all";
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  assets_created: number;
  findings_created: number;
  errors: string[];
}

export interface ImportMultipleResult extends ImportResult {
  scan_results: Array<{
    scan_id: number;
    status: "success" | "failed";
    vulnerabilities_found?: number;
    error?: string;
  }>;
  summary: {
    scans_requested: number;
    scans_succeeded: number;
    scans_failed: number;
  };
}

export interface ImportAllResult extends ImportResult {
  summary: {
    total_scans_found: number;
    scans_imported: number;
    scans_succeeded: number;
    scans_failed: number;
  };
}

// Nessus Integration API
export const nessusIntegrationApi = {
  // List all available scans from Nessus
  listScans: async (
    configId: string,
  ): Promise<{ data: NessusScan[]; count: number }> => {
    const response = await apiClient.get<{ data: NessusScan[]; count: number }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans`,
    );
    return response.data;
  },

  // Get scan details
  getScanDetails: async (
    configId: string,
    scanId: number,
  ): Promise<{ data: NessusScanDetail }> => {
    const response = await apiClient.get<{ data: NessusScanDetail }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans/${scanId}`,
    );
    return response.data;
  },

  // Preview scan before importing
  previewScan: async (
    configId: string,
    scanId: number,
  ): Promise<{ data: NessusScanPreview }> => {
    const response = await apiClient.get<{ data: NessusScanPreview }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans/${scanId}/preview`,
    );
    return response.data;
  },

  // Import single scan
  importScan: async (
    configId: string,
    scanId: number,
    data: ImportScanRequest,
  ): Promise<{ message: string; data: ImportResult }> => {
    const response = await apiClient.post<{
      message: string;
      data: ImportResult;
    }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans/${scanId}/import`,
      data,
    );
    return response.data;
  },

  // Import multiple scans
  importMultipleScans: async (
    configId: string,
    data: ImportMultipleScansRequest,
  ): Promise<{ message: string; data: ImportMultipleResult }> => {
    const response = await apiClient.post<{
      message: string;
      data: ImportMultipleResult;
    }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans/import-multiple`,
      data,
    );
    return response.data;
  },

  // Import all scans
  importAllScans: async (
    configId: string,
    data: ImportAllScansRequest,
  ): Promise<{ message: string; data: ImportAllResult }> => {
    const response = await apiClient.post<{
      message: string;
      data: ImportAllResult;
    }>(
      `/vulnerabilities/integrations/nessus/${configId}/scans/import-all`,
      data,
    );
    return response.data;
  },
};
