/**
 * Assessment Report Management Tools for CYOPS MCP Server
 * Tools for managing PDF reports attached to assessments
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../services/api-client.js";
import { handleApiError } from "../utils/errors.js";
import {
  formatDate,
  formatKeyValue
} from "../utils/formatting.js";
import { ResponseFormat } from "../constants.js";
import type { AssessmentReport } from "../types.js";

// Zod schemas for validation
const ListAssessmentReportsArgsSchema = z.object({
  assessment_id: z.string().describe("Assessment ID (UUID)"),
  include_all_versions: z.boolean().default(false).describe("Include all versions of reports or only latest"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetAssessmentReportArgsSchema = z.object({
  assessment_id: z.string().describe("Assessment ID (UUID)"),
  report_id: z.string().describe("Report ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetReportVersionsArgsSchema = z.object({
  assessment_id: z.string().describe("Assessment ID (UUID)"),
  report_id: z.string().describe("Report ID (UUID) - will get all versions of this report's title"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetReportStatsArgsSchema = z.object({
  assessment_id: z.string().describe("Assessment ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const DeleteAssessmentReportArgsSchema = z.object({
  assessment_id: z.string().describe("Assessment ID (UUID)"),
  report_id: z.string().describe("Report ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

/**
 * Helper function to format file size from bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Register all assessment report management tools
 */
export function registerAssessmentReportTools(server: McpServer): void {
  /**
   * Tool: List Assessment Reports
   */
  server.registerTool("cyops_list_assessment_reports", {
    title: "List CYOPS Assessment Reports",
    description: `List all PDF reports attached to a security assessment with optional version history.

This tool retrieves assessment report documents (typically PDF files) that have been uploaded to a specific assessment. Supports viewing all versions or just the latest version of each report.

Args:
  - assessment_id (string): Assessment UUID (required)
  - include_all_versions (boolean): Include all report versions or only latest (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of reports with metadata including:
  - Report title and version information
  - File details (name, size, MIME type)
  - Upload information (uploader, timestamp)
  - Version badges (latest vs. historical)

Examples:
  - Use when: "Show me all reports for assessment xyz-123"
  - Use when: "List latest versions of assessment documents"
  - Use when: "Display full version history of assessment reports"
  - Don't use when: Need report content (this returns metadata only)

Error Handling:
  - Returns "Error: Resource not found" if assessment ID doesn't exist
  - Returns empty list if no reports attached to assessment
  - Suggests using kfm_get_assessment_report for specific report details`,
    inputSchema: ListAssessmentReportsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = ListAssessmentReportsArgsSchema.parse(args);

      const queryParams: Record<string, any> = {
        include_all_versions: params.include_all_versions,
      };

      const response = await apiClient.get<any>(
        `/assessments/${params.assessment_id}/reports`,
        queryParams
      );

      const reports = response.data || [];
      const meta = response.meta || {};

      if (reports.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No reports found for this assessment."
          }]
        };
      }

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Assessment Reports",
          "",
          formatKeyValue("Assessment ID", params.assessment_id),
          formatKeyValue("Total Reports", meta.count || reports.length),
          formatKeyValue("Include All Versions", params.include_all_versions ? "Yes" : "No (Latest Only)"),
          ""
        ];

        for (const report of reports) {
          const versionBadge = report.is_latest ? "🟢 Latest" : `v${report.version}`;
          lines.push(`## ${report.title} ${versionBadge}`);
          lines.push("");
          lines.push(formatKeyValue("Report ID", report.id));
          lines.push(formatKeyValue("Version", report.version));
          lines.push(formatKeyValue("File Name", report.original_name));
          lines.push(formatKeyValue("File Size", formatBytes(report.file_size)));
          lines.push(formatKeyValue("MIME Type", report.mime_type));

          if (report.description) {
            lines.push(formatKeyValue("Description", report.description));
          }

          if (report.uploaded_by_user) {
            lines.push(formatKeyValue("Uploaded By", report.uploaded_by_user.email || report.uploaded_by));
          } else {
            lines.push(formatKeyValue("Uploaded By", report.uploaded_by));
          }

          lines.push(formatKeyValue("Upload Date", formatDate(report.created_at)));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ reports, meta }, null, 2);
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
   * Tool: Get Assessment Report Details
   */
  server.registerTool("cyops_get_assessment_report", {
    title: "Get CYOPS Assessment Report Details",
    description: `Get detailed metadata about a specific assessment report document.

This tool retrieves complete metadata for a single assessment report, including file information, version details, upload history, and storage location.

Args:
  - assessment_id (string): Assessment UUID (required)
  - report_id (string): Report UUID (required)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete report metadata including:
  - Report title and version information
  - File details (original name, storage name, size, MIME type, path)
  - Upload information (uploader details, timestamps)
  - Version history (parent report ID if applicable)

Examples:
  - Use when: "Get details for report abc-123 in assessment xyz-456"
  - Use when: "Show me metadata for this assessment report"
  - Don't use when: Searching for reports (use kfm_list_assessment_reports instead)

Error Handling:
  - Returns "Error: Resource not found" if assessment or report ID doesn't exist
  - Suggests using kfm_list_assessment_reports if report ID is unknown`,
    inputSchema: GetAssessmentReportArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetAssessmentReportArgsSchema.parse(args);

      const response = await apiClient.get<any>(
        `/assessments/${params.assessment_id}/reports/${params.report_id}`
      );

      const report = response.data || response;

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const versionBadge = report.is_latest ? "🟢 Latest Version" : `Version ${report.version}`;
        const lines: string[] = [
          `# ${report.title}`,
          "",
          `**${versionBadge}**`,
          "",
          "## Report Information",
          "",
          formatKeyValue("Report ID", report.id),
          formatKeyValue("Assessment ID", report.assessment_id),
          formatKeyValue("Title", report.title),
          formatKeyValue("Version", report.version),
          formatKeyValue("Is Latest", report.is_latest ? "Yes" : "No"),
        ];

        if (report.description) {
          lines.push(formatKeyValue("Description", report.description));
        }

        lines.push("");
        lines.push("## File Details");
        lines.push("");
        lines.push(formatKeyValue("Original Filename", report.original_name));
        lines.push(formatKeyValue("Storage Filename", report.filename));
        lines.push(formatKeyValue("File Size", formatBytes(report.file_size)));
        lines.push(formatKeyValue("MIME Type", report.mime_type));
        lines.push(formatKeyValue("Storage Path", report.storage_path));

        lines.push("");
        lines.push("## Upload Information");
        lines.push("");

        if (report.uploaded_by_user) {
          lines.push(formatKeyValue("Uploaded By", report.uploaded_by_user.email || report.uploaded_by_user.name));
        } else {
          lines.push(formatKeyValue("Uploaded By (ID)", report.uploaded_by));
        }

        lines.push(formatKeyValue("Upload Date", formatDate(report.created_at)));
        lines.push(formatKeyValue("Last Modified", formatDate(report.updated_at)));

        if (report.parent_id) {
          lines.push("");
          lines.push("## Version History");
          lines.push("");
          lines.push(formatKeyValue("Parent Report ID", report.parent_id));
          lines.push("ℹ️  This is an updated version of a previous report");
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
   * Tool: Get Report Version History
   */
  server.registerTool("cyops_get_report_versions", {
    title: "Get CYOPS Report Version History",
    description: `Get complete version history for an assessment report, showing all revisions and changes over time.

This tool retrieves all versions of a report document, sorted by version number (newest first), including upload history and uploader information.

Args:
  - assessment_id (string): Assessment UUID (required)
  - report_id (string): Report UUID - retrieves all versions sharing the same title (required)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Version history including:
  - All report versions sorted by version number (descending)
  - Latest version badge indicator
  - File details for each version (name, size)
  - Upload information (uploader, timestamp)
  - Parent-child version relationships

Examples:
  - Use when: "Show me version history for report xyz-123"
  - Use when: "List all revisions of this assessment report"
  - Use when: "Track changes across report versions"
  - Don't use when: Need single version details (use kfm_get_assessment_report instead)

Error Handling:
  - Returns "Error: Resource not found" if assessment or report doesn't exist
  - Returns empty history if only one version exists
  - Provides guidance on uploading new versions if needed`,
    inputSchema: GetReportVersionsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetReportVersionsArgsSchema.parse(args);

      const response = await apiClient.get<any>(
        `/assessments/${params.assessment_id}/reports/${params.report_id}/versions`
      );

      const versions = response.data || [];
      const meta = response.meta || {};

      if (versions.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No version history found for this report."
          }]
        };
      }

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Report Version History",
          "",
          formatKeyValue("Report Title", meta.title || "Unknown"),
          formatKeyValue("Total Versions", meta.count || versions.length),
          ""
        ];

        // Sort versions by version number descending (newest first)
        const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

        for (const version of sortedVersions) {
          const badge = version.is_latest ? "🟢 LATEST" : "";
          lines.push(`## Version ${version.version} ${badge}`);
          lines.push("");
          lines.push(formatKeyValue("Report ID", version.id));
          lines.push(formatKeyValue("File Name", version.original_name));
          lines.push(formatKeyValue("File Size", formatBytes(version.file_size)));

          if (version.description) {
            lines.push(formatKeyValue("Description", version.description));
          }

          if (version.uploaded_by_user) {
            lines.push(formatKeyValue("Uploaded By", version.uploaded_by_user.email));
          }

          lines.push(formatKeyValue("Upload Date", formatDate(version.created_at)));

          if (version.parent_id) {
            lines.push(formatKeyValue("Previous Version ID", version.parent_id));
          }

          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ versions, meta }, null, 2);
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
   * Tool: Get Report Statistics
   */
  server.registerTool("cyops_get_report_stats", {
    title: "Get CYOPS Assessment Report Statistics",
    description: `Get aggregate statistics about all reports attached to an assessment.

This tool provides summary metrics about assessment reports including counts, storage usage, and upload activity. Useful for inventory management and storage tracking.

Args:
  - assessment_id (string): Assessment UUID (required)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Statistics including:
  - Total report count and version count
  - Unique report titles
  - Total storage space used
  - Latest upload information
  - Breakdown by report title (versions per title)

Examples:
  - Use when: "Show me report statistics for assessment xyz-123"
  - Use when: "How much storage is used by assessment reports?"
  - Use when: "Get report inventory summary"
  - Don't use when: Need specific report details (use kfm_list_assessment_reports instead)

Error Handling:
  - Returns "Error: Resource not found" if assessment doesn't exist
  - Returns zero statistics if no reports attached`,
    inputSchema: GetReportStatsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetReportStatsArgsSchema.parse(args);

      const response = await apiClient.get<any>(
        `/assessments/${params.assessment_id}/reports/stats`
      );

      const stats = response.data || response;

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Assessment Report Statistics",
          "",
          formatKeyValue("Assessment ID", params.assessment_id),
          "",
          "## Overview",
          "",
          formatKeyValue("Total Reports", stats.total_reports || 0),
          formatKeyValue("Total Versions", stats.total_versions || 0),
          formatKeyValue("Unique Titles", stats.unique_titles || 0),
        ];

        if (stats.total_size_bytes !== undefined) {
          lines.push(formatKeyValue("Total Storage Used", formatBytes(stats.total_size_bytes)));
        }

        if (stats.latest_upload) {
          lines.push("");
          lines.push("## Latest Upload");
          lines.push("");
          lines.push(formatKeyValue("Title", stats.latest_upload.title));
          lines.push(formatKeyValue("Upload Date", formatDate(stats.latest_upload.created_at)));
        }

        if (stats.by_title && Object.keys(stats.by_title).length > 0) {
          lines.push("");
          lines.push("## Reports by Title");
          lines.push("");
          Object.entries(stats.by_title).forEach(([title, count]) => {
            lines.push(formatKeyValue(title, `${count} version(s)`));
          });
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
  });

  /**
   * Tool: Delete Assessment Report
   */
  server.registerTool("cyops_delete_assessment_report", {
    title: "Delete CYOPS Assessment Report",
    description: `Soft-delete an assessment report document (can be recovered by administrators).

This tool marks a report as deleted without permanently removing it from storage. Deleted reports can be recovered by administrators if needed. Use with caution.

Args:
  - assessment_id (string): Assessment UUID (required)
  - report_id (string): Report UUID to delete (required)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Confirmation message with assessment ID and report ID

Examples:
  - Use when: "Delete report abc-123 from assessment xyz-456"
  - Use when: "Remove this outdated assessment report"
  - Don't use when: Just want to hide report (consider version management instead)

Error Handling:
  - Returns "Error: Resource not found" if assessment or report doesn't exist
  - Returns error if lacking delete permissions
  - Provides recovery instructions if deletion was accidental`,
    inputSchema: DeleteAssessmentReportArgsSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = DeleteAssessmentReportArgsSchema.parse(args);

      await apiClient.delete(
        `/assessments/${params.assessment_id}/reports/${params.report_id}`
      );

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        result = [
          "# Report Deleted Successfully ✅",
          "",
          formatKeyValue("Assessment ID", params.assessment_id),
          formatKeyValue("Report ID", params.report_id),
          "",
          "ℹ️  The report has been soft-deleted and can be recovered by administrators if needed."
        ].join("\n");
      } else {
        result = JSON.stringify({
          success: true,
          message: "Report deleted successfully",
          assessment_id: params.assessment_id,
          report_id: params.report_id
        }, null, 2);
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
