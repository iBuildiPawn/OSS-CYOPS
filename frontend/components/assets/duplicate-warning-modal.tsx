"use client";

import { useState } from "react";
import Link from "next/link";
import type { Asset } from "@/types/asset";
import {
  getMatchTypeLabel,
  getSimilarityColor,
  formatSimilarity,
} from "@/hooks/use-duplicate-check";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink, Server } from "lucide-react";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { TagList } from "@/components/assets/tag-manager";

interface DuplicateMatch {
  asset: Asset;
  similarity: number;
  matched_on_name: boolean;
  matched_on_ip: boolean;
  matched_on_hostname: boolean;
}

interface DuplicateWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateMatch[];
  onProceed: () => void;
  isPending?: boolean;
}

export function DuplicateWarningModal({
  open,
  onOpenChange,
  duplicates,
  onProceed,
  isPending = false,
}: DuplicateWarningModalProps) {
  const hasExactMatch = duplicates.some((d) => d.similarity === 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Potential Duplicate Assets Found
          </DialogTitle>
          <DialogDescription>
            We found {duplicates.length} similar asset
            {duplicates.length > 1 ? "s" : ""} in the system. Please review
            before creating a new asset.
          </DialogDescription>
        </DialogHeader>

        {hasExactMatch && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Exact match found!</strong> Creating this asset may result
              in a duplicate entry.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 py-4">
          {duplicates.map((match) => (
            <div
              key={match.asset.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">
                    {match.asset.hostname ||
                      match.asset.asset_id ||
                      "Unnamed Asset"}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {match.asset.status && (
                    <AssetStatusBadge status={match.asset.status} />
                  )}
                  <Link
                    href={`/assets/${match.asset.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {/* Match Type */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={getSimilarityColor(match.similarity)}
                  >
                    {formatSimilarity(match.similarity)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {getMatchTypeLabel(match)}
                  </span>
                </div>

                {/* Asset Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {match.asset.ip_address && (
                    <div>
                      <span className="font-medium">IP:</span>{" "}
                      <span className="font-mono">
                        {match.asset.ip_address}
                      </span>
                    </div>
                  )}
                  {match.asset.hostname && (
                    <div>
                      <span className="font-medium">Hostname:</span>{" "}
                      {match.asset.hostname}
                    </div>
                  )}
                  {match.asset.environment && (
                    <div>
                      <span className="font-medium">Environment:</span>{" "}
                      {match.asset.environment}
                    </div>
                  )}
                  {match.asset.system_type && (
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {match.asset.system_type.replace("_", " ")}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {match.asset.tags && match.asset.tags.length > 0 && (
                  <TagList tags={match.asset.tags} maxDisplay={4} />
                )}

                {/* Description */}
                {match.asset.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {match.asset.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onProceed();
              onOpenChange(false);
            }}
            disabled={isPending}
            variant={hasExactMatch ? "destructive" : "default"}
            className="w-full sm:w-auto"
          >
            {hasExactMatch ? "Create Anyway" : "Proceed with Creation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
