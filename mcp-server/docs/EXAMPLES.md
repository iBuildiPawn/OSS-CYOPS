# CYOPS MCP Server - Tool Examples

Practical examples for using all 19 tools in the CYOPS MCP Server.

## Table of Contents

1. [Vulnerability Management Examples](#vulnerability-management-examples)
2. [Asset Management Examples](#asset-management-examples)
3. [Finding Management Examples](#finding-management-examples)
4. [Report Generation Examples](#report-generation-examples)
5. [Assessment Report Examples](#assessment-report-examples)
6. [Real-World Workflows](#real-world-workflows)

---

## Vulnerability Management Examples

### Example 1: Find All Critical Open Vulnerabilities

**Tool**: `cyops_list_vulnerabilities`

```json
{
  "severity": "CRITICAL",
  "status": "OPEN",
  "limit": 50,
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# CYOPS Vulnerabilities

📊 Showing 12 of 12 total results

## CVE-2024-1234: Remote Code Execution in Apache Struts

- **ID**: a1b2c3d4-e5f6-7890-abcd-ef1234567890
- **Severity**: 🔴 CRITICAL
- **Status**: 🔴 OPEN
- **CVSS Score**: 9.8
- **CVE ID**: CVE-2024-1234
- **Assigned To**: alice@example.com
- **Created**: 2024-10-15 10:30:00 UTC
- **Updated**: 2024-10-20 14:45:00 UTC

...
```

---

### Example 2: Search for Log4j Vulnerabilities

**Tool**: `cyops_list_vulnerabilities`

```json
{
  "search": "log4j",
  "response_format": "json"
}
```

**Expected Response**:
```json
{
  "total": 5,
  "count": 5,
  "offset": 0,
  "vulnerabilities": [
    {
      "id": "xyz-123-abc",
      "title": "Log4Shell - Remote Code Execution in Log4j",
      "severity": "CRITICAL",
      "status": "RESOLVED",
      "cvss_score": 10.0,
      "cve_id": "CVE-2021-44228",
      "assignee_name": "Security Team",
      "created_at": "2021-12-10T08:00:00Z",
      "updated_at": "2021-12-15T20:30:00Z"
    }
  ],
  "has_more": false
}
```

---

### Example 3: Get Vulnerability Dashboard Statistics

**Tool**: `cyops_get_vulnerability_stats`

```json
{
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# CYOPS Vulnerability Statistics

- **Total Vulnerabilities**: 487

## By Severity

- **Critical**: 🔴 CRITICAL 23
- **High**: 🟠 HIGH 156
- **Medium**: 🟡 MEDIUM 234
- **Low**: 🟢 LOW 64
- **Info**: ⚪ INFO 10

## By Status

- **Open**: 🔴 OPEN 89
- **In Progress**: 🟡 IN_PROGRESS 45
- **Resolved**: 🟢 RESOLVED 298
- **Closed**: ⚪ CLOSED 55

## Key Metrics

- **Critical Open**: 🔴 8
- **High Open**: 🟠 34
- **Average CVSS Score**: 6.7
```

---

### Example 4: Get Detailed Vulnerability Information

**Tool**: `cyops_get_vulnerability`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# CVE-2024-1234: Remote Code Execution in Apache Struts

- **ID**: a1b2c3d4-e5f6-7890-abcd-ef1234567890
- **Severity**: 🔴 CRITICAL
- **Status**: 🔴 OPEN

## Description

A critical remote code execution vulnerability exists in Apache Struts 2.x
due to improper input validation in the file upload functionality. An
attacker can exploit this vulnerability to execute arbitrary code on the
target system.

- **CVSS Score**: 9.8
- **CVE ID**: CVE-2024-1234

## Assignment

- **Assigned To**: alice@example.com (user-uuid-123)

## Timestamps

- **Created**: 2024-10-15 10:30:00 UTC
- **Updated**: 2024-10-20 14:45:00 UTC

## Affected Assets

- web-prod-01 (asset-uuid-abc)
- web-prod-02 (asset-uuid-def)
- app-staging-05 (asset-uuid-ghi)
```

---

## Asset Management Examples

### Example 5: List All Production Assets

**Tool**: `cyops_list_assets`

```json
{
  "environment": "PRODUCTION",
  "limit": 25,
  "page": 1,
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Asset List

- **Assessment ID**: N/A
- **Total Reports**: 87
- **Include All Versions**: No (Latest Only)

## web-prod-01

- **ID**: asset-123-abc
- **IP Address**: 10.0.1.50
- **Environment**: PRODUCTION
- **Criticality**: HIGH
- **Status**: 🟢 ACTIVE
- **Owner**: DevOps Team

## db-prod-master-01

- **ID**: asset-456-def
- **IP Address**: 10.0.2.10
- **Environment**: PRODUCTION
- **Criticality**: CRITICAL
- **Status**: 🟢 ACTIVE
- **Owner**: Database Team

...
```

---

### Example 6: Create a New Production Web Server Asset

**Tool**: `cyops_create_asset`

```json
{
  "hostname": "web-prod-05",
  "ip_address": "10.0.1.55",
  "environment": "PRODUCTION",
  "criticality": "HIGH",
  "description": "Production web server for customer portal",
  "owner": "DevOps Team",
  "tags": ["web-server", "nginx", "customer-portal", "load-balanced"],
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Asset Created Successfully ✅

## Details

- **ID**: new-asset-uuid-789
- **Hostname**: web-prod-05
- **IP Address**: 10.0.1.55
- **Environment**: PRODUCTION
- **Criticality**: HIGH
- **Status**: 🟢 ACTIVE
```

---

### Example 7: Get Asset Inventory Statistics

**Tool**: `cyops_get_asset_stats`

```json
{
  "response_format": "json"
}
```

**Expected Response**:
```json
{
  "total_assets": 342,
  "by_environment": {
    "DEV": 145,
    "STAGING": 87,
    "PRODUCTION": 110
  },
  "by_criticality": {
    "LOW": 89,
    "MEDIUM": 156,
    "HIGH": 78,
    "CRITICAL": 19
  },
  "by_status": {
    "ACTIVE": 298,
    "INACTIVE": 23,
    "DECOMMISSIONED": 15,
    "MAINTENANCE": 6
  }
}
```

---

### Example 8: Find Critical Assets in Staging

**Tool**: `cyops_list_assets`

```json
{
  "environment": "STAGING",
  "criticality": "CRITICAL",
  "status": "ACTIVE",
  "response_format": "json"
}
```

---

## Finding Management Examples

### Example 9: List Open Findings for a Vulnerability

**Tool**: `cyops_list_findings`

```json
{
  "vulnerability_id": "vuln-uuid-123",
  "status": "OPEN",
  "limit": 20,
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Finding List

📊 Showing 7 of 7 total results

## Finding 1a2b3c4d...

- **Plugin Name**: Apache Struts RCE Detection
- **Port**: 8080
- **Protocol**: TCP
- **Status**: 🔴 OPEN
- **First Seen**: 2024-10-15 10:30:00 UTC
- **Last Seen**: 2024-10-25 09:15:00 UTC

## Finding 5e6f7g8h...

- **Plugin Name**: Apache Struts RCE Detection
- **Port**: 8443
- **Protocol**: TCP
- **Status**: 🔴 OPEN
- **First Seen**: 2024-10-15 10:30:00 UTC
- **Last Seen**: 2024-10-25 09:15:00 UTC

...
```

---

### Example 10: Mark Finding as Fixed

**Tool**: `cyops_mark_finding_fixed`

```json
{
  "id": "finding-uuid-abc-123",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Finding Marked as Fixed ✅

- **Finding ID**: finding-uuid-abc-123
- **Status**: 🟢 FIXED
- **Fixed At**: 2024-10-26 14:30:00 UTC
```

---

### Example 11: Verify a Fixed Finding

**Tool**: `cyops_mark_finding_verified`

```json
{
  "id": "finding-uuid-abc-123",
  "response_format": "json"
}
```

**Expected Response**:
```json
{
  "id": "finding-uuid-abc-123",
  "vulnerability_id": "vuln-uuid-123",
  "affected_system_id": "asset-uuid-456",
  "status": "VERIFIED",
  "plugin_id": "12345",
  "plugin_name": "Apache Struts RCE Detection",
  "port": 8080,
  "protocol": "TCP",
  "first_seen": "2024-10-15T10:30:00Z",
  "last_seen": "2024-10-25T09:15:00Z",
  "fixed_at": "2024-10-26T14:30:00Z",
  "verified_at": "2024-10-27T10:00:00Z"
}
```

---

### Example 12: Get Finding Details with Risk Acceptance

**Tool**: `cyops_get_finding`

```json
{
  "id": "finding-uuid-xyz-789",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Finding Details

## Basic Information

- **ID**: finding-uuid-xyz-789
- **Vulnerability ID**: vuln-uuid-abc
- **Affected System ID**: asset-uuid-def
- **Status**: 🟡 RISK_ACCEPTED
- **Plugin ID**: 67890
- **Plugin Name**: TLS 1.0 Deprecated Protocol Detection
- **Port**: 443
- **Protocol**: TCP

## Timeline

- **First Seen**: 2024-01-15 08:00:00 UTC
- **Last Seen**: 2024-10-25 09:30:00 UTC

## Risk Acceptance

- **Accepted At**: 2024-02-01 10:00:00 UTC
- **Reason**: Legacy system required for compliance. Mitigated by network segmentation and restricted access. Scheduled for decommission Q2 2025.
```

---

## Report Generation Examples

### Example 13: Generate Quarterly Analyst Report

**Tool**: `cyops_get_analyst_report`

```json
{
  "start_date": "2024-07-01",
  "end_date": "2024-09-30",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Analyst Report

- **Generated**: 2024-10-26 15:00:00 UTC

## Summary

- **Total Vulnerabilities**: 134

### By Severity

- **CRITICAL**: 🔴 CRITICAL 8
- **HIGH**: 🟠 HIGH 34
- **MEDIUM**: 🟡 MEDIUM 67
- **LOW**: 🟢 LOW 23
- **INFO**: ⚪ INFO 2

### By Status

- **OPEN**: 🔴 OPEN 23
- **IN_PROGRESS**: 🟡 IN_PROGRESS 15
- **RESOLVED**: 🟢 RESOLVED 89
- **CLOSED**: ⚪ CLOSED 7

## Vulnerabilities

### CVE-2024-5678: SQL Injection in Legacy App

- **Severity**: 🔴 CRITICAL
- **Status**: 🟢 RESOLVED
- **CVSS**: 9.1
- **CVE**: CVE-2024-5678

...
```

---

### Example 14: Generate Executive Summary for Board

**Tool**: `cyops_get_executive_report`

```json
{
  "start_date": "2024-10-01",
  "end_date": "2024-10-31",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Executive Summary Report

- **Generated**: 2024-11-01 09:00:00 UTC

## Key Metrics

- **Total Vulnerabilities**: 487
- **Critical Open**: 🔴 8
- **High Open**: 🟠 34
- **Average Remediation Time**: 14 days

## Trends

- **New This Week**: 12
- **Resolved This Week**: 23
```

---

### Example 15: Generate Compliance Audit Report

**Tool**: `cyops_get_audit_report`

```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "response_format": "json"
}
```

**Expected Response**:
```json
{
  "generated_at": "2024-11-01T09:00:00Z",
  "summary": {
    "total_vulnerabilities": 487,
    "total_findings": 1234,
    "compliance_score": 87.5
  },
  "audit_trail": [
    {
      "vulnerability_id": "vuln-123",
      "action": "STATUS_CHANGED",
      "user": "alice@example.com",
      "timestamp": "2024-10-26T14:30:00Z",
      "details": "Changed from OPEN to RESOLVED"
    },
    ...
  ]
}
```

---

## Assessment Report Examples

### Example 16: List Latest Assessment Reports

**Tool**: `cyops_list_assessment_reports`

```json
{
  "assessment_id": "assessment-uuid-abc-123",
  "include_all_versions": false,
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Assessment Reports

- **Assessment ID**: assessment-uuid-abc-123
- **Total Reports**: 5
- **Include All Versions**: No (Latest Only)

## Penetration Test Report 🟢 Latest

- **Report ID**: report-uuid-123
- **Version**: 3
- **File Name**: pentest_report_v3_final.pdf
- **File Size**: 2.45 MB
- **MIME Type**: application/pdf
- **Uploaded By**: security@example.com
- **Upload Date**: 2024-10-20 16:30:00 UTC

...
```

---

### Example 17: View All Versions of a Report

**Tool**: `cyops_get_report_versions`

```json
{
  "assessment_id": "assessment-uuid-abc-123",
  "report_id": "report-uuid-123",
  "response_format": "markdown"
}
```

**Expected Response**:
```markdown
# Report Version History

- **Report Title**: Penetration Test Report
- **Total Versions**: 3

## Version 3 🟢 LATEST

- **Report ID**: report-uuid-123-v3
- **File Name**: pentest_report_v3_final.pdf
- **File Size**: 2.45 MB
- **Uploaded By**: security@example.com
- **Upload Date**: 2024-10-20 16:30:00 UTC
- **Previous Version ID**: report-uuid-123-v2

## Version 2

- **Report ID**: report-uuid-123-v2
- **File Name**: pentest_report_v2_revised.pdf
- **File Size**: 2.38 MB
- **Uploaded By**: security@example.com
- **Upload Date**: 2024-10-15 14:00:00 UTC
- **Previous Version ID**: report-uuid-123-v1

## Version 1

- **Report ID**: report-uuid-123-v1
- **File Name**: pentest_report_v1_draft.pdf
- **File Size**: 2.12 MB
- **Uploaded By**: security@example.com
- **Upload Date**: 2024-10-10 10:00:00 UTC
```

---

### Example 18: Get Report Statistics

**Tool**: `cyops_get_report_stats`

```json
{
  "assessment_id": "assessment-uuid-abc-123",
  "response_format": "json"
}
```

**Expected Response**:
```json
{
  "assessment_id": "assessment-uuid-abc-123",
  "total_reports": 5,
  "total_versions": 12,
  "unique_titles": 5,
  "total_size_bytes": 15728640,
  "latest_upload": {
    "title": "Penetration Test Report",
    "created_at": "2024-10-20T16:30:00Z"
  },
  "by_title": {
    "Penetration Test Report": 3,
    "Vulnerability Assessment": 2,
    "Risk Analysis": 2,
    "Remediation Plan": 3,
    "Executive Summary": 2
  }
}
```

---

## Real-World Workflows

### Workflow 1: Weekly Vulnerability Triage

```javascript
// Step 1: Get overview
{
  "tool": "cyops_get_vulnerability_stats",
  "params": {}
}

// Step 2: List critical and high priority
{
  "tool": "cyops_list_vulnerabilities",
  "params": {
    "severity": "CRITICAL",
    "status": "OPEN"
  }
}

// Step 3: Get details for each critical vulnerability
{
  "tool": "cyops_get_vulnerability",
  "params": {
    "id": "vuln-id-from-step-2"
  }
}

// Step 4: Check instance-level findings
{
  "tool": "cyops_list_findings",
  "params": {
    "vulnerability_id": "vuln-id-from-step-2",
    "status": "OPEN"
  }
}
```

---

### Workflow 2: Asset Onboarding

```javascript
// Step 1: Check for existing assets
{
  "tool": "cyops_list_assets",
  "params": {
    "search": "web-prod",
    "environment": "PRODUCTION"
  }
}

// Step 2: Create new asset
{
  "tool": "cyops_create_asset",
  "params": {
    "hostname": "web-prod-06",
    "ip_address": "10.0.1.56",
    "environment": "PRODUCTION",
    "criticality": "HIGH",
    "owner": "DevOps Team",
    "tags": ["web-server", "nginx"]
  }
}

// Step 3: Verify creation
{
  "tool": "cyops_get_asset",
  "params": {
    "id": "new-asset-id-from-step-2"
  }
}

// Step 4: Update inventory stats
{
  "tool": "cyops_get_asset_stats",
  "params": {}
}
```

---

### Workflow 3: Finding Remediation Tracking

```javascript
// Step 1: List open findings for vulnerability
{
  "tool": "cyops_list_findings",
  "params": {
    "vulnerability_id": "vuln-123",
    "status": "OPEN"
  }
}

// Step 2: Developer remediates and reports
{
  "tool": "cyops_mark_finding_fixed",
  "params": {
    "id": "finding-abc"
  }
}

// Step 3: Security team re-scans and verifies
{
  "tool": "cyops_mark_finding_verified",
  "params": {
    "id": "finding-abc"
  }
}

// Step 4: Check remaining open findings
{
  "tool": "cyops_list_findings",
  "params": {
    "vulnerability_id": "vuln-123",
    "status": "OPEN"
  }
}
```

---

### Workflow 4: Monthly Reporting to Leadership

```javascript
// Step 1: Generate executive summary
{
  "tool": "cyops_get_executive_report",
  "params": {
    "start_date": "2024-10-01",
    "end_date": "2024-10-31"
  }
}

// Step 2: Generate technical analyst report
{
  "tool": "cyops_get_analyst_report",
  "params": {
    "start_date": "2024-10-01",
    "end_date": "2024-10-31",
    "severity": "CRITICAL"
  }
}

// Step 3: Get current metrics
{
  "tool": "cyops_get_vulnerability_stats",
  "params": {}
}

// Step 4: Get asset inventory status
{
  "tool": "cyops_get_asset_stats",
  "params": {}
}
```

---

### Workflow 5: Assessment Report Management

```javascript
// Step 1: List existing reports
{
  "tool": "cyops_list_assessment_reports",
  "params": {
    "assessment_id": "assessment-123",
    "include_all_versions": false
  }
}

// Step 2: Get statistics
{
  "tool": "cyops_get_report_stats",
  "params": {
    "assessment_id": "assessment-123"
  }
}

// Step 3: View version history of specific report
{
  "tool": "cyops_get_report_versions",
  "params": {
    "assessment_id": "assessment-123",
    "report_id": "report-abc"
  }
}

// Step 4: Get detailed metadata
{
  "tool": "cyops_get_assessment_report",
  "params": {
    "assessment_id": "assessment-123",
    "report_id": "report-abc"
  }
}
```

---

## Error Handling Examples

### Example: Resource Not Found

**Request**:
```json
{
  "tool": "cyops_get_vulnerability",
  "params": {
    "id": "invalid-uuid-12345"
  }
}
```

**Response**:
```
Error: Resource not found. The specified vulnerability ID does not exist.
Suggestion: Use cyops_list_vulnerabilities to find valid vulnerability IDs.
```

---

### Example: Authentication Error

**Request** (missing API key):
```json
{
  "tool": "cyops_list_vulnerabilities",
  "params": {}
}
```

**Response**:
```
Error: Authentication failed. Please check your CYOPS_API_KEY or CYOPS_API_TOKEN environment variable.
```

---

### Example: Duplicate Asset

**Request**:
```json
{
  "tool": "cyops_create_asset",
  "params": {
    "hostname": "web-prod-01",
    "environment": "PRODUCTION",
    "criticality": "HIGH"
  }
}
```

**Response**:
```
Error: Duplicate asset. A asset with this hostname+environment already exists.
Suggestion: Use cyops_list_assets to check existing assets.
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-01
**Total Examples**: 18+ examples covering all 19 tools
