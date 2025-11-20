"use client";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ImportResultsProps {
  result: any;
  onReset: () => void;
}

export function ImportResults({ result, onReset }: ImportResultsProps) {
  const successRate = result.summary?.success_rate || 0;
  const hasErrors = result.errors && result.errors.length > 0;
  const hasWarnings = result.warnings && result.warnings.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Success Banner */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Import Completed
              </h2>
              <p className="text-green-700 dark:text-green-300">
                Successfully imported {result.imported_vulnerabilities}{" "}
                vulnerabilities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Import Summary
          </CardTitle>
          <CardDescription>Overview of the import operation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Success Rate</span>
              <span className="text-muted-foreground">
                {successRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                {result.total_vulnerabilities}
              </p>
              <p className="text-xs text-muted-foreground">Vulnerabilities</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                Imported
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {result.imported_vulnerabilities}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                New entries
              </p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Skipped
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {result.skipped_vulnerabilities}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Duplicates
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">Assets</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {result.created_assets}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Created
              </p>
            </div>
          </div>

          {/* Asset Details */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Total Assets Processed</p>
              <p className="text-sm text-muted-foreground">
                {result.created_assets} created • {result.existing_assets}{" "}
                existing
              </p>
            </div>
            <Badge variant="outline">{result.total_assets} total</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {hasWarnings && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings ({result.warnings.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {result.warnings
                .slice(0, 5)
                .map((warning: string, index: number) => (
                  <p key={index} className="text-sm">
                    • {warning}
                  </p>
                ))}
              {result.warnings.length > 5 && (
                <p className="text-sm italic">
                  ... and {result.warnings.length - 5} more warnings
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Errors ({result.errors.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {result.errors.slice(0, 5).map((error: string, index: number) => (
                <p key={index} className="text-sm">
                  • {error}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-sm italic">
                  ... and {result.errors.length - 5} more errors
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button asChild className="flex-1">
          <Link href="/vulnerabilities">View Vulnerabilities</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          <Upload className="mr-2 h-4 w-4" />
          Import Another File
        </Button>
      </div>
    </div>
  );
}
