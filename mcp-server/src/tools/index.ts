/**
 * Tool registration module
 * Registers all MCP tools with a server instance
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerVulnerabilityTools } from "./vulnerabilities.js";
import { registerAssetTools } from "./assets.js";
import { registerFindingTools } from "./findings.js";
import { registerReportTools } from "./reports.js";
import { registerAssessmentReportTools } from "./assessment-reports.js";

/**
 * Register all tools with an MCP server instance
 * Total: 19 tools (3 vulnerability + 4 asset + 4 finding + 3 report + 5 assessment report)
 */
export async function registerAllTools(server: McpServer): Promise<void> {
  // Register vulnerability management tools (3 tools)
  registerVulnerabilityTools(server);

  // Register asset management tools (4 tools)
  registerAssetTools(server);

  // Register finding management tools (4 tools)
  registerFindingTools(server);

  // Register report generation tools (3 tools)
  registerReportTools(server);

  // Register assessment report management tools (5 tools)
  registerAssessmentReportTools(server);
}
