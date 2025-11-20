/**
 * Finding Management Tools for CYOPS MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../services/api-client.js";
import { handleApiError } from "../utils/errors.js";
import {
  formatDate,
  formatKeyValue,
  statusBadge,
  formatPaginationMarkdown,
  createPaginationMetadata
} from "../utils/formatting.js";
import { ResponseFormat } from "../constants.js";
import type { Finding } from "../types.js";

// Zod schemas for validation
const ListFindingsArgsSchema = z.object({
  vulnerability_id: z.string().optional().describe("Filter by vulnerability ID"),
  affected_system_id: z.string().optional().describe("Filter by affected system ID"),
  status: z.enum(["OPEN", "FIXED", "VERIFIED", "RISK_ACCEPTED", "FALSE_POSITIVE"]).optional().describe("Filter by finding status"),
  page: z.number().int().positive().default(1).describe("Page number for pagination"),
  limit: z.number().int().positive().max(100).default(20).describe("Number of findings per page"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetFindingArgsSchema = z.object({
  id: z.string().describe("Finding ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const MarkFindingFixedArgsSchema = z.object({
  id: z.string().describe("Finding ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const MarkFindingVerifiedArgsSchema = z.object({
  id: z.string().describe("Finding ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

/**
 * Register all finding management tools
 */
export function registerFindingTools(server: McpServer): void {
  /**
   * Tool: List Findings
   */
  server.registerTool("cyops_list_findings", {
    title: "List CYOPS Vulnerability Findings",
    description: `List and search vulnerability findings (scanner detections) with filtering and pagination.

This tool retrieves instance-level vulnerability findings from security scanners like Nessus. Findings represent specific detected instances on assets, including port/protocol details and remediation tracking.

Args:
  - vulnerability_id (optional): Filter by parent vulnerability UUID
  - affected_system_id (optional): Filter by affected system/asset UUID
  - status (optional): Filter by finding status - "OPEN", "FIXED", "VERIFIED", "RISK_ACCEPTED", or "FALSE_POSITIVE"
  - page (number): Page number for pagination (default: 1)
  - limit (number): Number of findings per page (1-100, default: 20)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with pagination metadata and findings array
  For Markdown format: Human-readable formatted list with key details

Examples:
  - Use when: "Show me all open findings for vulnerability xyz-123"
  - Use when: "List findings on asset abc-456"
  - Use when: "Find all verified findings"
  - Use when: "Show findings with status RISK_ACCEPTED"
  - Don't use when: Need details on ONE specific finding (use cyops_get_finding instead)

Error Handling:
  - Returns clear error if authentication fails (check CYOPS_API_KEY)
  - Returns empty list if no matches found
  - Provides pagination guidance for large result sets`,
    inputSchema: ListFindingsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = ListFindingsArgsSchema.parse(args);

      // Build query parameters
      const queryParams: Record<string, any> = {
        page: params.page,
        limit: params.limit,
      };

      if (params.vulnerability_id) queryParams.vulnerability_id = params.vulnerability_id;
      if (params.affected_system_id) queryParams.affected_system_id = params.affected_system_id;
      if (params.status) queryParams.status = params.status;

      const response = await apiClient.get<any>("/findings", queryParams);
      const findings = response.findings || response.data || [];
      const total = response.total || findings.length;

      if (findings.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No findings found matching the criteria."
          }]
        };
      }

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Finding List",
          "",
          formatPaginationMarkdown(createPaginationMetadata(total, findings.length, (params.page - 1) * params.limit)),
          ""
        ];

        for (const finding of findings) {
          const shortId = finding.id.substring(0, 8);
          lines.push(`## Finding ${shortId}...`);
          lines.push("");
          lines.push(formatKeyValue("Plugin Name", finding.plugin_name || 'N/A'));
          lines.push(formatKeyValue("Port", finding.port || 'N/A'));
          lines.push(formatKeyValue("Protocol", finding.protocol || 'N/A'));
          lines.push(formatKeyValue("Status", statusBadge(finding.status)));
          lines.push(formatKeyValue("First Seen", formatDate(finding.first_seen)));
          lines.push(formatKeyValue("Last Seen", formatDate(finding.last_seen)));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ findings, total, page: params.page, limit: params.limit }, null, 2);
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
   * Tool: Get Finding Details
   */
  server.registerTool("cyops_get_finding", {
    title: "Get CYOPS Finding Details",
    description: `Get detailed information about a specific vulnerability finding by ID.

This tool retrieves complete details for a single finding, including plugin information, port/protocol details, status timeline, and risk acceptance data.

Args:
  - id (string): Finding UUID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete finding details including:
  - Basic info (vulnerability ID, affected system ID, status)
  - Scanner plugin details (plugin ID, plugin name)
  - Network details (port, protocol)
  - Timeline (first seen, last seen, fixed at, verified at)
  - Risk acceptance information (if applicable)

Examples:
  - Use when: "Get details for finding abc-123"
  - Use when: "Show me more information about this detection"
  - Use when: "What's the status of finding xyz-456"
  - Don't use when: Searching for findings (use cyops_list_findings instead)

Error Handling:
  - Returns "Error: Resource not found" if ID doesn't exist
  - Returns authentication error if token invalid
  - Suggests using cyops_list_findings if finding ID is unknown`,
    inputSchema: GetFindingArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetFindingArgsSchema.parse(args);
      const finding = await apiClient.get<any>(`/findings/${params.id}`);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Finding Details",
          "",
          "## Basic Information",
          "",
          formatKeyValue("ID", finding.id),
          formatKeyValue("Vulnerability ID", finding.vulnerability_id),
          formatKeyValue("Affected System ID", finding.affected_system_id),
          formatKeyValue("Status", statusBadge(finding.status))
        ];

        if (finding.plugin_id) lines.push(formatKeyValue("Plugin ID", finding.plugin_id));
        if (finding.plugin_name) lines.push(formatKeyValue("Plugin Name", finding.plugin_name));
        if (finding.port) lines.push(formatKeyValue("Port", finding.port));
        if (finding.protocol) lines.push(formatKeyValue("Protocol", finding.protocol));

        lines.push("");
        lines.push("## Timeline");
        lines.push(formatKeyValue("First Seen", formatDate(finding.first_seen)));
        lines.push(formatKeyValue("Last Seen", formatDate(finding.last_seen)));
        if (finding.fixed_at) lines.push(formatKeyValue("Fixed At", formatDate(finding.fixed_at)));
        if (finding.verified_at) lines.push(formatKeyValue("Verified At", formatDate(finding.verified_at)));

        if (finding.risk_accepted_at) {
          lines.push("");
          lines.push("## Risk Acceptance");
          lines.push(formatKeyValue("Accepted At", formatDate(finding.risk_accepted_at)));
          if (finding.risk_acceptance_reason) {
            lines.push(formatKeyValue("Reason", finding.risk_acceptance_reason));
          }
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify(finding, null, 2);
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
   * Tool: Mark Finding as Fixed
   */
  server.registerTool("cyops_mark_finding_fixed", {
    title: "Mark CYOPS Finding as Fixed",
    description: `Mark a vulnerability finding as fixed (remediated).

This tool updates a finding's status to FIXED, indicating that remediation has been completed. The fixed timestamp is automatically recorded.

Args:
  - id (string): Finding UUID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Updated finding with FIXED status and fixed_at timestamp

Examples:
  - Use when: "Mark finding abc-123 as fixed"
  - Use when: "Update finding status to remediated"
  - Use when: "Confirm fix for this vulnerability detection"
  - Don't use when: Verifying a fix (use kfm_mark_finding_verified instead)

Error Handling:
  - Returns "Error: Resource not found" if finding ID doesn't exist
  - Returns validation error if finding already in FIXED or VERIFIED state
  - Suggests using cyops_list_findings to confirm finding exists`,
    inputSchema: MarkFindingFixedArgsSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = MarkFindingFixedArgsSchema.parse(args);

      const finding = await apiClient.patch<any>(`/findings/${params.id}/status`, {
        status: "FIXED"
      });

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Finding Marked as Fixed ✅",
          "",
          formatKeyValue("Finding ID", finding.id),
          formatKeyValue("Status", statusBadge(finding.status)),
          formatKeyValue("Fixed At", finding.fixed_at ? formatDate(finding.fixed_at) : 'Now')
        ];

        result = lines.join("\n");
      } else {
        result = JSON.stringify(finding, null, 2);
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
   * Tool: Mark Finding as Verified
   */
  server.registerTool("cyops_mark_finding_verified", {
    title: "Mark CYOPS Finding as Verified",
    description: `Mark a vulnerability finding as verified (fix confirmed through re-scanning or validation).

This tool updates a finding's status to VERIFIED, indicating that remediation has been confirmed. The verified timestamp is automatically recorded.

Args:
  - id (string): Finding UUID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Updated finding with VERIFIED status and verified_at timestamp

Examples:
  - Use when: "Mark finding abc-123 as verified"
  - Use when: "Confirm remediation for this finding"
  - Use when: "Verify the fix has been validated"
  - Don't use when: Just marking as fixed (use kfm_mark_finding_fixed first)

Error Handling:
  - Returns "Error: Resource not found" if finding ID doesn't exist
  - Returns validation error if finding is not in FIXED state
  - Suggests marking as FIXED first if attempting to verify non-fixed finding`,
    inputSchema: MarkFindingVerifiedArgsSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = MarkFindingVerifiedArgsSchema.parse(args);

      const finding = await apiClient.patch<any>(`/findings/${params.id}/status`, {
        status: "VERIFIED"
      });

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Finding Marked as Verified ✅",
          "",
          formatKeyValue("Finding ID", finding.id),
          formatKeyValue("Status", statusBadge(finding.status)),
          formatKeyValue("Verified At", finding.verified_at ? formatDate(finding.verified_at) : 'Now')
        ];

        result = lines.join("\n");
      } else {
        result = JSON.stringify(finding, null, 2);
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
