"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateAsset } from "@/hooks/use-assets";
import { useCheckDuplicateAsset } from "@/hooks/use-duplicate-check";
import type {
  AssetCreateFormData,
  AssetUpdateFormData,
} from "@/lib/validations/asset";
import type { CreateAssetRequest } from "@/types/asset";
import { AssetForm } from "@/components/assets/asset-form";
import { DuplicateWarningModal } from "@/components/assets/duplicate-warning-modal";

export default function NewAssetPage() {
  const router = useRouter();
  const createMutation = useCreateAsset();
  const checkDuplicate = useCheckDuplicateAsset();
  const [error, setError] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] =
    useState<AssetCreateFormData | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

  const handleSubmit = async (
    formData: AssetCreateFormData | AssetUpdateFormData,
  ) => {
    try {
      setError(null);
      setPendingFormData(formData as AssetCreateFormData);

      // Check for duplicates before creating
      const checkParams: any = {};

      if (formData.hostname) {
        checkParams.hostname = formData.hostname;
      }
      if (formData.ip_address) {
        checkParams.ip_address = formData.ip_address;
      }
      if (formData.asset_id) {
        checkParams.name = formData.asset_id;
      }

      // Only check if we have at least one identifier
      if (Object.keys(checkParams).length > 0) {
        const duplicateResult = await checkDuplicate.mutateAsync(checkParams);

        if (duplicateResult.count > 0) {
          // Show duplicate warning modal
          setDuplicateMatches(duplicateResult.duplicates);
          setDuplicateModalOpen(true);
          return; // Wait for user decision
        }
      }

      // No duplicates, proceed with creation
      await createAsset(formData as AssetCreateFormData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check for duplicates";
      setError(errorMessage);
      toast.error("Error", {
        description: errorMessage,
      });
    }
  };

  const createAsset = async (formData: AssetCreateFormData) => {
    try {
      // Transform form data to API request format
      const requestData: CreateAssetRequest = {
        ...formData,
      };

      const response = await createMutation.mutateAsync(requestData);

      toast.success("Asset created successfully", {
        description: `"${formData.hostname || formData.asset_id || "Asset"}" has been added to the inventory.`,
      });

      // Navigate to the new asset's detail page
      if (response.asset?.id) {
        router.push(`/assets/${response.asset.id}`);
      } else {
        router.push("/assets");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create asset";
      setError(errorMessage);
      toast.error("Failed to create asset", {
        description: errorMessage,
      });
    }
  };

  const handleProceedWithCreation = async () => {
    if (pendingFormData) {
      await createAsset(pendingFormData);
    }
  };

  const handleCancel = () => {
    router.push("/assets");
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Register New Asset
        </h1>
        <p className="text-muted-foreground">
          Add a new asset to your organization's inventory
        </p>
      </div>

      {/* Success Alert (if coming from redirect with success message) */}
      {createMutation.isSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Asset created successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <AssetForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending || checkDuplicate.isPending}
        error={error}
      />

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        duplicates={duplicateMatches}
        onProceed={handleProceedWithCreation}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
