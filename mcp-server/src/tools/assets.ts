/**
 * Asset Management Tools for CYOPS MCP Server
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
import type { Asset, AssetStats } from "../types.js";

// Zod schemas for validation
const ListAssetsArgsSchema = z.object({
  search: z.string().optional().describe("Search query for asset name, IP, hostname"),
  environment: z.enum(["DEV", "STAGING", "PRODUCTION"]).optional().describe("Filter by environment"),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Filter by criticality level"),
  status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"]).optional().describe("Filter by asset status"),
  page: z.number().int().positive().default(1).describe("Page number for pagination"),
  limit: z.number().int().positive().max(100).default(20).describe("Number of assets per page"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetAssetArgsSchema = z.object({
  id: z.string().describe("Asset ID (UUID)"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const CreateAssetArgsSchema = z.object({
  hostname: z.string().describe("Asset hostname"),
  ip_address: z.string().optional().describe("IP address"),
  environment: z.enum(["DEV", "STAGING", "PRODUCTION"]).describe("Environment"),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Criticality level"),
  description: z.string().optional().describe("Asset description"),
  owner: z.string().optional().describe("Asset owner/team"),
  tags: z.array(z.string()).optional().describe("Asset tags"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

const GetAssetStatsArgsSchema = z.object({
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
});

/**
 * Register all asset management tools
 */
export function registerAssetTools(server: McpServer): void {
  /**
   * Tool: List Assets
   */
  server.registerTool("cyops_list_assets", {
    title: "List CYOPS Assets",
    description: `List and search assets in the CYOPS platform with filtering and pagination.

This tool retrieves infrastructure assets with support for filtering by environment, criticality, status, and text search. Ideal for inventory management, finding specific assets, or analyzing asset distribution.

Args:
  - search (optional): Search query for asset name, IP address, or hostname
  - environment (optional): Filter by environment - "DEV", "STAGING", or "PRODUCTION"
  - criticality (optional): Filter by criticality level - "LOW", "MEDIUM", "HIGH", or "CRITICAL"
  - status (optional): Filter by asset status - "ACTIVE", "INACTIVE", "DECOMMISSIONED", or "MAINTENANCE"
  - page (number): Page number for pagination (default: 1)
  - limit (number): Number of assets per page (1-100, default: 20)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with pagination metadata and asset array
  For Markdown format: Human-readable formatted list with key details

Examples:
  - Use when: "Show me all production assets"
  - Use when: "List critical assets in staging environment"
  - Use when: "Find assets with hostname containing 'web'"
  - Don't use when: Need details on ONE specific asset (use cyops_get_asset instead)

Error Handling:
  - Returns clear error if authentication fails (check CYOPS_API_KEY)
  - Returns empty list if no matches found
  - Provides pagination guidance for large result sets`,
    inputSchema: ListAssetsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = ListAssetsArgsSchema.parse(args);

      // Build query parameters
      const queryParams: Record<string, any> = {
        page: params.page,
        limit: params.limit,
      };

      if (params.search) queryParams.search = params.search;
      if (params.environment) queryParams.environment = params.environment;
      if (params.criticality) queryParams.criticality = params.criticality;
      if (params.status) queryParams.status = params.status;

      const response = await apiClient.get<any>("/assets", queryParams);
      const assets = response.assets || response.data || [];
      const total = response.total || assets.length;

      if (assets.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No assets found matching the criteria."
          }]
        };
      }

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Asset List",
          "",
          formatPaginationMarkdown(createPaginationMetadata(total, assets.length, (params.page - 1) * params.limit)),
          ""
        ];

        for (const asset of assets) {
          lines.push(`## ${asset.hostname}`);
          lines.push("");
          lines.push(formatKeyValue("ID", asset.id));
          lines.push(formatKeyValue("IP Address", asset.ip_address || 'N/A'));
          lines.push(formatKeyValue("Environment", asset.environment));
          lines.push(formatKeyValue("Criticality", asset.criticality));
          lines.push(formatKeyValue("Status", statusBadge(asset.status)));
          lines.push(formatKeyValue("Owner", asset.owner || 'N/A'));
          lines.push("");
        }

        result = lines.join("\n");
      } else {
        result = JSON.stringify({ assets, total, page: params.page, limit: params.limit }, null, 2);
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
   * Tool: Get Asset Details
   */
  server.registerTool("cyops_get_asset", {
    title: "Get CYOPS Asset Details",
    description: `Get detailed information about a specific asset by ID.

This tool retrieves complete details for a single asset, including basic information, environment configuration, criticality level, tags, and metadata.

Args:
  - id (string): Asset UUID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete asset details including:
  - Basic info (hostname, IP address, environment)
  - Criticality level and status
  - Owner and team information
  - Tags for categorization
  - Metadata (created, updated timestamps)

Examples:
  - Use when: "Get details for asset abc-123"
  - Use when: "Show me more information about this server"
  - Don't use when: Searching for assets (use cyops_list_assets instead)

Error Handling:
  - Returns "Error: Resource not found" if ID doesn't exist
  - Returns authentication error if token invalid
  - Suggests using cyops_list_assets if asset ID is unknown`,
    inputSchema: GetAssetArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetAssetArgsSchema.parse(args);
      const asset = await apiClient.get<any>(`/assets/${params.id}`);

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          `# Asset: ${asset.hostname}`,
          "",
          "## Basic Information",
          "",
          formatKeyValue("ID", asset.id),
          formatKeyValue("Hostname", asset.hostname)
        ];

        if (asset.ip_address) lines.push(formatKeyValue("IP Address", asset.ip_address));
        lines.push(formatKeyValue("Environment", asset.environment));
        lines.push(formatKeyValue("Criticality", asset.criticality));
        lines.push(formatKeyValue("Status", statusBadge(asset.status)));
        if (asset.owner) lines.push(formatKeyValue("Owner", asset.owner));
        if (asset.description) lines.push(formatKeyValue("Description", asset.description));

        if (asset.tags && asset.tags.length > 0) {
          lines.push("");
          lines.push("## Tags");
          lines.push("");
          asset.tags.forEach((tag: string) => {
            lines.push(`- ${tag}`);
          });
        }

        lines.push("");
        lines.push("## Metadata");
        lines.push(formatKeyValue("Created", formatDate(asset.created_at)));
        lines.push(formatKeyValue("Last Updated", formatDate(asset.updated_at)));

        result = lines.join("\n");
      } else {
        result = JSON.stringify(asset, null, 2);
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
   * Tool: Create Asset
   */
  server.registerTool("cyops_create_asset", {
    title: "Create CYOPS Asset",
    description: `Create a new infrastructure asset in the CYOPS platform.

This tool creates a new asset record with specified configuration. Used for adding new servers, workstations, or network devices to the inventory.

Args:
  - hostname (string): Asset hostname (required)
  - ip_address (optional): IP address
  - environment (string): Environment - "DEV", "STAGING", or "PRODUCTION" (required)
  - criticality (string): Criticality level - "LOW", "MEDIUM", "HIGH", or "CRITICAL" (required)
  - description (optional): Asset description
  - owner (optional): Asset owner or team name
  - tags (optional): Array of tags for categorization
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Created asset details including generated UUID and initial status

Examples:
  - Use when: "Add a new production server named web-01"
  - Use when: "Create an asset for staging database"
  - Use when: "Register a new critical infrastructure component"
  - Don't use when: Asset already exists (will return duplicate error)

Error Handling:
  - Returns "Error: Duplicate asset" if hostname+environment combination exists
  - Returns validation errors for missing required fields
  - Suggests checking existing assets with cyops_list_assets if uncertain`,
    inputSchema: CreateAssetArgsSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = CreateAssetArgsSchema.parse(args);

      const asset = await apiClient.post<any>("/assets", {
        hostname: params.hostname,
        ip_address: params.ip_address,
        environment: params.environment,
        criticality: params.criticality,
        description: params.description,
        owner: params.owner,
        tags: params.tags,
      });

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Asset Created Successfully ✅",
          "",
          "## Details",
          "",
          formatKeyValue("ID", asset.id),
          formatKeyValue("Hostname", asset.hostname)
        ];

        if (asset.ip_address) lines.push(formatKeyValue("IP Address", asset.ip_address));
        lines.push(formatKeyValue("Environment", asset.environment));
        lines.push(formatKeyValue("Criticality", asset.criticality));
        lines.push(formatKeyValue("Status", statusBadge(asset.status)));

        result = lines.join("\n");
      } else {
        result = JSON.stringify(asset, null, 2);
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
   * Tool: Get Asset Statistics
   */
  server.registerTool("cyops_get_asset_stats", {
    title: "Get CYOPS Asset Statistics",
    description: `Get aggregate statistics and metrics about assets in the platform.

This tool provides high-level dashboard statistics including total asset counts and breakdowns by environment, criticality, and status.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Statistics including:
  - Total asset count
  - Breakdown by environment (DEV, STAGING, PRODUCTION)
  - Breakdown by criticality (LOW, MEDIUM, HIGH, CRITICAL)
  - Breakdown by status (ACTIVE, INACTIVE, DECOMMISSIONED, MAINTENANCE)

Examples:
  - Use when: "What's the current asset inventory overview?"
  - Use when: "How many production assets do we have?"
  - Use when: "Show me asset distribution dashboard"
  - Use when: "Give me a summary of infrastructure assets"

Error Handling:
  - Returns authentication error if token invalid
  - Returns empty statistics if no assets exist`,
    inputSchema: GetAssetStatsArgsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }, async (args) => {
    try {
      const params = GetAssetStatsArgsSchema.parse(args);
      const stats = await apiClient.get<any>("/assets/stats");

      let result: string;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines: string[] = [
          "# Asset Statistics Dashboard",
          "",
          "## Overview",
          "",
          formatKeyValue("Total Assets", stats.total_assets || 0)
        ];

        lines.push("");
        lines.push("## By Environment");
        lines.push("");
        if (stats.by_environment) {
          Object.entries(stats.by_environment).forEach(([env, count]) => {
            lines.push(formatKeyValue(env, count));
          });
        }

        lines.push("");
        lines.push("## By Criticality");
        lines.push("");
        if (stats.by_criticality) {
          Object.entries(stats.by_criticality).forEach(([crit, count]) => {
            lines.push(formatKeyValue(crit, count));
          });
        }

        lines.push("");
        lines.push("## By Status");
        lines.push("");
        if (stats.by_status) {
          Object.entries(stats.by_status).forEach(([status, count]) => {
            lines.push(formatKeyValue(status, count));
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
}
