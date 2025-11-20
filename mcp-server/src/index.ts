#!/usr/bin/env node
/**
 * CYOPS MCP Server - Stdio Transport
 *
 * Provides AI assistants with tools to interact with the CYOPS vulnerability
 * management platform API via stdio transport (for Claude Desktop and similar clients).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { API_KEY } from "./constants.js";
import { registerAllTools } from "./tools/index.js";

/**
 * Main function - start the MCP server with stdio transport
 */
async function main() {
  // Verify required environment variables
  if (!API_KEY) {
    console.error("ERROR: CYOPS_API_KEY or CYOPS_API_TOKEN environment variable is required");
    console.error("Please set one of these environment variables to authenticate with CYOPS");
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: "cyops-mcp-server",
    version: "1.0.0"
  });

  // Register all tools
  await registerAllTools(server);

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("CYOPS MCP Server running via stdio");
  console.error(`Backend URL: ${process.env.CYOPS_BACKEND_URL || 'http://localhost:8080/api/v1'}`);
  console.error("Ready to receive tool calls from MCP clients");
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
