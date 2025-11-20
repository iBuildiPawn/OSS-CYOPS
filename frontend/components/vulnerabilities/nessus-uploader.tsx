"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, Loader2, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { vulnerabilityApi } from "@/lib/api";

interface NessusUploaderProps {
  onImportComplete: (result: any) => void;
}

export function NessusUploader({ onImportComplete }: NessusUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => vulnerabilityApi.previewNessusImport(file),
    onSuccess: (data) => {
      setPreview(data);
      toast.success("File validated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to preview file", {
        description: error.response?.data?.error || error.message,
      });
      setFile(null);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({
      file,
      skipDuplicates,
    }: {
      file: File;
      skipDuplicates: boolean;
    }) => vulnerabilityApi.importNessusFile(file, skipDuplicates),
    onSuccess: (data) => {
      setImportResult(data.result);
      toast.success("Import completed successfully");
      onImportComplete(data.result);
    },
    onError: (error: any) => {
      toast.error("Failed to import file", {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file extension
    if (!selectedFile.name.endsWith(".nessus")) {
      toast.error("Invalid file type", {
        description: "Only .nessus files are supported",
      });
      return;
    }

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 50MB",
      });
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    previewMutation.mutate(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate({ file, skipDuplicates });
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    importMutation.reset();
  };

  const isLoading = previewMutation.isPending || importMutation.isPending;

  return (
    <div className="w-full space-y-6">
      {/* Upload Area */}
      {!file ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Nessus File</CardTitle>
            <CardDescription>
              Drag and drop your .nessus file here or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Drop your Nessus file here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supported format: .nessus (XML) • Max size: 50MB
              </p>
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".nessus"
                className="hidden"
                onChange={handleFileInputChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* File Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Change File
                </Button>
              </CardTitle>
              <CardDescription>
                File size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Preview Loading */}
          {previewMutation.isPending && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Validating and analyzing file...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Loading */}
          {importMutation.isPending && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Importing vulnerabilities... This may take a moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Confirmation */}
          {importResult && (
            <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                  Import Completed Successfully!
                </CardTitle>
                <CardDescription>
                  Your vulnerabilities have been imported into the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import Results Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Vulnerabilities Created
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.imported_vulnerabilities || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Findings Created
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.created_findings || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Assets Created
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.created_assets || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Duplicates Skipped
                    </p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {importResult.skipped_vulnerabilities || 0}
                    </p>
                  </div>
                </div>

                {/* Additional Details */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Note:</strong> {importResult.errors.length} item(s) encountered issues during import.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    Import Another File
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/vulnerabilities'}
                    className="flex-1"
                  >
                    View Vulnerabilities
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview (only show if not loading and no result yet) */}
          {preview && !importMutation.isPending && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Import Preview
                </CardTitle>
                <CardDescription>Review what will be imported</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Unique Vulnerabilities
                    </p>
                    <p className="text-2xl font-bold">
                      {preview.summary.total_vulnerabilities}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Total Findings
                    </p>
                    <p className="text-2xl font-bold">
                      {preview.summary.total_affected_hosts}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Scanned Hosts
                    </p>
                    <p className="text-2xl font-bold">
                      {preview.summary.unique_hosts}
                    </p>
                  </div>
                </div>

                {/* Severity Breakdown */}
                {preview.summary.severity_breakdown && (
                  <div>
                    <h4 className="font-semibold mb-2">Severity Breakdown</h4>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(preview.summary.severity_breakdown).map(
                        ([severity, count]) => (
                          <Badge
                            key={severity}
                            variant={getSeverityVariant(severity)}
                          >
                            {severity}: {count as number}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Sample Vulnerabilities */}
                {preview.preview && preview.preview.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      Sample Vulnerabilities (showing {preview.total_preview})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {preview.preview.map((vuln: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{vuln.Title}</p>
                              <p className="text-sm text-muted-foreground">
                                {vuln.AffectedHosts?.length || 0} affected
                                host(s)
                              </p>
                            </div>
                            <Badge variant={getSeverityVariant(vuln.Severity)}>
                              {vuln.Severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import Options */}
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) =>
                      setSkipDuplicates(checked as boolean)
                    }
                  />
                  <Label htmlFor="skip-duplicates" className="cursor-pointer">
                    Skip duplicate vulnerabilities (recommended)
                  </Label>
                </div>

                {/* Import Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="flex-1"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Vulnerabilities
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> The import process will automatically create
          assets for any new hosts found in the scan results. Existing assets
          will be linked to the vulnerabilities.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function getSeverityVariant(
  severity: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = severity.toLowerCase();
  if (s === "critical") return "destructive";
  if (s === "high") return "destructive";
  if (s === "medium") return "default";
  if (s === "low") return "secondary";
  return "outline";
}
