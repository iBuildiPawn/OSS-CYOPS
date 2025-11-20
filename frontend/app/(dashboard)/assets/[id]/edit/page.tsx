"use client";

import { AlertTriangle, ArrowLeft, Server } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsset, useUpdateAsset } from "@/hooks/use-assets";
import type { UpdateAssetRequest } from "@/types/asset";
import { AssetForm } from "@/components/assets/asset-form";
import { usePageHeader } from "@/contexts/page-header-context";

interface EditAssetPageProps {
  params: Promise<{ id: string }>;
}

export default function EditAssetPage({ params }: EditAssetPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useAsset(resolvedParams.id);
  const updateMutation = useUpdateAsset(resolvedParams.id);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { setPageHeader } = usePageHeader();

  // Extract asset from response (handle both direct object and nested structure)
  const asset = data ? ("asset" in data ? data.asset : data) : null;

  // Memoize header elements (MUST be before any conditional returns)
  const headerIcon = useMemo(() => <Server className="h-5 w-5" />, []);

  // Set page header with dynamic asset name (MUST be before any conditional returns)
  useEffect(() => {
    const assetName = asset?.hostname || asset?.asset_id || "this asset";
    setPageHeader(
      "Edit Asset",
      `Update information for ${assetName}`,
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon, asset?.hostname, asset?.asset_id]);

  const handleSubmit = async (formData: any) => {
    try {
      setSubmitError(null);

      // Transform form data to API request format (remove read-only fields)
      const requestData: UpdateAssetRequest = {
        hostname: formData.hostname,
        ip_address: formData.ip_address,
        asset_id: formData.asset_id,
        system_type: formData.system_type,
        description: formData.description,
        environment: formData.environment,
        criticality: formData.criticality,
        status: formData.status,
        owner_id: formData.owner_id,
        department: formData.department,
        location: formData.location,
      };

      await updateMutation.mutateAsync(requestData);

      toast.success("Asset updated successfully", {
        description: `Changes to "${formData.hostname || formData.asset_id || "asset"}" have been saved.`,
      });

      // Navigate back to detail page
      router.push(`/assets/${resolvedParams.id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update asset";
      setSubmitError(errorMessage);
      toast.error("Failed to update asset", {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    router.push(`/assets/${resolvedParams.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
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
      <div className="container mx-auto py-8 max-w-4xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Asset not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Form */}
      <AssetForm
        mode="edit"
        defaultValues={asset}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
        error={submitError}
      />
    </div>
  );
}
