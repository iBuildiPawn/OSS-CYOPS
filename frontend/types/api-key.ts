// API Key types for MCP Server configuration

export type APIKeyType = "mcp" | "service" | "personal";
export type APIKeyStatus = "active" | "inactive" | "revoked";

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  type: APIKeyType;
  status: APIKeyStatus;
  key_prefix: string;
  scopes: string[];
  expires_at?: string;
  last_used_at?: string;
  rate_limit_per_minute: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  type: APIKeyType;
  scopes: string[];
  description?: string;
  expires_at?: string;
  rate_limit_per_minute?: number;
}

export interface CreateAPIKeyResponse {
  api_key: APIKey;
  plain_key: string;
  message: string;
}

export interface UpdateAPIKeyStatusRequest {
  status: APIKeyStatus;
}

// Available scopes
export const API_KEY_SCOPES = {
  VULNERABILITIES: {
    READ: "vulnerabilities:read",
    WRITE: "vulnerabilities:write",
    DELETE: "vulnerabilities:delete",
    STATS: "vulnerabilities:stats",
  },
  ASSETS: {
    READ: "assets:read",
    WRITE: "assets:write",
    DELETE: "assets:delete",
  },
  ADMIN: {
    ALL: "admin:*",
  },
  ALL: "*:*",
} as const;

// Scope groups for easy selection
export interface ScopeGroup {
  label: string;
  description: string;
  scopes: string[];
}

export const SCOPE_GROUPS: Record<string, ScopeGroup> = {
  READ_ONLY: {
    label: "Read Only",
    description: "View vulnerabilities and assets without making changes",
    scopes: [
      API_KEY_SCOPES.VULNERABILITIES.READ,
      API_KEY_SCOPES.VULNERABILITIES.STATS,
      API_KEY_SCOPES.ASSETS.READ,
    ],
  },
  FULL_ACCESS: {
    label: "Full Access",
    description: "Complete access to vulnerabilities and assets",
    scopes: [
      API_KEY_SCOPES.VULNERABILITIES.READ,
      API_KEY_SCOPES.VULNERABILITIES.WRITE,
      API_KEY_SCOPES.VULNERABILITIES.DELETE,
      API_KEY_SCOPES.VULNERABILITIES.STATS,
      API_KEY_SCOPES.ASSETS.READ,
      API_KEY_SCOPES.ASSETS.WRITE,
      API_KEY_SCOPES.ASSETS.DELETE,
    ],
  },
  ADMIN: {
    label: "Administrator",
    description: "Full administrative access to all resources",
    scopes: [API_KEY_SCOPES.ALL],
  },
};

// MCP Client configuration
export interface MCPClientConfig {
  command: string;
  args: string[];
  env: {
    CYOPS_BACKEND_URL: string;
    CYOPS_API_KEY: string;
  };
}

export interface ClaudeDesktopConfig {
  mcpServers: {
    "cyops": MCPClientConfig;
  };
}
