/**
 * Report Generation Tools for CYOPS MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../services/api-client.js";
import { handleApiError } from "../utils/errors.js";
import {
  formatDate,
  formatKeyValue,
  severityBadge,
  statusBadge
} from "../utils/formatting.js";
import { ResponseFormat } from "../constants.js";
import type { AnalystReport, ExecutiveReport, AuditReport } from "../types.js";

// Zod schemas for validation
const GetAnalystReportArgsSchema = z.object({
  start_date: z.string().optional().describe("Start date for report (ISO 8601 format)"),
  end_date: z.string().optional().describe("End date for report (ISO 8601 format)"),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional().describe("Filter by severity"),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "RISK_ACCEPTED"]).optional().describe("Filter by status"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetExecutiveReportArgsSchema = z.object({
  start_date: z.string().optional().describe("Start date for report (ISO 8601 format)"),
  end_date: z.string().optional().describe("End date for report (ISO 8601 format)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetAuditReportArgsSchema = z.object({
  start_date: z.string().optional().describe("Start date for report (ISO 8601 format)"),
  end_date: z.string().optional().describe("End date for report (ISO 8601 format)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

/**
 * Register all report generation tools
 */
export function registerReportTools(server: McpServer): void {
  /**
   * Tool: Get Analyst Report
   */
  server.registerTool("cyops_get_analyst_report", {
    title: "Generate CYOPS Analyst Report",
    description: `Generate a detailed analyst report with vulnerability breakdown, severity distribution, and comprehensive details.

This tool creates a technical report designed for security analysts, including detailed vulnerability listings, CVSS scores, CVE identifiers, and status breakdowns. Supports filtering by date range, severity, and status.

Args:
  - start_date (optional): Start date for report period (ISO 8601 format, e.g., "2024-01-01")
  - end_date (optional): End date for report period (ISO 8601 format, e.g., "2024-12-31")
  - severity (optional): Filter by severity - "CRITICAL", "HIGH", "MEDIUM", "LOW", or "INFO"
  - status (optional): Filter by status - "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", or "RISK_ACCEPTED"
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Comprehensive analyst report including:
  - Summary statistics (total count, severity breakdown, status breakdown)
  - Detailed vulnerability listings with CVSS scores
  - CVE identifiers and references
  - Assignment and remediation details

Examples:
  - Use when: "Generate an analyst report for Q4 2024"
  - Use when: "Show me a technical report of critical vulnerabilities"
  - Use when: "Create analyst report for open high-severity issues"
  - Don't use when: Need executive summary (use kfm_get_executive_report instead)

Error Handling:
  - Returns authentication error if token invalid
  - Returns empty report if no vulnerabilities match criteria
  - Validates date formats and provides guidance if invalid`,
    inputSchema: GetAnalystReportArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetAnalystReportArgsSchema.parse(args);

      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (params.start_date) queryParams.start_date = params.start_date;
      if (params.end_date) queryParams.end_date = params.end_date;
      if (params.severity) queryParams.severity = params.severity;
      if (params.status) queryParams.status = params.status;

      const report = await apiClient.get<any>("/reports/analyst", queryParams);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Analyst Report",
          "",
          formatKeyValue("Generated", formatDate(report.generated_at)),
          "",
          "## Summary",
          "",
          formatKeyValue("Total Vulnerabilities", report.summary.total_vulnerabilities)
        ];

        lines.push("");
        lines.push("### By Severity");
        lines.push("");
        if (report.summary.by_severity) {
          Object.entries(report.summary.by_severity).forEach(([severity, count]) => {
            lines.push(formatKeyValue(severity, `${severityBadge(severity)} ${count}`));
          });
        }

        lines.push("");
        lines.push("### By Status");
        lines.push("");
        if (report.summary.by_status) {
          Object.entries(report.summary.by_status).forEach(([status, count]) => {
            lines.push(formatKeyValue(status, `${statusBadge(status)} ${count}`));
          });
        }

        if (report.vulnerabilities && report.vulnerabilities.length > 0) {
          lines.push("");
          lines.push("## Vulnerabilities");
          lines.push("");
          report.vulnerabilities.forEach((vuln: any) => {
            lines.push(`### ${vuln.title}`);
            lines.push("");
            lines.push(formatKeyValue("Severity", severityBadge(vuln.severity)));
            lines.push(formatKeyValue("Status", statusBadge(vuln.status)));
            if (vuln.cvss_score) lines.push(formatKeyValue("CVSS", vuln.cvss_score.toFixed(1)));
            if (vuln.cve_id) lines.push(formatKeyValue("CVE", vuln.cve_id));
            lines.push("");
          });
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify(report, null, 2);
      }

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  });

  /**
   * Tool: Get Executive Report
   */
  server.registerTool("cyops_get_executive_report", {
    title: "Generate CYOPS Executive Summary Report",
    description: `Generate an executive summary report with high-level metrics, key performance indicators, and security trends.

This tool creates a non-technical report designed for executives and stakeholders, focusing on business impact metrics, risk exposure, remediation trends, and compliance posture. Ideal for board presentations and leadership updates.

Args:
  - start_date (optional): Start date for report period (ISO 8601 format, e.g., "2024-01-01")
  - end_date (optional): End date for report period (ISO 8601 format, e.g., "2024-12-31")
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Executive summary including:
  - Key metrics (total vulnerabilities, critical/high open counts)
  - Risk indicators (average CVSS score, remediation time)
  - Trends (new vs. resolved this week/month)
  - High-level security posture assessment

Examples:
  - Use when: "Generate executive summary for board meeting"
  - Use when: "Show me high-level security metrics for this quarter"
  - Use when: "Create leadership report on vulnerability trends"
  - Don't use when: Need technical details (use kfm_get_analyst_report instead)

Error Handling:
  - Returns authentication error if token invalid
  - Returns summary with zeros if no data available
  - Validates date formats and provides guidance if invalid`,
    inputSchema: GetExecutiveReportArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetExecutiveReportArgsSchema.parse(args);

      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (params.start_date) queryParams.start_date = params.start_date;
      if (params.end_date) queryParams.end_date = params.end_date;

      const report = await apiClient.get<any>("/reports/executive", queryParams);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Executive Summary Report",
          "",
          formatKeyValue("Generated", formatDate(report.generated_at)),
          "",
          "## Key Metrics",
          "",
          formatKeyValue("Total Vulnerabilities", report.summary.total_vulnerabilities),
          formatKeyValue("Critical Open", `🔴 ${report.summary.critical_open}`),
          formatKeyValue("High Open", `🟠 ${report.summary.high_open}`)
        ];

        if (report.summary.average_remediation_time_days !== undefined) {
          lines.push(formatKeyValue("Average Remediation Time", `${report.summary.average_remediation_time_days} days`));
        }

        lines.push("");
        lines.push("## Trends");
        lines.push(formatKeyValue("New This Week", report.trends.new_this_week));
        lines.push(formatKeyValue("Resolved This Week", report.trends.resolved_this_week));

        result = lines.join("\n");
      } else {
        result = JSON.stringify(report, null, 2);
      }

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  });

  /**
   * Tool: Get Audit Report
   */
  server.registerTool("cyops_get_audit_report", {
    title: "Generate CYOPS Audit Report",
    description: `Generate a compliance audit report with activity trail, findings history, and regulatory metrics.

This tool creates an audit report designed for compliance officers and auditors, including detailed activity logs, status change history, compliance scores, and regulatory tracking. Supports filtering by date range for specific audit periods.

Args:
  - start_date (optional): Start date for audit period (ISO 8601 format, e.g., "2024-01-01")
  - end_date (optional): End date for audit period (ISO 8601 format, e.g., "2024-12-31")
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Audit report including:
  - Summary metrics (total vulnerabilities, findings count)
  - Compliance score and posture
  - Audit trail with timestamps and user actions
  - Regulatory compliance indicators

Examples:
  - Use when: "Generate audit report for compliance review"
  - Use when: "Show me activity trail for last quarter"
  - Use when: "Create audit log for regulatory submission"
  - Use when: "Provide compliance audit for ISO 27001 assessment"
  - Don't use when: Need vulnerability details (use kfm_get_analyst_report instead)

Error Handling:
  - Returns authentication error if token invalid
  - Returns empty audit trail if no activities in period
  - Validates date formats and provides guidance if invalid`,
    inputSchema: GetAuditReportArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetAuditReportArgsSchema.parse(args);

      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (params.start_date) queryParams.start_date = params.start_date;
      if (params.end_date) queryParams.end_date = params.end_date;

      const report = await apiClient.get<any>("/reports/audit", queryParams);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Audit Report",
          "",
          formatKeyValue("Generated", formatDate(report.generated_at)),
          "",
          "## Summary",
          "",
          formatKeyValue("Total Vulnerabilities", report.summary.total_vulnerabilities),
          formatKeyValue("Total Findings", report.summary.total_findings)
        ];

        if (report.summary.compliance_score !== undefined) {
          lines.push(formatKeyValue("Compliance Score", `${report.summary.compliance_score}%`));
        }

        if (report.audit_trail && report.audit_trail.length > 0) {
          lines.push("");
          lines.push("## Audit Trail");
          lines.push("");
          report.audit_trail.forEach((entry: any) => {
            const vulnId = entry.vulnerability_id.substring(0, 8);
            const timestamp = formatDate(entry.timestamp);
            lines.push(`- **${vulnId}...** | ${entry.action} | ${entry.user} | ${timestamp}`);
          });
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify(report, null, 2);
      }

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  });
}
