"use client";

import { useQuery } from "@tanstack/react-query";
import { nessusIntegrationApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, AlertTriangle, Info, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NessusScanPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  scanId: number;
  onImport?: () => void;
}

export function NessusScanPreviewModal({
  open,
  onOpenChange,
  configId,
  scanId,
  onImport,
}: NessusScanPreviewModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["nessus-scan-preview", configId, scanId],
    queryFn: () => nessusIntegrationApi.previewScan(configId, scanId),
    enabled: open && !!configId && !!scanId,
  });

  const preview = data?.data;

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "default";
      case "LOW":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
      case "HIGH":
        return <AlertTriangle className="h-4 w-4" />;
      case "MEDIUM":
        return <Shield className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Scan Preview</DialogTitle>
          <DialogDescription>
            Preview what will be imported from Scan ID: {scanId}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2">Loading scan preview...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load scan preview. Please try again.
              </AlertDescription>
            </Alert>
          ) : preview ? (
            <>
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Vulnerabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preview.total_vulnerabilities}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Unique Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preview.unique_hosts}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Affected Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preview.total_affected_hosts}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {preview.total_affected_hosts}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Severity Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Severity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(preview.severity_breakdown)
                      .sort(([a], [b]) => {
                        const order = {
                          CRITICAL: 0,
                          HIGH: 1,
                          MEDIUM: 2,
                          LOW: 3,
                          NONE: 4,
                        };
                        return (
                          order[a as keyof typeof order] -
                          order[b as keyof typeof order]
                        );
                      })
                      .map(([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getSeverityColor(severity)}
                              className="gap-1"
                            >
                              {getSeverityIcon(severity)}
                              {severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {count} vulnerabilities
                            </span>
                            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${(count / preview.total_vulnerabilities) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sample Vulnerabilities */}
              {preview.vulnerabilities_preview &&
                preview.vulnerabilities_preview.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Sample Vulnerabilities (First 10)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {preview.vulnerabilities_preview
                          .slice(0, 10)
                          .map((vuln, idx) => (
                            <div key={idx}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant={getSeverityColor(vuln.Severity)}
                                    >
                                      {vuln.Severity}
                                    </Badge>
                                    {vuln.CVSSScore && (
                                      <Badge variant="outline">
                                        CVSS: {vuln.CVSSScore}
                                      </Badge>
                                    )}
                                    {vuln.CVEID && (
                                      <Badge variant="outline">
                                        {vuln.CVEID}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="font-medium truncate">
                                    {vuln.Title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {vuln.AffectedHosts?.length || 0} affected
                                    host(s)
                                  </p>
                                </div>
                              </div>
                              {idx <
                                preview.vulnerabilities_preview.length - 1 && (
                                <Separator className="mt-3" />
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Import Warning */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Importing this scan will create{" "}
                  {preview.total_vulnerabilities} vulnerabilities and{" "}
                  {preview.unique_hosts} assets in your system.
                </AlertDescription>
              </Alert>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {preview && onImport && (
            <Button onClick={onImport}>
              <Download className="h-4 w-4 mr-2" />
              Import This Scan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
