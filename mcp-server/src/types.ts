/**
 * TypeScript type definitions for CYOPS MCP Server
 */

import {
  VulnerabilitySeverity,
  VulnerabilityStatus,
  AssetStatus,
  AssetCriticality,
  EnvironmentType,
  FindingStatus
} from "./constants.js";

// API Response Types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Pagination Metadata
export interface PaginationMetadata {
  total: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
}

// Vulnerability Types
export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  status: VulnerabilityStatus;
  cvss_score?: number;
  cve_id?: string;
  affected_assets?: string[];
  assignee_id?: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface VulnerabilityStats {
  total_count: number;
  by_severity: Record<VulnerabilitySeverity, number>;
  by_status: Record<VulnerabilityStatus, number>;
  critical_open: number;
  high_open: number;
  average_cvss_score?: number;
}

// Asset Types
export interface Asset {
  id: string;
  hostname: string;
  ip_address?: string;
  environment: EnvironmentType;
  criticality: AssetCriticality;
  status: AssetStatus;
  owner?: string;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface AssetStats {
  total_assets: number;
  by_environment?: Record<string, number>;
  by_criticality?: Record<string, number>;
  by_status?: Record<string, number>;
}

// Finding Types
export interface Finding {
  id: string;
  vulnerability_id: string;
  affected_system_id: string;
  plugin_id?: string;
  plugin_name?: string;
  port?: number;
  protocol?: string;
  status: FindingStatus;
  first_seen: string;
  last_seen: string;
  fixed_at?: string;
  verified_at?: string;
  risk_accepted_at?: string;
  risk_acceptance_reason?: string;
}

// Report Types
export interface AnalystReport {
  summary: {
    total_vulnerabilities: number;
    by_severity: Record<VulnerabilitySeverity, number>;
    by_status: Record<VulnerabilityStatus, number>;
  };
  vulnerabilities: Vulnerability[];
  generated_at: string;
}

export interface ExecutiveReport {
  summary: {
    total_vulnerabilities: number;
    critical_open: number;
    high_open: number;
    average_remediation_time_days?: number;
  };
  trends: {
    new_this_week: number;
    resolved_this_week: number;
  };
  generated_at: string;
}

export interface AuditReport {
  summary: {
    total_vulnerabilities: number;
    total_findings: number;
    compliance_score?: number;
  };
  audit_trail: Array<{
    vulnerability_id: string;
    action: string;
    timestamp: string;
    user: string;
  }>;
  generated_at: string;
}

// Assessment Report Types
export interface AssessmentReport {
  id: string;
  assessment_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  title: string;
  description?: string;
  version: number;
  is_latest: boolean;
  parent_id?: string;
  uploaded_by: string;
  uploaded_by_user?: {
    id: string;
    email: string;
    name?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssessmentReportStats {
  total_reports: number;
  total_versions: number;
  unique_titles: number;
  total_size_bytes?: number;
  latest_upload?: AssessmentReport;
  by_title?: Record<string, number>;
}
