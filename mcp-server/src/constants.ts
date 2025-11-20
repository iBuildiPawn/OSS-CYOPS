/**
 * Constants and enums for CYOPS MCP Server
 */

// API Configuration
export const API_BASE_URL = process.env.CYOPS_BACKEND_URL || "http://localhost:8080/api/v1";
// Support both CYOPS_API_KEY (new) and CYOPS_API_TOKEN (legacy) for backward compatibility
export const API_KEY = process.env.CYOPS_API_KEY || process.env.CYOPS_API_TOKEN || "";
export const CHARACTER_LIMIT = 25000; // Maximum response size in characters
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Response Formats
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Vulnerability Severity Levels
export enum VulnerabilitySeverity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO"
}

// Vulnerability Status
export enum VulnerabilityStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED"
}

// Asset Status
export enum AssetStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DECOMMISSIONED = "DECOMMISSIONED"
}

// Asset Criticality
export enum AssetCriticality {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW"
}

// Environment Types
export enum EnvironmentType {
  PRODUCTION = "PRODUCTION",
  STAGING = "STAGING",
  DEVELOPMENT = "DEVELOPMENT",
  TESTING = "TESTING"
}

// Finding Status
export enum FindingStatus {
  OPEN = "OPEN",
  FIXED = "FIXED",
  VERIFIED = "VERIFIED",
  RISK_ACCEPTED = "RISK_ACCEPTED",
  FALSE_POSITIVE = "FALSE_POSITIVE"
}

// Pagination defaults
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_OFFSET = 0;
