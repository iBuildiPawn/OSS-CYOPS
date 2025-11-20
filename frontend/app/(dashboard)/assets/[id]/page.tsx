"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  MapPin,
  Network,
  Server,
  Shield,
  Tag,
  Trash2,
  User,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAsset, useDeleteAsset } from "@/hooks/use-assets";
import { AssetCriticalityBadge } from "@/components/assets/asset-criticality-badge";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { StatusChangeModal } from "@/components/assets/status-change-modal";
import { TagManager } from "@/components/assets/tag-manager";
import { AssetFindingsList } from "@/components/assets/asset-findings-list";
import { useVulnerabilityFindingsBySystem } from "@/hooks/use-vulnerability-findings";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useAsset(resolvedParams.id);
  const deleteMutation = useDeleteAsset();

  // Findings hook
  const { data: findingsData, isLoading: isLoadingFindings } =
    useVulnerabilityFindingsBySystem(resolvedParams.id);

  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this asset? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Asset deleted successfully");
      router.push("/assets");
    } catch (err) {
      toast.error("Failed to delete asset", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "Failed to load asset details"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Asset not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Extract asset from response (handle both direct object and nested structure)
  const asset = "asset" in data ? data.asset : data;
  if (!asset) {
    return null;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <Server className="h-6 w-6 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {asset.hostname || asset.asset_id || "Unnamed Asset"}
                </h1>
                {asset.asset_id && (
                  <p className="text-muted-foreground mt-1">{asset.asset_id}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {asset.status && (
                <AssetStatusBadge status={asset.status} showIcon />
              )}
              {asset.criticality && (
                <AssetCriticalityBadge criticality={asset.criticality} />
              )}
              <Badge variant="outline">
                {asset.system_type?.replace("_", " ")}
              </Badge>
              {asset.environment && (
                <Badge variant="secondary">{asset.environment}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/assets/${resolvedParams.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>

          {asset.status && (
            <Button size="sm" onClick={() => setStatusModalOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          {asset.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {asset.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Identification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Information
              </CardTitle>
              <CardDescription>
                Network identifiers and connectivity details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {asset.hostname && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Hostname
                  </p>
                  <p className="text-base">{asset.hostname}</p>
                </div>
              )}
              {asset.ip_address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    IP Address
                  </p>
                  <p className="text-base font-mono">{asset.ip_address}</p>
                </div>
              )}
              {asset.asset_id && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Asset ID
                  </p>
                  <p className="text-base">{asset.asset_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ownership & Location Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ownership & Location
              </CardTitle>
              <CardDescription>
                Organizational assignment and physical location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {asset.owner && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Owner
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {asset.owner.name || asset.owner.email}
                  </div>
                </div>
              )}
              {asset.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Department
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" />
                    {asset.department}
                  </div>
                </div>
              )}
              {asset.location && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Location
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {asset.location}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vulnerability Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Vulnerability Summary
              </CardTitle>
              <CardDescription>
                Security vulnerabilities affecting this asset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Total Vulnerabilities
                </span>
                <Badge
                  variant={
                    data.vulnerability_count && data.vulnerability_count > 0
                      ? "destructive"
                      : "outline"
                  }
                >
                  {data.vulnerability_count || 0}
                </Badge>
              </div>
              {data.vulnerability_stats &&
                Object.keys(data.vulnerability_stats).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      By Severity
                    </p>
                    {Object.entries(data.vulnerability_stats).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm capitalize">{severity}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                )}
              {data.vulnerability_count && data.vulnerability_count > 0 && (
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/vulnerabilities?asset_id=${resolvedParams.id}`}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Vulnerabilities
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Vulnerability Findings */}
          {!isLoadingFindings &&
            findingsData?.data &&
            findingsData.data.length > 0 && (
              <AssetFindingsList
                findings={findingsData.data}
                assetId={resolvedParams.id}
              />
            )}

          {/* Tags Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>Asset categorization and labels</CardDescription>
            </CardHeader>
            <CardContent>
              <TagManager assetId={resolvedParams.id} tags={asset.tags || []} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.last_scan_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Last Scanned
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(asset.last_scan_date), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              )}

              {asset.owner && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Owner
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {asset.owner.name || asset.owner.email}
                  </div>
                </div>
              )}

              <Separator />

              {asset.created_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Created
                  </p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(asset.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}

              {asset.updated_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Last Updated
                  </p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(asset.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}

              {asset.deleted_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Deleted
                  </p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(asset.deleted_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset ID Card */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Asset UUID
                </p>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {asset.id}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  System Type
                </p>
                <Badge variant="outline">
                  {asset.system_type?.replace("_", " ")}
                </Badge>
              </div>
              {asset.environment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Environment
                  </p>
                  <Badge variant="secondary">{asset.environment}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Modal */}
      {asset.status && (
        <StatusChangeModal
          assetId={resolvedParams.id}
          currentStatus={asset.status}
          assetName={asset.hostname || asset.asset_id || "Asset"}
          open={statusModalOpen}
          onOpenChange={setStatusModalOpen}
        />
      )}
    </div>
  );
}
