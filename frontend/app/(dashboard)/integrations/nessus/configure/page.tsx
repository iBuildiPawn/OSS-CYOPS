"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Plus, Settings, Trash2, Power } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { integrationConfigApi } from "@/lib/api";
import { toast } from "sonner";
import { NessusConfigForm } from "@/components/integrations/nessus-config-form";
import { usePageHeader } from "@/contexts/page-header-context";

export default function NessusConfigurePage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await integrationConfigApi.list("nessus");
      setConfigs(response.data);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to load configurations",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await integrationConfigApi.delete(id);
      toast.success("Configuration deleted successfully");
      loadConfigs();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to delete configuration",
      );
    } finally {
      setDeleteId(null);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      await integrationConfigApi.testConnection(id);
      toast.success("Connection test successful");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Connection test failed");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await integrationConfigApi.update(id, { active: !currentActive });
      toast.success(
        `Configuration ${!currentActive ? "activated" : "deactivated"}`,
      );
      loadConfigs();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to update configuration",
      );
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingConfig(null);
    loadConfigs();
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Settings className="h-5 w-5" />, []);
  const headerActions = useMemo(
    () => (
      <Button onClick={() => setShowForm(true)} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Configuration
      </Button>
    ),
    [setShowForm],
  );

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Nessus API Configuration",
      "Configure API connections to your Nessus servers for automated vulnerability imports",
      headerIcon,
      headerActions,
    );
  }, [setPageHeader, headerIcon, headerActions]);

  return (
    <>
      {/* Breadcrumb */}
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/integrations">Integrations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Nessus API Configuration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Configuration Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig ? "Edit" : "Add"} Nessus Configuration
            </CardTitle>
            <CardDescription>
              Enter your Nessus server API credentials and connection details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NessusConfigForm
              config={editingConfig}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingConfig(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Existing Configurations */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading configurations...
        </div>
      ) : configs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              No Configurations Yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Add your first Nessus API configuration to start automated
              vulnerability imports
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{config.name}</CardTitle>
                      {config.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {config.has_credentials && (
                        <Badge variant="outline">Configured</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {config.base_url}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleActive(config.id, config.active)
                      }
                    >
                      <Power className="h-4 w-4 mr-2" />
                      {config.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(config.id)}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingConfig(config);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {config.auto_sync && (
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Auto-sync enabled: Every {config.sync_interval_mins} minutes
                    {config.last_sync_at && (
                      <>
                        {" "}
                        · Last sync:{" "}
                        {new Date(config.last_sync_at).toLocaleString()}
                      </>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Nessus API configuration. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
