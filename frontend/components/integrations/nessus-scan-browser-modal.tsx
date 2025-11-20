"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  nessusIntegrationApi,
  type NessusScan,
  type ImportScanRequest,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Download, Eye, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";
import { NessusScanPreviewModal } from "./nessus-scan-preview-modal";
import { NessusImportOptionsDialog } from "./nessus-import-options-dialog";

interface NessusScanBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  configName?: string;
  onImportSuccess?: () => void;
}

export function NessusScanBrowserModal({
  open,
  onOpenChange,
  configId,
  configName,
  onImportSuccess,
}: NessusScanBrowserModalProps) {
  const [selectedScans, setSelectedScans] = useState<Set<number>>(new Set());
  const [previewScanId, setPreviewScanId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<"single" | "multiple" | "all">(
    "single",
  );
  const [currentScanId, setCurrentScanId] = useState<number | null>(null);

  // Fetch scans from Nessus
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["nessus-scans", configId],
    queryFn: () => nessusIntegrationApi.listScans(configId),
    enabled: open && !!configId,
  });

  const scans = data?.data || [];

  // Toggle scan selection
  const toggleScan = (scanId: number) => {
    const newSelected = new Set(selectedScans);
    if (newSelected.has(scanId)) {
      newSelected.delete(scanId);
    } else {
      newSelected.add(scanId);
    }
    setSelectedScans(newSelected);
  };

  // Select all scans
  const selectAll = () => {
    if (selectedScans.size === scans.length) {
      setSelectedScans(new Set());
    } else {
      setSelectedScans(new Set(scans.map((s) => s.id)));
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") return "default";
    if (statusLower === "running") return "secondary";
    if (statusLower === "stopped") return "destructive";
    return "outline";
  };

  // Handle import single scan
  const handleImportSingle = (scanId: number) => {
    setCurrentScanId(scanId);
    setImportMode("single");
    setImportDialogOpen(true);
  };

  // Handle import selected scans
  const handleImportSelected = () => {
    if (selectedScans.size === 0) {
      toast.error("Please select at least one scan");
      return;
    }
    setImportMode("multiple");
    setImportDialogOpen(true);
  };

  // Handle import all scans
  const handleImportAll = () => {
    setImportMode("all");
    setImportDialogOpen(true);
  };

  // Handle preview
  const handlePreview = (scanId: number) => {
    setPreviewScanId(scanId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Browse Nessus Scans</DialogTitle>
            <DialogDescription>
              {configName && `Connected to: ${configName}`}
              <br />
              Select scans to import into the vulnerability management system
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Loading scans from Nessus...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">Failed to load scans</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No scans found on this Nessus server
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      {selectedScans.size === scans.length ? (
                        <>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Select All
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedScans.size} of {scans.length} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleImportSelected}
                      disabled={selectedScans.size === 0}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import Selected ({selectedScans.size})
                    </Button>
                    <Button
                      onClick={handleImportAll}
                      variant="secondary"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="min-w-[300px]">
                          Scan Name
                        </TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-48">Owner</TableHead>
                        <TableHead className="w-52">Last Modified</TableHead>
                        <TableHead className="text-right w-52">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans.map((scan) => (
                        <TableRow key={scan.id} className="hover:bg-muted/50">
                          <TableCell className="py-4">
                            <Checkbox
                              checked={selectedScans.has(scan.id)}
                              onCheckedChange={() => toggleScan(scan.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium py-4">
                            {scan.name}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant={getStatusVariant(scan.status)}>
                              {scan.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">{scan.owner}</TableCell>
                          <TableCell className="py-4">
                            {format(
                              new Date(scan.last_modification_date * 1000),
                              "PPp",
                            )}
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(scan.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportSingle(scan.id)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Import
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewScanId && (
        <NessusScanPreviewModal
          open={!!previewScanId}
          onOpenChange={(open) => !open && setPreviewScanId(null)}
          configId={configId}
          scanId={previewScanId}
          onImport={() => {
            setPreviewScanId(null);
            handleImportSingle(previewScanId);
          }}
        />
      )}

      {/* Import Options Dialog */}
      <NessusImportOptionsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        configId={configId}
        mode={importMode}
        scanId={currentScanId}
        selectedScanIds={Array.from(selectedScans)}
        onSuccess={(result) => {
          setImportDialogOpen(false);
          setSelectedScans(new Set());
          onImportSuccess?.();
          toast.success("Import completed successfully", {
            description: `Created ${result?.data?.created || 0} vulnerabilities and ${result?.data?.assets_created || 0} assets`,
          });
        }}
      />
    </>
  );
}
