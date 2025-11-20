"use client";

import {
  AlertTriangle,
  Box,
  Cloud,
  Container,
  HelpCircle,
  Monitor,
  Network,
  Server,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AssetWithVulnCount } from "@/types/asset";
import { AssetCriticalityBadge } from "./asset-criticality-badge";
import { AssetStatusBadge } from "./asset-status-badge";
import { TagList } from "@/components/assets/tag-manager";

interface AssetCardProps {
  asset: AssetWithVulnCount;
  className?: string;
}

export function AssetCard({ asset, className }: AssetCardProps) {
  // System type icon mapping
  const systemTypeIcons = {
    SERVER: Server,
    WORKSTATION: Monitor,
    NETWORK_DEVICE: Network,
    APPLICATION: Box,
    CONTAINER: Container,
    CLOUD_SERVICE: Cloud,
    OTHER: HelpCircle,
  };

  const Icon = systemTypeIcons[asset.system_type] || HelpCircle;

  return (
    <Link href={`/assets/${asset.id}`}>
      <Card
        className={cn(
          "hover:shadow-lg transition-shadow cursor-pointer",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {asset.hostname || asset.asset_id || "Unnamed Asset"}
              </CardTitle>
            </div>
            <AssetStatusBadge status={asset.status} />
          </div>
          <CardDescription className="flex items-center gap-2 mt-1">
            {asset.ip_address && (
              <span className="font-mono text-xs">{asset.ip_address}</span>
            )}
            {asset.ip_address && asset.environment && <span>•</span>}
            {asset.environment && (
              <Badge variant="outline" className="text-xs">
                {asset.environment}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Description */}
          {asset.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {asset.description}
            </p>
          )}

          {/* Criticality and System Type */}
          <div className="flex items-center gap-2 flex-wrap">
            {asset.criticality && (
              <AssetCriticalityBadge criticality={asset.criticality} />
            )}
            <Badge variant="secondary" className="text-xs">
              {asset.system_type.replace("_", " ")}
            </Badge>
          </div>

          {/* Vulnerability Count */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Vulnerabilities
              </span>
            </div>
            <Badge
              variant={
                asset.vulnerability_count > 0 ? "destructive" : "outline"
              }
            >
              {asset.vulnerability_count || 0}
            </Badge>
          </div>

          {/* Owner and Location */}
          <div className="text-xs text-muted-foreground space-y-1">
            {asset.owner && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Owner:</span>
                <span>{asset.owner.name || asset.owner.email}</span>
              </div>
            )}
            {asset.department && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Dept:</span>
                <span>{asset.department}</span>
              </div>
            )}
            {asset.location && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Location:</span>
                <span>{asset.location}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {asset.tags && asset.tags.length > 0 && (
            <TagList tags={asset.tags} maxDisplay={3} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
