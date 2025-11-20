# CYOPS MCP Server - Tools Documentation

This document provides comprehensive documentation for all tools available in the CYOPS MCP Server.

## Overview

The CYOPS MCP Server provides **19 tools** organized into 5 categories:

- **Vulnerability Management** (3 tools) - Search, retrieve, and analyze vulnerabilities
- **Asset Management** (4 tools) - Manage infrastructure assets and inventory
- **Finding Management** (4 tools) - Track scanner findings and remediation status
- **Report Generation** (3 tools) - Generate analyst, executive, and audit reports
- **Assessment Report Management** (5 tools) - Manage PDF reports attached to assessments

All tools follow MCP best practices with:
- ✅ Service prefix (`cyops_`) to prevent naming conflicts
- ✅ Comprehensive tool annotations (readOnlyHint, destructiveHint, etc.)
- ✅ Detailed descriptions with examples and error handling guidance
- ✅ Support for both JSON and Markdown output formats
- ✅ Proper pagination and character limits

## Table of Contents

1. [Vulnerability Management Tools](#vulnerability-management-tools)
2. [Asset Management Tools](#asset-management-tools)
3. [Finding Management Tools](#finding-management-tools)
4. [Report Generation Tools](#report-generation-tools)
5. [Assessment Report Management Tools](#assessment-report-management-tools)
6. [Common Patterns](#common-patterns)
7. [Authentication](#authentication)
8. [Error Handling](#error-handling)

---

## Vulnerability Management Tools

### `cyops_list_vulnerabilities`

**Title**: List CYOPS Vulnerabilities

**Description**: List and search vulnerabilities with support for filtering by severity, status, assignee, and text search.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `severity` | string | No | Filter by severity: "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO" |
| `status` | string | No | Filter by status: "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED" |
| `assignee_id` | string | No | Filter by assigned analyst user ID |
| `search` | string | No | Search text in title, description, or CVE ID |
| `limit` | number | No | Maximum results (1-100, default: 20) |
| `offset` | number | No | Pagination offset (default: 0) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Total count, pagination metadata
- Vulnerability list with ID, title, severity, status, CVSS score, CVE ID, assignee
- Pagination indicators (has_more, next_offset)

**Example Usage**:
```javascript
// List all critical vulnerabilities
{
  "severity": "CRITICAL"
}

// Search for Log4j vulnerabilities
{
  "search": "log4j",
  "status": "OPEN"
}

// Get paginated results
{
  "limit": 50,
  "offset": 0
}
```

**Use When**:
- "Show me all critical vulnerabilities"
- "List open high-severity issues"
- "Search for vulnerabilities containing 'apache'"

**Don't Use When**:
- Need details on ONE specific vulnerability (use `cyops_get_vulnerability`)

---

### `cyops_get_vulnerability`

**Title**: Get CYOPS Vulnerability Details

**Description**: Get detailed information about a specific vulnerability by ID.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Vulnerability UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Complete vulnerability details including description, CVSS scoring, CVE identification
- Affected assets list
- Assignment information
- Timestamps (created, updated, resolved)

**Example Usage**:
```javascript
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "response_format": "json"
}
```

**Use When**:
- "Get details for vulnerability abc-123"
- "Show me more information about this CVE"

**Don't Use When**:
- Searching for vulnerabilities (use `cyops_list_vulnerabilities`)

---

### `cyops_get_vulnerability_stats`

**Title**: Get CYOPS Vulnerability Statistics

**Description**: Get aggregate statistics and metrics about vulnerabilities in the platform.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Total vulnerability count
- Breakdown by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- Breakdown by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- Critical and high severity open counts
- Average CVSS score

**Example Usage**:
```javascript
{
  "response_format": "markdown"
}
```

**Use When**:
- "What's the current vulnerability overview?"
- "How many critical vulnerabilities are open?"
- "Show me vulnerability metrics dashboard"

---

## Asset Management Tools

### `cyops_list_assets`

**Title**: List CYOPS Assets

**Description**: List and search infrastructure assets with filtering by environment, criticality, status, and text search.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search query for asset name, IP, hostname |
| `environment` | string | No | "DEV", "STAGING", or "PRODUCTION" |
| `criticality` | string | No | "LOW", "MEDIUM", "HIGH", or "CRITICAL" |
| `status` | string | No | "ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE" |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Assets per page (1-100, default: 20) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Asset list with hostname, IP, environment, criticality, status, owner
- Pagination metadata

**Example Usage**:
```javascript
// List production assets
{
  "environment": "PRODUCTION"
}

// Find critical staging assets
{
  "environment": "STAGING",
  "criticality": "CRITICAL"
}
```

**Use When**:
- "Show me all production assets"
- "List critical assets in staging"

**Don't Use When**:
- Need details on ONE specific asset (use `cyops_get_asset`)

---

### `cyops_get_asset`

**Title**: Get CYOPS Asset Details

**Description**: Get detailed information about a specific asset by ID.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Asset UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Complete asset details including hostname, IP, environment, criticality
- Owner and team information
- Tags for categorization
- Metadata (created, updated timestamps)

**Use When**:
- "Get details for asset abc-123"
- "Show me information about this server"

---

### `cyops_create_asset`

**Title**: Create CYOPS Asset

**Description**: Create a new infrastructure asset in the platform.

**Tool Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: false
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hostname` | string | Yes | Asset hostname |
| `ip_address` | string | No | IP address |
| `environment` | string | Yes | "DEV", "STAGING", or "PRODUCTION" |
| `criticality` | string | Yes | "LOW", "MEDIUM", "HIGH", or "CRITICAL" |
| `description` | string | No | Asset description |
| `owner` | string | No | Asset owner or team name |
| `tags` | array | No | Array of tags for categorization |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Created asset details including generated UUID and initial status

**Example Usage**:
```javascript
{
  "hostname": "web-prod-01",
  "ip_address": "10.0.1.50",
  "environment": "PRODUCTION",
  "criticality": "HIGH",
  "owner": "DevOps Team",
  "tags": ["web-server", "nginx", "load-balancer"]
}
```

**Use When**:
- "Add a new production server named web-01"
- "Create an asset for staging database"

**Don't Use When**:
- Asset already exists (will return duplicate error)

---

### `cyops_get_asset_stats`

**Title**: Get CYOPS Asset Statistics

**Description**: Get aggregate statistics and metrics about assets.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Total asset count
- Breakdown by environment, criticality, and status

**Use When**:
- "What's the current asset inventory overview?"
- "How many production assets do we have?"

---

## Finding Management Tools

### `cyops_list_findings`

**Title**: List CYOPS Vulnerability Findings

**Description**: List instance-level vulnerability findings from security scanners.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vulnerability_id` | string | No | Filter by parent vulnerability UUID |
| `affected_system_id` | string | No | Filter by affected system/asset UUID |
| `status` | string | No | "OPEN", "FIXED", "VERIFIED", "RISK_ACCEPTED", "FALSE_POSITIVE" |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Findings per page (1-100, default: 20) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Finding list with plugin details, port/protocol, status, timestamps

**Use When**:
- "Show me all open findings for vulnerability xyz-123"
- "List findings on asset abc-456"

---

### `cyops_get_finding`

**Title**: Get CYOPS Finding Details

**Description**: Get detailed information about a specific vulnerability finding.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Finding UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Complete finding details including plugin info, network details, timeline, risk acceptance data

**Use When**:
- "Get details for finding abc-123"
- "What's the status of finding xyz-456"

---

### `cyops_mark_finding_fixed`

**Title**: Mark CYOPS Finding as Fixed

**Description**: Mark a vulnerability finding as fixed (remediated).

**Tool Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Finding UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Updated finding with FIXED status and fixed_at timestamp

**Use When**:
- "Mark finding abc-123 as fixed"
- "Update finding status to remediated"

**Don't Use When**:
- Verifying a fix (use `cyops_mark_finding_verified`)

---

### `cyops_mark_finding_verified`

**Title**: Mark CYOPS Finding as Verified

**Description**: Mark a finding as verified (fix confirmed through re-scanning).

**Tool Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Finding UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Updated finding with VERIFIED status and verified_at timestamp

**Use When**:
- "Mark finding abc-123 as verified"
- "Confirm remediation for this finding"

---

## Report Generation Tools

### `cyops_get_analyst_report`

**Title**: Generate CYOPS Analyst Report

**Description**: Generate a detailed technical report for security analysts.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (ISO 8601: "2024-01-01") |
| `end_date` | string | No | End date (ISO 8601: "2024-12-31") |
| `severity` | string | No | Filter by severity |
| `status` | string | No | Filter by status |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Summary statistics, detailed vulnerability listings, CVSS scores, CVE identifiers

**Use When**:
- "Generate analyst report for Q4 2024"
- "Show me technical report of critical vulnerabilities"

**Don't Use When**:
- Need executive summary (use `cyops_get_executive_report`)

---

### `cyops_get_executive_report`

**Title**: Generate CYOPS Executive Summary Report

**Description**: Generate a non-technical report for executives and stakeholders.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (ISO 8601) |
| `end_date` | string | No | End date (ISO 8601) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Key metrics, risk indicators, trends, high-level security posture

**Use When**:
- "Generate executive summary for board meeting"
- "Show me high-level security metrics for this quarter"

---

### `cyops_get_audit_report`

**Title**: Generate CYOPS Audit Report

**Description**: Generate compliance audit report with activity trail.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (ISO 8601) |
| `end_date` | string | No | End date (ISO 8601) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Summary metrics, compliance score, audit trail with timestamps

**Use When**:
- "Generate audit report for compliance review"
- "Show me activity trail for last quarter"

---

## Assessment Report Management Tools

### `cyops_list_assessment_reports`

**Title**: List CYOPS Assessment Reports

**Description**: List all PDF reports attached to a security assessment.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assessment_id` | string | Yes | Assessment UUID |
| `include_all_versions` | boolean | No | Include all versions or only latest (default: false) |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- List of reports with metadata, version information, file details

**Use When**:
- "Show me all reports for assessment xyz-123"
- "Display full version history of assessment reports"

---

### `cyops_get_assessment_report`

**Title**: Get CYOPS Assessment Report Details

**Description**: Get detailed metadata about a specific assessment report.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assessment_id` | string | Yes | Assessment UUID |
| `report_id` | string | Yes | Report UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Complete report metadata including file details, upload info, version history

---

### `cyops_get_report_versions`

**Title**: Get CYOPS Report Version History

**Description**: Get complete version history for an assessment report.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assessment_id` | string | Yes | Assessment UUID |
| `report_id` | string | Yes | Report UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- All report versions sorted by version number, version badges, upload history

**Use When**:
- "Show me version history for report xyz-123"
- "Track changes across report versions"

---

### `cyops_get_report_stats`

**Title**: Get CYOPS Assessment Report Statistics

**Description**: Get aggregate statistics about all reports attached to an assessment.

**Tool Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assessment_id` | string | Yes | Assessment UUID |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Total counts, storage usage, upload activity, breakdown by title

**Use When**:
- "How much storage is used by assessment reports?"
- "Get report inventory summary"

---

### `cyops_delete_assessment_report`

**Title**: Delete CYOPS Assessment Report

**Description**: Soft-delete an assessment report (can be recovered by admins).

**Tool Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: true ⚠️
- `idempotentHint`: true
- `openWorldHint`: true

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assessment_id` | string | Yes | Assessment UUID |
| `report_id` | string | Yes | Report UUID to delete |
| `response_format` | string | No | "markdown" or "json" (default: "markdown") |

**Returns**:
- Confirmation message with recovery instructions

**Use When**:
- "Delete report abc-123 from assessment xyz-456"
- "Remove this outdated assessment report"

**⚠️ Warning**: This is a destructive operation. Use with caution.

---

## Common Patterns

### Response Formats

All tools support two output formats:

**Markdown** (default):
- Human-readable formatted text
- Uses headers, lists, badges, and formatting
- Converts timestamps to readable format
- Ideal for presenting to users

**JSON**:
- Machine-readable structured data
- Includes all available fields and metadata
- Consistent field names and types
- Ideal for programmatic processing

### Pagination

List tools use consistent pagination:

**Parameters**:
- `limit`: Number of items per page (max 100)
- `offset` or `page`: Starting position

**Returns**:
- `total`: Total item count
- `count`: Items in current response
- `has_more`: Boolean indicating more results
- `next_offset`: Offset for next page

### Filtering

Common filter parameters:
- **Severity**: CRITICAL, HIGH, MEDIUM, LOW, INFO
- **Status**: OPEN, IN_PROGRESS, RESOLVED, CLOSED, RISK_ACCEPTED, VERIFIED, FIXED
- **Environment**: DEV, STAGING, PRODUCTION
- **Criticality**: LOW, MEDIUM, HIGH, CRITICAL

---

## Authentication

All tools require authentication via API key:

**Environment Variable**:
```bash
export CYOPS_API_KEY="your-api-key-here"
# OR
export CYOPS_API_TOKEN="your-api-token-here"
```

**Error Response**:
```
Error: Authentication failed. Please check your CYOPS_API_KEY or CYOPS_API_TOKEN environment variable.
```

---

## Error Handling

All tools follow consistent error handling patterns:

### Common Errors

**Resource Not Found (404)**:
```
Error: Resource not found. The specified [resource] ID does not exist.
Suggestion: Use kfm_list_[resources] to find valid IDs.
```

**Authentication Error (401)**:
```
Error: Authentication failed. Please check your CYOPS_API_KEY environment variable.
```

**Validation Error (400)**:
```
Error: Invalid input. [Specific validation message]
Suggestion: [Actionable guidance]
```

**Duplicate Resource (409)**:
```
Error: Duplicate asset. A [resource] with this [identifier] already exists.
Suggestion: Use kfm_list_[resources] to check existing resources.
```

### Error Response Format

Errors are returned within the tool result (not as protocol-level errors):
```javascript
{
  "content": [{
    "type": "text",
    "text": "Error: [error message]\nSuggestion: [actionable guidance]"
  }]
}
```

This allows AI agents to see errors and take corrective action.

---

## Tool Annotations Reference

| Annotation | Values | Meaning |
|------------|--------|---------|
| `readOnlyHint` | true/false | Tool does not modify environment |
| `destructiveHint` | true/false | Tool may perform destructive updates |
| `idempotentHint` | true/false | Repeated calls have no additional effect |
| `openWorldHint` | true/false | Tool interacts with external entities |

**Note**: All CYOPS tools have `openWorldHint: true` since they interact with the external API.

---

## Additional Resources

- **README**: [../README.md](../README.md) - Setup and configuration
- **Quick Reference**: [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Cheat sheet
- **MCP Best Practices**: Referenced in implementation

---

**Version**: 1.0.0
**Last Updated**: 2025-11-01
**Total Tools**: 19
