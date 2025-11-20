"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nessusIntegrationApi, type ImportScanRequest } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NessusImportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  mode: "single" | "multiple" | "all";
  scanId?: number | null;
  selectedScanIds?: number[];
  onSuccess?: (result?: any) => void;
}

export function NessusImportOptionsDialog({
  open,
  onOpenChange,
  configId,
  mode,
  scanId,
  selectedScanIds = [],
  onSuccess,
}: NessusImportOptionsDialogProps) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] = useState("PRODUCTION");
  const [autoCreateAssets, setAutoCreateAssets] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "completed" | "running" | "all"
  >("completed");

  const importMutation = useMutation({
    mutationFn: async (options: ImportScanRequest) => {
      if (mode === "single" && scanId) {
        return nessusIntegrationApi.importScan(configId, scanId, options);
      } else if (mode === "multiple") {
        return nessusIntegrationApi.importMultipleScans(configId, {
          ...options,
          scan_ids: selectedScanIds,
        });
      } else if (mode === "all") {
        return nessusIntegrationApi.importAllScans(configId, {
          ...options,
          status_filter: statusFilter,
        });
      }
      throw new Error("Invalid import mode");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vulnerabilities"] });
      queryClient.invalidateQueries({ queryKey: ["vulnerability-stats"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Import failed");
    },
  });

  const handleImport = () => {
    const options: ImportScanRequest = {
      environment,
      auto_create_assets: autoCreateAssets,
      update_existing: updateExisting,
    };

    importMutation.mutate(options);
  };

  const getTitle = () => {
    switch (mode) {
      case "single":
        return "Import Single Scan";
      case "multiple":
        return `Import ${selectedScanIds.length} Scans`;
      case "all":
        return "Import All Scans";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "single":
        return `Configure import options for Scan ID: ${scanId}`;
      case "multiple":
        return `Configure import options for ${selectedScanIds.length} selected scans`;
      case "all":
        return "Configure import options for all available scans";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {importMutation.isPending ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Importing scan data... This may take a few minutes.
            </p>
            <Progress value={undefined} className="w-full" />
          </div>
        ) : importMutation.isSuccess ? (
          <div className="space-y-4 py-6">
            <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-700 dark:text-green-400 text-lg">
                Import Completed Successfully!
              </AlertTitle>
              <AlertDescription className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your Nessus scan data has been successfully imported into the system.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Vulnerabilities Created</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {importMutation.data?.data.created || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Vulnerabilities Updated</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {importMutation.data?.data.updated || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Assets Created</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {importMutation.data?.data.assets_created || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Findings Created</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {importMutation.data?.data.findings_created || 0}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : importMutation.isError ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>
              {(importMutation.error as any)?.response?.data?.details ||
                "An error occurred during import"}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 py-4">
            {/* Environment Selection */}
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEV">Development</SelectItem>
                  <SelectItem value="STAGING">Staging</SelectItem>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tag for assets created from this scan
              </p>
            </div>

            {/* Status Filter (for "all" mode only) */}
            {mode === "all" && (
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status Filter</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v: any) => setStatusFilter(v)}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed Only</SelectItem>
                    <SelectItem value="running">Running Only</SelectItem>
                    <SelectItem value="all">All Scans</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filter which scans to import based on their status
                </p>
              </div>
            )}

            {/* Auto-create Assets */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="auto-create"
                checked={autoCreateAssets}
                onCheckedChange={(checked) =>
                  setAutoCreateAssets(checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="auto-create"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auto-create assets
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically create asset records for hosts found in the scan
                </p>
              </div>
            </div>

            {/* Update Existing */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="update-existing"
                checked={updateExisting}
                onCheckedChange={(checked) =>
                  setUpdateExisting(checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="update-existing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Update existing vulnerabilities
                </Label>
                <p className="text-xs text-muted-foreground">
                  Update existing vulnerabilities instead of skipping them
                </p>
              </div>
            </div>

            {/* Import Warning */}
            {mode === "all" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Importing all scans may create a large number of records and
                  take several minutes. Consider using filters to reduce the
                  scope.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {importMutation.isSuccess ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={importMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || importMutation.isSuccess}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
