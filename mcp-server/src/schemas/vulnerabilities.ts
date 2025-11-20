/**
 * Zod schemas for vulnerability-related tools
 */

import { z } from "zod";
import { VulnerabilitySeverity, VulnerabilityStatus } from "../constants.js";
import { ResponseFormatSchema, LimitSchema, OffsetSchema, IDSchema } from "./common.js";

/**
 * List vulnerabilities input schema
 */
export const ListVulnerabilitiesInputSchema = z.object({
  severity: z.nativeEnum(VulnerabilitySeverity)
    .optional()
    .describe("Filter by severity level (CRITICAL, HIGH, MEDIUM, LOW, INFO)"),
  status: z.nativeEnum(VulnerabilityStatus)
    .optional()
    .describe("Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)"),
  assignee_id: z.string()
    .optional()
    .describe("Filter by assigned analyst ID"),
  search: z.string()
    .optional()
    .describe("Search in title, description, CVE ID (partial match supported)"),
  limit: LimitSchema,
  offset: OffsetSchema,
  response_format: ResponseFormatSchema
}).strict();

export type ListVulnerabilitiesInput = z.infer<typeof ListVulnerabilitiesInputSchema>;

/**
 * Get vulnerability input schema
 */
export const GetVulnerabilityInputSchema = z.object({
  id: IDSchema.describe("Vulnerability ID"),
  response_format: ResponseFormatSchema
}).strict();

export type GetVulnerabilityInput = z.infer<typeof GetVulnerabilityInputSchema>;

/**
 * Create vulnerability input schema
 */
export const CreateVulnerabilityInputSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters")
    .describe("Vulnerability title/name"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .describe("Detailed description of the vulnerability"),
  severity: z.nativeEnum(VulnerabilitySeverity)
    .describe("Severity level (CRITICAL, HIGH, MEDIUM, LOW, INFO)"),
  cvss_score: z.number()
    .min(0, "CVSS score must be between 0-10")
    .max(10, "CVSS score must be between 0-10")
    .optional()
    .describe("CVSS score (0.0-10.0)"),
  cve_id: z.string()
    .optional()
    .describe("CVE identifier (e.g., CVE-2024-1234)"),
  affected_asset_ids: z.array(z.string())
    .min(1, "At least one affected asset is required")
    .describe("Array of asset IDs affected by this vulnerability"),
  response_format: ResponseFormatSchema
}).strict();

export type CreateVulnerabilityInput = z.infer<typeof CreateVulnerabilityInputSchema>;

/**
 * Update vulnerability status input schema
 */
export const UpdateVulnerabilityStatusInputSchema = z.object({
  id: IDSchema.describe("Vulnerability ID"),
  status: z.nativeEnum(VulnerabilityStatus)
    .describe("New status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)"),
  notes: z.string()
    .optional()
    .describe("Optional notes about the status change"),
  response_format: ResponseFormatSchema
}).strict();

export type UpdateVulnerabilityStatusInput = z.infer<typeof UpdateVulnerabilityStatusInputSchema>;

/**
 * Assign vulnerability input schema
 */
export const AssignVulnerabilityInputSchema = z.object({
  id: IDSchema.describe("Vulnerability ID"),
  assignee_id: z.string()
    .min(1, "Assignee ID cannot be empty")
    .describe("User ID of the analyst to assign this vulnerability to"),
  response_format: ResponseFormatSchema
}).strict();

export type AssignVulnerabilityInput = z.infer<typeof AssignVulnerabilityInputSchema>;

/**
 * Get vulnerability stats input schema
 */
export const GetVulnerabilityStatsInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

export type GetVulnerabilityStatsInput = z.infer<typeof GetVulnerabilityStatsInputSchema>;
