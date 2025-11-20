#!/usr/bin/env node
/**
 * CYOPS MCP Server - HTTP/SSE Transport
 *
 * Provides HTTP-based access to the MCP server using Server-Sent Events (SSE)
 * for server-to-client streaming and HTTP POST for client-to-server messages.
 */

import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { API_KEY } from "./constants.js";
import { registerAllTools } from "./tools/index.js";

const DEFAULT_PORT = 3001;
const port = parseInt(process.env.MCP_PORT || String(DEFAULT_PORT));
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

/**
 * Main HTTP server implementation
 */
async function main() {
  // Verify required environment variables
  if (!API_KEY) {
    console.error("ERROR: CYOPS_API_KEY or CYOPS_API_TOKEN environment variable is required");
    console.error("Please set one of these environment variables to authenticate with CYOPS");
    process.exit(1);
  }

  const app = express();

  // Middleware
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'cyops-mcp-server',
      version: '1.0.0',
      transport: 'http-sse',
      backend: process.env.CYOPS_BACKEND_URL || 'http://localhost:8080/api/v1'
    });
  });

  // Store active sessions
  const sessions = new Map<string, { server: McpServer; transport: SSEServerTransport }>();

  /**
   * SSE endpoint - establishes server-to-client event stream
   * Client connects here first to receive server messages
   */
  app.get('/mcp/sse', async (req, res) => {
    console.error('[SSE] New SSE connection request');

    // Create new MCP server instance for this session
    const server = new McpServer({
      name: "cyops-mcp-server",
      version: "1.0.0"
    });

    // Register all tools
    await registerAllTools(server);

    // Create SSE transport
    const transport = new SSEServerTransport('/mcp/message', res, {
      allowedOrigins,
      enableDnsRebindingProtection: true,
    });

    // Store session
    const sessionId = transport.sessionId;
    sessions.set(sessionId, { server, transport });
    console.error(`[SSE] Session created: ${sessionId}`);

    // Handle transport close
    transport.onclose = () => {
      console.error(`[SSE] Session closed: ${sessionId}`);
      sessions.delete(sessionId);
    };

    transport.onerror = (error) => {
      console.error(`[SSE] Transport error for session ${sessionId}:`, error);
      sessions.delete(sessionId);
    };

    try {
      // Connect server to transport (this automatically calls transport.start())
      await server.connect(transport);
      console.error(`[SSE] Session ${sessionId} started successfully`);
    } catch (error) {
      console.error(`[SSE] Failed to start session ${sessionId}:`, error);
      sessions.delete(sessionId);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      }
    }
  });

  /**
   * Message endpoint - receives client-to-server messages
   * Client POSTs here to send messages to the server
   */
  app.post('/mcp/message', async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId parameter' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`[POST] Session not found: ${sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      console.error(`[POST] Received message for session ${sessionId}`);
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error(`[POST] Error handling message for session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process message' });
      }
    }
  });

  /**
   * List active sessions endpoint (debugging)
   */
  app.get('/mcp/sessions', (req, res) => {
    const sessionList = Array.from(sessions.keys()).map(id => ({
      sessionId: id,
      created: new Date().toISOString()
    }));
    res.json({
      count: sessions.size,
      sessions: sessionList
    });
  });

  // Start HTTP server
  app.listen(port, () => {
    console.error('='.repeat(60));
    console.error('CYOPS MCP Server (HTTP/SSE Transport)');
    console.error('='.repeat(60));
    console.error(`Server listening on: http://localhost:${port}`);
    console.error(`SSE endpoint:        http://localhost:${port}/mcp/sse`);
    console.error(`Message endpoint:    http://localhost:${port}/mcp/message`);
    console.error(`Health check:        http://localhost:${port}/health`);
    console.error(`Backend URL:         ${process.env.CYOPS_BACKEND_URL || 'http://localhost:8080/api/v1'}`);
    console.error(`Allowed origins:     ${allowedOrigins.join(', ')}`);
    console.error('='.repeat(60));
    console.error('Ready to accept MCP client connections');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('SIGTERM received, closing all sessions...');
    sessions.forEach((session, id) => {
      console.error(`Closing session ${id}`);
      session.transport.close();
    });
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.error('SIGINT received, closing all sessions...');
    sessions.forEach((session, id) => {
      console.error(`Closing session ${id}`);
      session.transport.close();
    });
    process.exit(0);
  });
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
