"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrationConfigApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NessusUploader } from "@/components/vulnerabilities/nessus-uploader";
import { ImportResults } from "@/components/vulnerabilities/import-results";
import { NessusIntegrationModal } from "@/components/integrations/nessus-integration-modal";
import { NessusScanBrowserModal } from "@/components/integrations/nessus-scan-browser-modal";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { IntegrationConfigManager } from "@/components/integrations/integration-config-manager";
import { usePageHeader } from "@/contexts/page-header-context";

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  active: boolean;
  base_url: string;
  created_at: string;
  last_sync_at?: string;
}

// Define available integrations
const AVAILABLE_INTEGRATIONS = [
  {
    id: "nessus",
    vendor: "Tenable Nessus",
    name: "Nessus Professional",
    description:
      "Import vulnerability scan results from Nessus Professional and Nessus Essentials",
    logoIcon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-primary">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
      </svg>
    ),
    supportsUpload: true,
    supportsApi: true,
    features: [
      "Real-time scan import",
      "API integration with Nessus server",
      "Automatic vulnerability detection",
      "Asset auto-discovery",
      "CVSS score mapping",
      "Duplicate detection",
    ],
  },
  // Future integrations can be added here:
  // {
  //   id: "qualys",
  //   vendor: "Qualys",
  //   name: "Qualys VMDR",
  //   description: "Import from Qualys Vulnerability Management",
  //   supportsUpload: true,
  //   supportsApi: true,
  //   features: [...],
  // },
];

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { setPageHeader } = usePageHeader();

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [configManagerOpen, setConfigManagerOpen] = useState(false);

  // Data states
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedConfigName, setSelectedConfigName] = useState<string | null>(
    null,
  );

  // Fetch integration configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: () => integrationConfigApi.list(),
  });

  // Toggle integration active status
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      integrationConfigApi.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      toast.success("Integration status updated");
    },
    onError: () => {
      toast.error("Failed to update integration status");
    },
  });

  // Delete integration
  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      toast.success("Integration deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete integration");
    },
  });

  // Handlers
  const handleUpload = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setUploadDialogOpen(true);
  };

  const handleConnect = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setSetupModalOpen(true);
  };

  const handleConfigure = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setConfigManagerOpen(true);
  };

  const handleImportComplete = (result: any) => {
    setImportResult(result);
    queryClient.invalidateQueries({ queryKey: ["vulnerabilities"] });
    queryClient.invalidateQueries({ queryKey: ["vulnerability-stats"] });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
  };

  const handleResetUpload = () => {
    setImportResult(null);
    setUploadDialogOpen(false);
  };

  const handleBrowseScans = (configId: string, configName: string) => {
    setSelectedConfigId(configId);
    setSelectedConfigName(configName);
    setBrowseModalOpen(true);
  };

  const handleEditConfig = (configId: string) => {
    setSelectedConfigId(configId);
    setConfigManagerOpen(false);
    setSetupModalOpen(true);
  };

  // Get configs by type
  const getConfigsByType = (type: string) => {
    return (
      configs?.data.filter((c: IntegrationConfig) => c.type === type) || []
    );
  };

  // Check if any config is active for a type
  const isIntegrationEnabled = (type: string) => {
    const typeConfigs = getConfigsByType(type);
    return typeConfigs.some((c: IntegrationConfig) => c.active);
  };

  const selectedIntegrationConfigs = selectedIntegration
    ? getConfigsByType(selectedIntegration)
    : [];

  const selectedIntegrationData = AVAILABLE_INTEGRATIONS.find(
    (i) => i.id === selectedIntegration,
  );

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Vulnerability Integrations",
      "Connect vulnerability scanners to automatically import scan results",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  return (
    <div className="space-y-6 w-full">
      {/* Integration Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const integrationConfigs = getConfigsByType(integration.id);
          const hasConfigs = integrationConfigs.length > 0;
          const isEnabled = isIntegrationEnabled(integration.id);

          return (
            <IntegrationCard
              key={integration.id}
              id={integration.id}
              name={integration.name}
              vendor={integration.vendor}
              description={integration.description}
              logoIcon={integration.logoIcon}
              enabled={isEnabled}
              configured={hasConfigs}
              configCount={integrationConfigs.length}
              supportsUpload={integration.supportsUpload}
              supportsApi={integration.supportsApi}
              onToggle={(enabled) => {
                // Toggle all configs for this integration
                integrationConfigs.forEach((config: IntegrationConfig) => {
                  toggleMutation.mutate({ id: config.id, active: enabled });
                });
              }}
              onUpload={() => handleUpload(integration.id)}
              onConnect={() => handleConnect(integration.id)}
              onConfigure={() => handleConfigure(integration.id)}
              isToggling={toggleMutation.isPending}
              features={integration.features}
            />
          );
        })}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p>
                <strong>Upload:</strong> Quickly import scan files (.nessus XML)
                without configuration
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p>
                <strong>Connect:</strong> Set up API integration for real-time
                synchronization
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p>
                <strong>Manage:</strong> Configure multiple instances per vendor
                for different environments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Need More Integrations?</CardTitle>
            <CardDescription>
              We're constantly expanding our integration capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Request support for additional vulnerability scanners and security
              tools. Coming soon: Qualys, Rapid7, OpenVAS, and more.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Upload {selectedIntegrationData?.vendor} Scan File
            </DialogTitle>
            <DialogDescription>
              Upload scan file to import vulnerability results
            </DialogDescription>
          </DialogHeader>
          {importResult ? (
            <ImportResults result={importResult} onReset={handleResetUpload} />
          ) : (
            selectedIntegration === "nessus" && (
              <NessusUploader onImportComplete={handleImportComplete} />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* API Setup Modal */}
      {selectedIntegration === "nessus" && (
        <NessusIntegrationModal
          open={setupModalOpen}
          onOpenChange={setSetupModalOpen}
          configId={selectedConfigId || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["integration-configs"],
            });
            setSetupModalOpen(false);
            setSelectedConfigId(null);
          }}
        />
      )}

      {/* Scan Browser Modal */}
      {selectedConfigId && (
        <NessusScanBrowserModal
          open={browseModalOpen}
          onOpenChange={setBrowseModalOpen}
          configId={selectedConfigId}
          configName={selectedConfigName || undefined}
          onImportSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["vulnerabilities"] });
            queryClient.invalidateQueries({
              queryKey: ["vulnerability-stats"],
            });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            setBrowseModalOpen(false);
          }}
        />
      )}

      {/* Configuration Manager */}
      {selectedIntegration && (
        <IntegrationConfigManager
          open={configManagerOpen}
          onOpenChange={setConfigManagerOpen}
          vendor={selectedIntegrationData?.vendor || "Integration"}
          configs={selectedIntegrationConfigs}
          onToggle={(id, active) => toggleMutation.mutate({ id, active })}
          onEdit={handleEditConfig}
          onDelete={(id) => deleteMutation.mutate(id)}
          onBrowseScans={
            selectedIntegration === "nessus" ? handleBrowseScans : undefined
          }
          isToggling={toggleMutation.isPending}
        />
      )}
    </div>
  );
}
