# CYOPS MCP Server - Quick Reference

Quick reference guide for all 19 tools available in the CYOPS MCP Server.

## Tool Categories

| Category | Tools | Read-Only | Write | Destructive |
|----------|-------|-----------|-------|-------------|
| **Vulnerability Management** | 3 | 3 | 0 | 0 |
| **Asset Management** | 4 | 3 | 1 | 0 |
| **Finding Management** | 4 | 2 | 2 | 0 |
| **Report Generation** | 3 | 3 | 0 | 0 |
| **Assessment Reports** | 5 | 4 | 0 | 1 |
| **TOTAL** | **19** | **15** | **3** | **1** |

---

## Vulnerability Management (3 tools)

### List Vulnerabilities
```
Tool: cyops_list_vulnerabilities
Purpose: Search and filter vulnerabilities
Key Params: severity, status, search, limit, offset
Returns: Paginated vulnerability list
```

### Get Vulnerability
```
Tool: cyops_get_vulnerability
Purpose: Get single vulnerability details
Key Params: id
Returns: Complete vulnerability info with affected assets
```

### Get Vulnerability Stats
```
Tool: cyops_get_vulnerability_stats
Purpose: Dashboard statistics
Key Params: (none)
Returns: Counts by severity/status, CVSS avg
```

---

## Asset Management (4 tools)

### List Assets
```
Tool: cyops_list_assets
Purpose: Search infrastructure assets
Key Params: environment, criticality, status, search, page, limit
Returns: Paginated asset list
```

### Get Asset
```
Tool: cyops_get_asset
Purpose: Get single asset details
Key Params: id
Returns: Complete asset info with tags and metadata
```

### Create Asset ✏️
```
Tool: kfm_create_asset
Purpose: Add new infrastructure asset
Key Params: hostname*, environment*, criticality*
Returns: Created asset with UUID
* = required
```

### Get Asset Stats
```
Tool: cyops_get_asset_stats
Purpose: Asset inventory statistics
Key Params: (none)
Returns: Counts by environment/criticality/status
```

---

## Finding Management (4 tools)

### List Findings
```
Tool: cyops_list_findings
Purpose: List scanner findings
Key Params: vulnerability_id, affected_system_id, status, page, limit
Returns: Paginated finding list
```

### Get Finding
```
Tool: cyops_get_finding
Purpose: Get single finding details
Key Params: id
Returns: Complete finding info with timeline
```

### Mark Finding Fixed ✏️
```
Tool: kfm_mark_finding_fixed
Purpose: Mark finding as remediated
Key Params: id
Returns: Updated finding with FIXED status
```

### Mark Finding Verified ✏️
```
Tool: kfm_mark_finding_verified
Purpose: Mark finding as verified
Key Params: id
Returns: Updated finding with VERIFIED status
```

---

## Report Generation (3 tools)

### Get Analyst Report
```
Tool: kfm_get_analyst_report
Purpose: Generate technical analyst report
Key Params: start_date, end_date, severity, status
Returns: Detailed vulnerability report with CVSS/CVE
```

### Get Executive Report
```
Tool: kfm_get_executive_report
Purpose: Generate executive summary
Key Params: start_date, end_date
Returns: High-level metrics and trends
```

### Get Audit Report
```
Tool: kfm_get_audit_report
Purpose: Generate compliance audit report
Key Params: start_date, end_date
Returns: Audit trail and compliance metrics
```

---

## Assessment Report Management (5 tools)

### List Assessment Reports
```
Tool: kfm_list_assessment_reports
Purpose: List PDF reports for assessment
Key Params: assessment_id*, include_all_versions
Returns: Report list with version info
* = required
```

### Get Assessment Report
```
Tool: kfm_get_assessment_report
Purpose: Get single report metadata
Key Params: assessment_id*, report_id*
Returns: Complete report metadata
* = required
```

### Get Report Versions
```
Tool: kfm_get_report_versions
Purpose: Get version history
Key Params: assessment_id*, report_id*
Returns: All versions sorted by number
* = required
```

### Get Report Stats
```
Tool: kfm_get_report_stats
Purpose: Report statistics
Key Params: assessment_id*
Returns: Counts, storage usage, upload activity
* = required
```

### Delete Assessment Report ⚠️
```
Tool: kfm_delete_assessment_report
Purpose: Soft-delete report (recoverable)
Key Params: assessment_id*, report_id*
Returns: Confirmation with recovery instructions
* = required
⚠️ DESTRUCTIVE OPERATION
```

---

## Common Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `response_format` | string | "markdown", "json" | Output format (default: markdown) |
| `limit` | number | 1-100 | Items per page (default: 20) |
| `offset` | number | 0+ | Pagination offset (default: 0) |
| `page` | number | 1+ | Page number (default: 1) |
| `severity` | string | CRITICAL, HIGH, MEDIUM, LOW, INFO | Vulnerability severity |
| `status` | string | OPEN, IN_PROGRESS, RESOLVED, CLOSED | Status filter |
| `environment` | string | DEV, STAGING, PRODUCTION | Asset environment |
| `criticality` | string | LOW, MEDIUM, HIGH, CRITICAL | Asset criticality |

---

## Response Formats

### Markdown (Default)
- Human-readable formatted text
- Headers, lists, badges
- Readable timestamps
- Best for: Presenting to users

### JSON
- Machine-readable structured data
- Complete field set
- ISO 8601 timestamps
- Best for: Programmatic processing

---

## Pagination Patterns

### Offset-Based (Vulnerabilities, Findings)
```javascript
{
  "limit": 20,
  "offset": 0  // First page
}

// Response includes:
{
  "total": 150,
  "count": 20,
  "offset": 0,
  "has_more": true,
  "next_offset": 20
}
```

### Page-Based (Assets)
```javascript
{
  "page": 1,
  "limit": 20
}

// Response includes:
{
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

## Authentication Setup

```bash
# Set API key (choose one)
export CYOPS_API_KEY="your-api-key-here"
# OR
export CYOPS_API_TOKEN="your-api-token-here"

# Set backend URL (optional)
export CYOPS_BACKEND_URL="http://localhost:8080/api/v1"
```

---

## Tool Annotations Summary

| Tool | Read-Only | Destructive | Idempotent | Open-World |
|------|-----------|-------------|------------|------------|
| All vulnerability tools | ✅ | ❌ | ✅ | ✅ |
| `cyops_list_assets` | ✅ | ❌ | ✅ | ✅ |
| `cyops_get_asset` | ✅ | ❌ | ✅ | ✅ |
| `cyops_create_asset` | ❌ | ❌ | ❌ | ✅ |
| `cyops_get_asset_stats` | ✅ | ❌ | ✅ | ✅ |
| `cyops_list_findings` | ✅ | ❌ | ✅ | ✅ |
| `cyops_get_finding` | ✅ | ❌ | ✅ | ✅ |
| `cyops_mark_finding_fixed` | ❌ | ❌ | ✅ | ✅ |
| `cyops_mark_finding_verified` | ❌ | ❌ | ✅ | ✅ |
| All report generation tools | ✅ | ❌ | ✅ | ✅ |
| `cyops_list_assessment_reports` | ✅ | ❌ | ✅ | ✅ |
| `cyops_get_assessment_report` | ✅ | ❌ | ✅ | ✅ |
| `cyops_get_report_versions` | ✅ | ❌ | ✅ | ✅ |
| `cyops_get_report_stats` | ✅ | ❌ | ✅ | ✅ |
| `cyops_delete_assessment_report` | ❌ | ⚠️ | ✅ | ✅ |

**Legend**:
- ✅ = Yes / True
- ❌ = No / False
- ⚠️ = Destructive operation (use with caution)

---

## Common Workflows

### 1. Vulnerability Triage
```
1. cyops_get_vulnerability_stats → Overview
2. cyops_list_vulnerabilities (severity: CRITICAL) → Critical issues
3. cyops_get_vulnerability (id: ...) → Details for each
4. cyops_list_findings (vulnerability_id: ...) → Instance-level findings
```

### 2. Asset Inventory
```
1. cyops_get_asset_stats → Overview
2. cyops_list_assets (environment: PRODUCTION) → Prod assets
3. cyops_get_asset (id: ...) → Details
4. kfm_create_asset → Add new asset
```

### 3. Finding Remediation
```
1. cyops_list_findings (status: OPEN) → Open findings
2. cyops_get_finding (id: ...) → Finding details
3. kfm_mark_finding_fixed (id: ...) → Mark as fixed
4. kfm_mark_finding_verified (id: ...) → Verify fix
```

### 4. Report Generation
```
# For analysts:
kfm_get_analyst_report (start_date: ..., end_date: ...)

# For executives:
kfm_get_executive_report (start_date: ..., end_date: ...)

# For compliance:
kfm_get_audit_report (start_date: ..., end_date: ...)
```

### 5. Assessment Report Management
```
1. kfm_list_assessment_reports (assessment_id: ...) → List reports
2. kfm_get_assessment_report → Get details
3. kfm_get_report_versions → View history
4. kfm_get_report_stats → Storage metrics
```

---

## Error Codes Quick Reference

| HTTP Code | Error Type | Common Causes |
|-----------|------------|---------------|
| 400 | Bad Request | Invalid parameters, validation errors |
| 401 | Unauthorized | Missing/invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Backend service issue |

---

## Tips & Best Practices

### Search Optimization
- Use specific filters to reduce result sets
- Leverage pagination for large datasets
- Use `response_format: "json"` for programmatic processing

### Performance
- Request only needed data (use filters)
- Respect character limits (25,000 chars)
- Use stats endpoints for overviews before detailed queries

### Error Handling
- Check error messages for actionable guidance
- Validate IDs using list endpoints before get operations
- Verify API key is set correctly if auth fails

### Workflow Efficiency
- Use stats endpoints for dashboards
- Combine filters to narrow results
- Cache frequently accessed static data

---

## Symbol Legend

| Symbol | Meaning |
|--------|---------|
| ✏️ | Write operation (modifies data) |
| ⚠️ | Destructive operation (use with caution) |
| * | Required parameter |
| ✅ | Yes / Enabled |
| ❌ | No / Disabled |

---

## Additional Resources

- **Full Documentation**: [TOOLS.md](TOOLS.md)
- **README**: [../README.md](../README.md)
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Version**: 1.0.0
**Last Updated**: 2025-11-01
**Total Tools**: 19 (15 read-only, 3 write, 1 destructive)
