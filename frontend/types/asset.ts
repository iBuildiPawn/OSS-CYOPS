// Asset Management Types - Feature 003
// Based on backend/internal/models/affected_system.go and asset_service.go

import type { User } from "./api";

// Enums
export type SystemType =
  | "SERVER"
  | "WORKSTATION"
  | "NETWORK_DEVICE"
  | "APPLICATION"
  | "CONTAINER"
  | "CLOUD_SERVICE"
  | "OTHER";

export type Environment = "PRODUCTION" | "STAGING" | "DEVELOPMENT" | "TEST";

export type AssetCriticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AssetStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DECOMMISSIONED"
  | "UNDER_MAINTENANCE";

// Asset Tag
export interface AssetTag {
  asset_id: string;
  tag: string;
  created_at: string;
}

// Base Asset model
export interface Asset {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // Identification fields
  hostname?: string;
  ip_address?: string;
  asset_id?: string;

  // Classification fields
  system_type: SystemType;
  description?: string;
  environment: Environment;
  criticality?: AssetCriticality;
  status: AssetStatus;

  // Ownership fields
  owner_id?: string;
  owner?: User;
  department?: string;
  location?: string;
  last_scan_date?: string;

  // Relationships
  tags?: AssetTag[];
  vulnerability_count?: number;
  vulnerability_stats?: Record<string, number>;
}

// Asset with vulnerability count (for list responses)
export interface AssetWithVulnCount extends Asset {
  vulnerability_count: number;
}

// Asset list parameters
export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  criticality?: AssetCriticality;
  status?: AssetStatus;
  environment?: Environment;
  system_type?: SystemType;
  owner_id?: string;
  tags?: string[];
  sort_by?: string;
  sort_order?: "ASC" | "DESC";
}

// Asset list response
export interface AssetListResponse {
  data: AssetWithVulnCount[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Asset detail response
export interface AssetDetailResponse {
  asset?: Asset;
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  hostname?: string;
  ip_address?: string;
  asset_id?: string;
  system_type?: SystemType;
  description?: string;
  environment?: Environment;
  criticality?: AssetCriticality;
  status?: AssetStatus;
  owner_id?: string;
  owner?: User;
  department?: string;
  location?: string;
  last_scan_date?: string;
  tags?: AssetTag[];
  vulnerability_count?: number;
  vulnerability_stats?: Record<string, number>;
}

// Create asset request
export interface CreateAssetRequest {
  hostname?: string;
  ip_address?: string;
  asset_id?: string;
  system_type: SystemType;
  description?: string;
  environment: Environment;
  criticality?: AssetCriticality;
  status?: AssetStatus;
  owner_id?: string;
  department?: string;
  location?: string;
  tags?: string[];
}

// Create asset response
export interface CreateAssetResponse {
  asset: Asset;
  duplicate_warning?: boolean;
  similar_assets?: Asset[];
}

// Update asset request (partial updates via map[string]interface{} in backend)
export interface UpdateAssetRequest {
  hostname?: string;
  ip_address?: string;
  asset_id?: string;
  system_type?: SystemType;
  description?: string;
  environment?: Environment;
  criticality?: AssetCriticality;
  status?: AssetStatus;
  owner_id?: string;
  department?: string;
  location?: string;
}

// Duplicate check request
export interface CheckDuplicateRequest {
  hostname?: string;
  ip_address?: string;
  environment: Environment;
}

// Duplicate check response
export interface DuplicateCheckResponse {
  is_duplicate: boolean;
  matches?: Asset[];
  message?: string;
}

// Asset statistics
export interface AssetStats {
  total_assets: number;
  by_criticality: Record<string, number>;
  by_status: Record<string, number>;
  by_environment: Record<string, number>;
  by_system_type: Record<string, number>;
  total_vulnerabilities: number;
  assets_with_critical_vulns: number;
}

// Tag operations
export interface AddTagsRequest {
  tags: string[];
}

export interface RemoveTagRequest {
  tag: string;
}

// Status update request
export interface UpdateAssetStatusRequest {
  status: AssetStatus;
  notes?: string;
}
