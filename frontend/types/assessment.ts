/**
 * TypeScript types for Assessment Management
 * Feature: Assessment tracking and management
 */

import type { User } from "./api";
import type { Vulnerability } from "./vulnerability";
import type { Asset } from "./asset";

export type AssessmentType =
  | "INTERNAL_AUDIT"
  | "EXTERNAL_AUDIT"
  | "PENETRATION_TEST"
  | "VULNERABILITY_SCAN"
  | "CODE_REVIEW"
  | "SECURITY_REVIEW"
  | "COMPLIANCE_AUDIT"
  | "THIRD_PARTY_ASSESSMENT";

export type AssessmentStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export interface Assessment {
  id: string;
  name: string;
  description?: string;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  assessor_name: string;
  assessor_organization?: string;
  start_date: string; // ISO date format
  end_date?: string | null; // ISO date format
  report_url?: string;
  executive_summary?: string;
  findings_summary?: string;
  recommendations?: string;
  score?: number | null; // 0-100
  created_by_id: string;
  created_by?: User;
  vulnerabilities?: Vulnerability[];
  assets?: Asset[];
  created_at: string; // ISO datetime format
  updated_at: string; // ISO datetime format
}

export interface CreateAssessmentRequest {
  name: string;
  description?: string;
  assessment_type: AssessmentType;
  assessor_name: string;
  assessor_organization?: string;
  start_date: string; // ISO date format
  end_date?: string; // ISO date format
  vulnerability_ids?: string[];
  asset_ids?: string[];
}

export interface UpdateAssessmentRequest {
  name?: string;
  description?: string;
  status?: AssessmentStatus;
  assessor_name?: string;
  assessor_organization?: string;
  start_date?: string; // ISO date format
  end_date?: string; // ISO date format
  report_url?: string;
  executive_summary?: string;
  findings_summary?: string;
  recommendations?: string;
  score?: number;
}

export interface AssessmentListParams {
  page?: number;
  limit?: number;
  status?: AssessmentStatus;
  type?: AssessmentType;
}

export interface AssessmentListResponse {
  data: Assessment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AssessmentStats {
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ type: string; count: number }>;
  total: number;
}

export interface LinkVulnerabilityRequest {
  vulnerability_id: string;
  notes?: string;
}

export interface LinkAssetRequest {
  asset_id: string;
  notes?: string;
}
