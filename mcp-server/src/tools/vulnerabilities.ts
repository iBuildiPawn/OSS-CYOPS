/**
 * Vulnerability management tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { handleApiError } from "../utils/errors.js";
import {
  formatDate,
  truncateResponse,
  formatPaginationMarkdown,
  createPaginationMetadata,
  severityBadge,
  statusBadge,
  formatKeyValue
} from "../utils/formatting.js";
import { ResponseFormat } from "../constants.js";
import {
  ListVulnerabilitiesInputSchema,
  GetVulnerabilityInputSchema,
  GetVulnerabilityStatsInputSchema
} from "../schemas/vulnerabilities.js";

export function registerVulnerabilityTools(server: McpServer): void {
  /**
   * Tool: List Vulnerabilities
   */
  server.registerTool(
    "cyops_list_vulnerabilities",
    {
      title: "List CYOPS Vulnerabilities",
      description: `List and search vulnerabilities in the CYOPS platform.

This tool retrieves vulnerabilities with support for filtering by severity, status, assignee, and text search. It is ideal for getting an overview of current security issues, finding specific vulnerabilities, or analyzing vulnerability trends.

Args:
  - severity (optional): Filter by severity level - "CRITICAL", "HIGH", "MEDIUM", "LOW", or "INFO"
  - status (optional): Filter by status - "OPEN", "IN_PROGRESS", "RESOLVED", or "CLOSED"
  - assignee_id (optional): Filter by assigned analyst user ID
  - search (optional): Search text in title, description, or CVE ID (supports partial matches)
  - limit (number): Maximum results (1-100, default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with schema:
  {
    "total": number,
    "count": number,
    "offset": number,
    "vulnerabilities": [
      {
        "id": string,
        "title": string,
        "severity": string,
        "status": string,
        "cvss_score": number,
        "cve_id": string,
        "assignee_name": string,
        "created_at": string,
        "updated_at": string
      }
    ],
    "has_more": boolean,
    "next_offset": number (if has_more is true)
  }

Examples:
  - Use when: "Show me all critical vulnerabilities" -> {severity: "CRITICAL"}
  - Use when: "List open high-severity issues" -> {severity: "HIGH", status: "OPEN"}
  - Use when: "Find vulnerabilities assigned to analyst X" -> {assignee_id: "user_id"}
  - Use when: "Search for Log4j vulnerabilities" -> {search: "log4j"}
  - Don't use when: Need detailed info on ONE specific vulnerability (use cyops_get_vulnerability instead)

Error Handling:
  - Returns clear error if authentication fails (check CYOPS_API_KEY)
  - Returns empty list if no matches found
  - Provides pagination guidance if results are truncated`,
      inputSchema: ListVulnerabilitiesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => {
      try {
        const params = ListVulnerabilitiesInputSchema.parse(args);

        const queryParams: Record<string, any> = {
          limit: params.limit,
          offset: params.offset
        };

        if (params.severity) queryParams.severity = params.severity;
        if (params.status) queryParams.status = params.status;
        if (params.assignee_id) queryParams.assignee_id = params.assignee_id;
        if (params.search) queryParams.search = params.search;

        const response = await apiClient.get<any>("/vulnerabilities", queryParams);

        const vulnerabilities = response.vulnerabilities || response.data || [];
        const total = response.total || vulnerabilities.length;

        if (vulnerabilities.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No vulnerabilities found matching the specified criteria."
            }]
          };
        }

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [
            "# CYOPS Vulnerabilities",
            "",
            formatPaginationMarkdown(createPaginationMetadata(total, vulnerabilities.length, params.offset)),
            ""
          ];

          for (const vuln of vulnerabilities) {
            lines.push(`## ${vuln.title}`);
            lines.push("");
            lines.push(formatKeyValue("ID", vuln.id));
            lines.push(formatKeyValue("Severity", severityBadge(vuln.severity)));
            lines.push(formatKeyValue("Status", statusBadge(vuln.status)));
            if (vuln.cvss_score) lines.push(formatKeyValue("CVSS Score", vuln.cvss_score));
            if (vuln.cve_id) lines.push(formatKeyValue("CVE ID", vuln.cve_id));
            if (vuln.assignee_name) lines.push(formatKeyValue("Assigned To", vuln.assignee_name));
            lines.push(formatKeyValue("Created", formatDate(vuln.created_at)));
            lines.push(formatKeyValue("Updated", formatDate(vuln.updated_at)));
            lines.push("");
          }

          result = lines.join("\n");
        } else {
          const jsonResponse = {
            ...createPaginationMetadata(total, vulnerabilities.length, params.offset),
            vulnerabilities: vulnerabilities.map((vuln: any) => ({
              id: vuln.id,
              title: vuln.title,
              severity: vuln.severity,
              status: vuln.status,
              cvss_score: vuln.cvss_score,
              cve_id: vuln.cve_id,
              assignee_id: vuln.assignee_id,
              assignee_name: vuln.assignee_name,
              created_at: vuln.created_at,
              updated_at: vuln.updated_at
            }))
          };

          result = JSON.stringify(jsonResponse, null, 2);
        }

        result = truncateResponse(result, vulnerabilities.length);

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
    }
  );

  /**
   * Tool: Get Vulnerability Details
   */
  server.registerTool(
    "cyops_get_vulnerability",
    {
      title: "Get CYOPS Vulnerability Details",
      description: `Get detailed information about a specific vulnerability by ID.

This tool retrieves complete details for a single vulnerability, including description, affected assets, findings, status history, and all metadata.

Args:
  - id (string): Vulnerability UUID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete vulnerability details including:
  - Basic info (title, description, severity, status)
  - CVSS scoring
  - CVE identification
  - Affected assets list
  - Assignment information
  - Timestamps (created, updated, resolved)
  - Related findings

Examples:
  - Use when: "Get details for vulnerability abc-123"
  - Use when: "Show me more information about this CVE"
  - Don't use when: Searching for vulnerabilities (use cyops_list_vulnerabilities instead)

Error Handling:
  - Returns "Error: Resource not found" if ID doesn't exist
  - Returns authentication error if token invalid`,
      inputSchema: GetVulnerabilityInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => {
      try {
        const params = GetVulnerabilityInputSchema.parse(args);
        const vulnerability = await apiClient.get<any>(`/vulnerabilities/${params.id}`);

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [
            `# ${vulnerability.title}`,
            "",
            formatKeyValue("ID", vulnerability.id),
            formatKeyValue("Severity", severityBadge(vulnerability.severity)),
            formatKeyValue("Status", statusBadge(vulnerability.status)),
            "",
            "## Description",
            vulnerability.description || "_No description provided_",
            ""
          ];

          if (vulnerability.cvss_score) {
            lines.push(formatKeyValue("CVSS Score", vulnerability.cvss_score));
          }
          if (vulnerability.cve_id) {
            lines.push(formatKeyValue("CVE ID", vulnerability.cve_id));
          }

          lines.push("");
          lines.push("## Assignment");
          if (vulnerability.assignee_name) {
            lines.push(formatKeyValue("Assigned To", `${vulnerability.assignee_name} (${vulnerability.assignee_id})`));
          } else {
            lines.push("_Not assigned_");
          }

          lines.push("");
          lines.push("## Timestamps");
          lines.push(formatKeyValue("Created", formatDate(vulnerability.created_at)));
          lines.push(formatKeyValue("Updated", formatDate(vulnerability.updated_at)));
          if (vulnerability.resolved_at) {
            lines.push(formatKeyValue("Resolved", formatDate(vulnerability.resolved_at)));
          }

          if (vulnerability.affected_assets && vulnerability.affected_assets.length > 0) {
            lines.push("");
            lines.push("## Affected Assets");
            for (const asset of vulnerability.affected_assets) {
              lines.push(`- ${asset.hostname} (${asset.id})`);
            }
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify(vulnerability, null, 2);
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
    }
  );

  /**
   * Tool: Get Vulnerability Statistics
   */
  server.registerTool(
    "cyops_get_vulnerability_stats",
    {
      title: "Get CYOPS Vulnerability Statistics",
      description: `Get aggregate statistics and metrics about vulnerabilities in the platform.

This tool provides high-level dashboard statistics including counts by severity, status, and key metrics like average CVSS score and open critical/high vulnerabilities.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Statistics including:
  - Total vulnerability count
  - Breakdown by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
  - Breakdown by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
  - Critical and high severity open counts
  - Average CVSS score

Examples:
  - Use when: "What's the current vulnerability overview?"
  - Use when: "How many critical vulnerabilities are open?"
  - Use when: "Show me vulnerability metrics dashboard"

Error Handling:
  - Returns authentication error if token invalid`,
      inputSchema: GetVulnerabilityStatsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => {
      try {
        const params = GetVulnerabilityStatsInputSchema.parse(args);
        const stats = await apiClient.get<any>("/vulnerabilities/stats");

        let result: string;

        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines: string[] = [
            "# CYOPS Vulnerability Statistics",
            "",
            formatKeyValue("Total Vulnerabilities", stats.total_count || 0),
            "",
            "## By Severity",
            formatKeyValue("Critical", `${severityBadge('CRITICAL')} ${stats.by_severity?.CRITICAL || 0}`),
            formatKeyValue("High", `${severityBadge('HIGH')} ${stats.by_severity?.HIGH || 0}`),
            formatKeyValue("Medium", `${severityBadge('MEDIUM')} ${stats.by_severity?.MEDIUM || 0}`),
            formatKeyValue("Low", `${severityBadge('LOW')} ${stats.by_severity?.LOW || 0}`),
            formatKeyValue("Info", `${severityBadge('INFO')} ${stats.by_severity?.INFO || 0}`),
            "",
            "## By Status",
            formatKeyValue("Open", `${statusBadge('OPEN')} ${stats.by_status?.OPEN || 0}`),
            formatKeyValue("In Progress", `${statusBadge('IN_PROGRESS')} ${stats.by_status?.IN_PROGRESS || 0}`),
            formatKeyValue("Resolved", `${statusBadge('RESOLVED')} ${stats.by_status?.RESOLVED || 0}`),
            formatKeyValue("Closed", `${statusBadge('CLOSED')} ${stats.by_status?.CLOSED || 0}`),
            "",
            "## Key Metrics",
            formatKeyValue("Critical Open", `🔴 ${stats.critical_open || 0}`),
            formatKeyValue("High Open", `🟠 ${stats.high_open || 0}`)
          ];

          if (stats.average_cvss_score !== undefined) {
            lines.push(formatKeyValue("Average CVSS Score", stats.average_cvss_score.toFixed(1)));
          }

          result = lines.join("\n");
        } else {
          result = JSON.stringify(stats, null, 2);
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
    }
  );
}
