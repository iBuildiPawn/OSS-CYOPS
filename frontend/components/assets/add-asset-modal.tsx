"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCreateAsset } from "@/hooks/use-assets";
import { useCheckDuplicateAsset } from "@/hooks/use-duplicate-check";
import type {
  AssetCreateFormData,
  AssetUpdateFormData,
} from "@/lib/validations/asset";
import type { CreateAssetRequest, Asset } from "@/types/asset";
import { AssetForm } from "@/components/assets/asset-form";
import { DuplicateWarningModal } from "@/components/assets/duplicate-warning-modal";

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAssetModal({
  open,
  onOpenChange,
  onSuccess,
}: AddAssetModalProps) {
  const createMutation = useCreateAsset();
  const checkDuplicate = useCheckDuplicateAsset();
  const [error, setError] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] =
    useState<AssetCreateFormData | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [savedFormData, setSavedFormData] =
    useState<Partial<AssetCreateFormData> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const formIsDirtyRef = useRef(false);

  const handleSubmit = async (
    formData: AssetCreateFormData | AssetUpdateFormData,
  ) => {
    try {
      setError(null);
      setPendingFormData(formData as AssetCreateFormData);
      // Save form data for persistence
      setSavedFormData(formData as AssetCreateFormData);

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

      // Clear saved form data and unsaved changes flag on success
      setSavedFormData(null);
      setHasUnsavedChanges(false);
      formIsDirtyRef.current = false;

      // Close modal and trigger success callback
      onOpenChange(false);
      onSuccess?.();

      // Reset form state
      setError(null);
      setPendingFormData(null);
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

  const handleOpenChange = (newOpen: boolean) => {
    // If trying to close and there are unsaved changes, show confirmation
    if (!newOpen && hasUnsavedChanges && formIsDirtyRef.current) {
      setShowCloseConfirmation(true);
      return;
    }

    // Otherwise, allow the modal to close/open normally
    onOpenChange(newOpen);
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    // Clear unsaved changes flag and close modal
    setHasUnsavedChanges(false);
    formIsDirtyRef.current = false;
    setSavedFormData(null);
    onOpenChange(false);
  };

  const handleCancelClose = () => {
    setShowCloseConfirmation(false);
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges && formIsDirtyRef.current) {
      setShowCloseConfirmation(true);
      return;
    }

    onOpenChange(false);
    setError(null);
    setPendingFormData(null);
  };

  const handleFormChange = (isDirty: boolean) => {
    formIsDirtyRef.current = isDirty;
    setHasUnsavedChanges(isDirty);
  };

  // Add browser navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && formIsDirtyRef.current && open) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, open]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Register New Asset</DialogTitle>
            <DialogDescription>
              Add a new asset to your organization's inventory
            </DialogDescription>
          </DialogHeader>

          {/* Success Alert */}
          {createMutation.isSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Asset created successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="mt-4">
            <AssetForm
              mode="create"
              defaultValues={savedFormData as Partial<Asset> | undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onFormChange={handleFormChange}
              isLoading={createMutation.isPending || checkDuplicate.isPending}
              error={error}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog
        open={showCloseConfirmation}
        onOpenChange={setShowCloseConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the form. If you close this dialog,
              your changes will be lost. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        duplicates={duplicateMatches}
        onProceed={handleProceedWithCreation}
        isPending={createMutation.isPending}
      />
    </>
  );
}
