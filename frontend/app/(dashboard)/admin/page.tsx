"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Database,
  Trash2,
  Cpu,
  Users,
  Shield,
  Activity,
  UserCog,
  Key,
  Plus,
  Copy,
  CheckCircle,
  Ban,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, settingsApi, roleApi, apiKeyApi } from "@/lib/api";
import { UserList } from "@/components/admin/user-list";
import { RoleAssignment } from "@/components/admin/role-assignment";
import type { User } from "@/types/api";
import type { APIKey, CreateAPIKeyRequest } from "@/types/api-key";
import { SCOPE_GROUPS } from "@/types/api-key";
import { usePageHeader } from "@/contexts/page-header-context";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { setPageHeader } = usePageHeader();
  const [cleanupType, setCleanupType] = useState<
    "assets" | "vulnerabilities" | "all" | null
  >(null);
  const [mounted, setMounted] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // API Key state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{
    plain_key: string;
    name: string;
  } | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // Form state for creating API keys
  const [formData, setFormData] = useState<CreateAPIKeyRequest>({
    name: "",
    type: "mcp",
    scopes: SCOPE_GROUPS.READ_ONLY.scopes,
    description: "",
  });

  // Fix hydration issue - only render stats after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Administration",
      "Manage users, system settings, and maintenance operations",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  // Fetch data for overview tab
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1],
    queryFn: () => adminApi.listUsers({ page: 1, per_page: 1 }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: roleApi.listRoles,
  });

  const totalUsers = usersData?.total || 0;
  const totalRoles = rolesData?.roles?.length || 0;

  // Fetch cleanup stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "cleanup", "stats"],
    queryFn: adminApi.getCleanupStats,
    refetchInterval: 30000,
    enabled: mounted,
  });

  // Fetch MCP server status
  const { data: mcpStatus, isLoading: isMCPLoading } = useQuery({
    queryKey: ["settings", "mcp", "status"],
    queryFn: settingsApi.getMCPStatus,
    enabled: mounted,
  });

  // Fetch API keys
  const { data: apiKeys, isLoading: isLoadingKeys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeyApi.list,
    enabled: mounted,
  });

  // Toggle MCP server mutation
  const toggleMCPMutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.toggleMCPServer(enabled),
    onSuccess: (data) => {
      toast.success(data.message, {
        description: data.enabled
          ? "MCP server is now enabled"
          : "MCP server is now disabled",
      });
      queryClient.invalidateQueries({
        queryKey: ["settings", "mcp", "status"],
      });
    },
    onError: (error: any) => {
      toast.error("Failed to toggle MCP server", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: (data: CreateAPIKeyRequest) => apiKeyApi.create(data),
    onSuccess: (response) => {
      toast.success("API key created successfully");
      setNewKeyData({
        plain_key: response.plain_key,
        name: response.api_key.name,
      });
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setCreateDialogOpen(false);
      // Reset form
      setFormData({
        name: "",
        type: "mcp",
        scopes: SCOPE_GROUPS.READ_ONLY.scopes,
        description: "",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to create API key", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => apiKeyApi.delete(id),
    onSuccess: () => {
      toast.success("API key deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteKeyId(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete API key", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  // Cleanup mutations
  const cleanupAssetsMutation = useMutation({
    mutationFn: adminApi.cleanupAssets,
    onSuccess: (data) => {
      toast.success(data.message || "Assets cleaned up successfully", {
        description: `${data.deleted_count} asset(s) permanently deleted`,
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "cleanup", "stats"],
      });
      setCleanupType(null);
    },
    onError: (error: any) => {
      toast.error("Failed to cleanup assets", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const cleanupVulnerabilitiesMutation = useMutation({
    mutationFn: adminApi.cleanupVulnerabilities,
    onSuccess: (data) => {
      toast.success(data.message || "Vulnerabilities cleaned up successfully", {
        description: `${data.deleted_count} vulnerability/vulnerabilities permanently deleted`,
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "cleanup", "stats"],
      });
      setCleanupType(null);
    },
    onError: (error: any) => {
      toast.error("Failed to cleanup vulnerabilities", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const cleanupAllDataMutation = useMutation({
    mutationFn: adminApi.cleanupAllData,
    onSuccess: (data) => {
      toast.success(data.message || "All data cleaned up successfully", {
        description:
          "All vulnerabilities, assets, and related data have been permanently deleted",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "cleanup", "stats"],
      });
      setCleanupType(null);
    },
    onError: (error: any) => {
      toast.error("Failed to cleanup all data", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const handleCleanup = () => {
    if (cleanupType === "assets") {
      cleanupAssetsMutation.mutate();
    } else if (cleanupType === "vulnerabilities") {
      cleanupVulnerabilitiesMutation.mutate();
    } else if (cleanupType === "all") {
      cleanupAllDataMutation.mutate();
    }
  };

  const isCleaningUp =
    cleanupAssetsMutation.isPending ||
    cleanupVulnerabilitiesMutation.isPending ||
    cleanupAllDataMutation.isPending;

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleCreateKey = () => {
    createKeyMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Inactive
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive" className="gap-1">
            <Ban className="h-3 w-3" />
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="mcp-server">MCP Server</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Registered accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Roles</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRoles}</div>
                <p className="text-xs text-muted-foreground">Defined roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Status
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant="default" className="text-sm">
                    Operational
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  All systems running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  MCP Server
                </CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mounted && !isMCPLoading && (
                    <Badge
                      variant={mcpStatus?.enabled ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {mcpStatus?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI assistant integration
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Statistics</CardTitle>
              <CardDescription>
                System overview and role distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rolesData?.roles?.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <UserCog className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{role.display_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {role.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Level {role.level}</Badge>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <UserList onAssignRole={handleAssignRole} />
        </TabsContent>

        {/* MCP Server Tab */}
        <TabsContent value="mcp-server" className="space-y-4">
          {/* MCP Server Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                MCP Server
              </CardTitle>
              <CardDescription>
                Enable or disable the Model Context Protocol (MCP) server for AI
                assistant integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="mcp-toggle"
                      className="text-base font-semibold cursor-pointer"
                    >
                      MCP Server Status
                    </Label>
                    {mounted && !isMCPLoading && (
                      <Badge
                        variant={mcpStatus?.enabled ? "default" : "secondary"}
                      >
                        {mcpStatus?.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    When enabled, AI assistants can interact with the CYOPS
                    Operations API through the MCP protocol
                  </p>
                </div>
                <Switch
                  id="mcp-toggle"
                  checked={mcpStatus?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    toggleMCPMutation.mutate(checked)
                  }
                  disabled={isMCPLoading || toggleMCPMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Create and manage API keys for MCP server authentication
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingKeys ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading API keys...
                </div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-3">
                  {apiKeys.map((key: APIKey) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          {getStatusBadge(key.status)}
                          <Badge variant="outline" className="text-xs">
                            {key.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {key.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Prefix: {key.key_prefix}...</span>
                          <span>Scopes: {key.scopes.length}</span>
                          {key.last_used_at && (
                            <span>
                              Last used:{" "}
                              {new Date(key.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteKeyId(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No API Keys</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first API key to enable MCP server access
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Setup Instructions
              </CardTitle>
              <CardDescription>
                How to configure the MCP server with Claude Desktop
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Create an API Key</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Create API Key" above to generate a new key for the MCP
                  server.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">
                  2. Configure Claude Desktop
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Add the following configuration to your Claude Desktop
                  settings:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {`{
  "mcpServers": {
    "cyops": {
      "command": "node",
      "args": ["/path/to/cyops/mcp-server/dist/index.js"],
      "env": {
        "CYOPS_BACKEND_URL": "http://localhost:8080/api/v1",
        "CYOPS_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">
                  3. Restart Claude Desktop
                </h4>
                <p className="text-sm text-muted-foreground">
                  Restart Claude Desktop to apply the configuration changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Database Cleanup
              </CardTitle>
              <CardDescription>
                Permanently delete soft-deleted records from the database. This
                action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assets Cleanup */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Assets</h3>
                    {mounted &&
                      !isLoading &&
                      stats?.stats?.assets !== undefined && (
                        <Badge
                          variant={
                            stats.stats.assets > 0 ? "destructive" : "secondary"
                          }
                        >
                          {stats.stats.assets} deleted
                        </Badge>
                      )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently remove all soft-deleted assets and their
                    relationships
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setCleanupType("assets")}
                  disabled={
                    isLoading ||
                    isCleaningUp ||
                    !stats?.stats?.assets ||
                    stats.stats.assets === 0
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Up Assets
                </Button>
              </div>

              {/* Vulnerabilities Cleanup */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Vulnerabilities</h3>
                    {mounted &&
                      !isLoading &&
                      stats?.stats?.vulnerabilities !== undefined && (
                        <Badge
                          variant={
                            stats.stats.vulnerabilities > 0
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {stats.stats.vulnerabilities} deleted
                        </Badge>
                      )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently remove all soft-deleted vulnerabilities and
                    their relationships
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setCleanupType("vulnerabilities")}
                  disabled={
                    isLoading ||
                    isCleaningUp ||
                    !stats?.stats?.vulnerabilities ||
                    stats.stats.vulnerabilities === 0
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Up Vulnerabilities
                </Button>
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-destructive/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-destructive font-semibold">
                    Danger Zone
                  </span>
                </div>
              </div>

              {/* Complete Database Cleanup */}
              <div className="flex items-center justify-between p-4 border-2 border-destructive rounded-lg bg-destructive/5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-destructive">
                      Complete Database Cleanup
                    </h3>
                    <Badge variant="destructive">Extreme Caution</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove ALL data from the database except users, roles, and sessions.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Will delete:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>All vulnerabilities and findings</li>
                      <li>All assets and tags</li>
                      <li>All assessments and reports</li>
                      <li>All attachments and file uploads</li>
                      <li>All integration configs</li>
                      <li>All auth events and verification tokens</li>
                      <li>All API keys</li>
                      <li>All system settings</li>
                    </ul>
                    <p className="font-semibold text-green-600 mt-2">Will preserve:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>User accounts</li>
                      <li>Roles and permissions</li>
                      <li>Active sessions</li>
                    </ul>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setCleanupType("all")}
                  disabled={isLoading || isCleaningUp}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Clean All Data
                </Button>
              </div>

              {/* Warning Notice */}
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive">
                    Warning: Permanent Action
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Database cleanup operations permanently delete records from
                    the database. This is NOT a soft delete and cannot be
                    undone. Only proceed if you are certain you want to remove
                    these records permanently.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={cleanupType !== null}
        onOpenChange={(open) => !open && setCleanupType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2" asChild>
              <div>
                {cleanupType === "all" ? (
                  <>
                    <p>
                      You are about to permanently delete <strong>ALL</strong>{" "}
                      data from the database except users, roles, and sessions.
                    </p>
                    <p className="font-semibold text-destructive mt-2">
                      This will remove ALL data including:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>All vulnerabilities (deleted and active)</li>
                      <li>All vulnerability findings and attachments</li>
                      <li>All assets (deleted and active)</li>
                      <li>All asset tags and relationships</li>
                      <li>All assessments and reports</li>
                      <li>All status history entries</li>
                      <li>All file uploads and attachments</li>
                      <li>All integration configurations</li>
                      <li>All API keys</li>
                      <li>All auth events and verification tokens</li>
                      <li>All system settings</li>
                    </ul>
                    <p className="font-semibold text-green-600 mt-2">
                      Will be preserved:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>User accounts and passwords</li>
                      <li>Roles and permissions</li>
                      <li>Active login sessions</li>
                    </ul>
                    <p className="font-semibold text-destructive mt-2">
                      This action CANNOT be undone!
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      You are about to permanently delete{" "}
                      <strong>
                        {cleanupType === "assets"
                          ? stats?.stats?.assets
                          : stats?.stats?.vulnerabilities}
                      </strong>{" "}
                      {cleanupType === "assets"
                        ? "asset(s)"
                        : "vulnerability/vulnerabilities"}{" "}
                      from the database.
                    </p>
                    <p className="font-semibold text-destructive">
                      This action CANNOT be undone. All associated data will be
                      permanently removed.
                    </p>
                  </>
                )}
                <p>Are you absolutely sure you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCleaningUp}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              disabled={isCleaningUp}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isCleaningUp ? "Cleaning Up..." : "Yes, Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoleAssignment
        user={selectedUser}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for MCP server authentication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Claude Desktop MCP"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="scope">Scope *</Label>
              <Select
                value={formData.scopes.join(",")}
                onValueChange={(value) => {
                  const group = Object.values(SCOPE_GROUPS).find(
                    (g) => g.scopes.join(",") === value,
                  );
                  if (group) {
                    setFormData({ ...formData, scopes: group.scopes });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_GROUPS).map(([key, group]) => (
                    <SelectItem key={key} value={group.scopes.join(",")}>
                      <div>
                        <div className="font-medium">{group.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this API key"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={!formData.name || createKeyMutation.isPending}
            >
              {createKeyMutation.isPending ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Created Dialog */}
      <Dialog
        open={!!newKeyData}
        onOpenChange={(open) => !open && setNewKeyData(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Save this API key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="font-mono text-sm mt-1">{newKeyData?.name}</p>
            </div>
            <div>
              <Label>API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={newKeyData?.plain_key || ""}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyKey(newKeyData?.plain_key || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure to copy your API key now. You won't be able to see it
                again!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyData(null)}>
              I've saved my API key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Confirmation Dialog */}
      <AlertDialog
        open={!!deleteKeyId}
        onOpenChange={(open) => !open && setDeleteKeyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot
              be undone. Any applications using this key will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteKeyId && deleteKeyMutation.mutate(deleteKeyId)
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
