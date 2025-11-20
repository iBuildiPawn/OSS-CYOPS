"use client";

import { ArrowLeft, CheckCircle2, Server, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VulnerabilityForm } from "@/components/vulnerabilities/vulnerability-form";
import type { ImageFile } from "@/components/vulnerabilities/vulnerability-image-upload";
import { useCreateVulnerability } from "@/hooks/use-vulnerabilities";
import { assessmentApi, vulnerabilityApi } from "@/lib/api";
import type { CreateVulnerabilityRequest } from "@/types/vulnerability";
import { usePageHeader } from "@/contexts/page-header-context";

export default function NewVulnerabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createMutation = useCreateVulnerability();
  const { setPageHeader } = usePageHeader();
  const [error, setError] = useState<string | null>(null);
  const [proofImages, setProofImages] = useState<ImageFile[]>([]);

  const assessmentId = searchParams.get("assessment_id");

  // Fetch assessment details if creating from assessment
  const { data: assessmentData } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => assessmentApi.get(assessmentId!),
    enabled: !!assessmentId,
  });

  const linkToAssessmentMutation = useMutation({
    mutationFn: ({
      assessmentId,
      vulnerabilityId,
    }: {
      assessmentId: string;
      vulnerabilityId: string;
    }) =>
      assessmentApi.linkVulnerability(assessmentId, {
        vulnerability_id: vulnerabilityId,
      }),
  });

  const handleSubmit = async (data: CreateVulnerabilityRequest) => {
    try {
      setError(null);
      const result = await createMutation.mutateAsync(data);

      // If coming from an assessment, link the vulnerability to it
      if (assessmentId && result.data?.id) {
        try {
          await linkToAssessmentMutation.mutateAsync({
            assessmentId,
            vulnerabilityId: result.data.id,
          });
          queryClient.invalidateQueries({
            queryKey: ["assessment", assessmentId],
          });
        } catch (linkError) {
          console.error(
            "Failed to link vulnerability to assessment:",
            linkError,
          );
        }
      }

      // Upload proof images if any
      if (proofImages.length > 0 && result.data?.id) {
        try {
          const uploadPromises = proofImages.map((imageFile) =>
            vulnerabilityApi.uploadAttachment(
              result.data!.id,
              imageFile.file,
              "PROOF",
              imageFile.description,
            ),
          );
          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error("Failed to upload proof images:", uploadError);
          toast.warning(
            "Vulnerability created but some images failed to upload",
            {
              description:
                "You can upload images later from the vulnerability details page.",
            },
          );
        }
      }

      // Check if assets were auto-created
      if (result.auto_created_assets && result.auto_created_assets.length > 0) {
        const assetNames = result.auto_created_assets
          .map((a) => a.hostname || a.ip_address)
          .join(", ");

        const imageText =
          proofImages.length > 0
            ? ` with ${proofImages.length} proof image(s)`
            : "";
        toast.success("Vulnerability created successfully", {
          description: `Created vulnerability "${data.title}"${imageText} and ${result.auto_created_assets.length} new asset(s): ${assetNames}`,
          duration: 5000,
        });
      } else {
        const imageText =
          proofImages.length > 0
            ? ` with ${proofImages.length} proof image(s)`
            : "";
        toast.success("Vulnerability created successfully", {
          description: `"${data.title}"${imageText} has been added to the system.`,
        });
      }

      // Redirect back to assessment or vulnerabilities list
      if (assessmentId) {
        router.push(`/assessments/${assessmentId}`);
      } else {
        router.push("/vulnerabilities");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create vulnerability";
      setError(errorMessage);
      toast.error("Failed to create vulnerability", {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    const description =
      assessmentId && assessmentData?.data
        ? `Creating finding for assessment: ${assessmentData.data.name}`
        : "Document a new security vulnerability in your systems";

    setPageHeader(
      "Report New Vulnerability",
      description,
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon, assessmentId, assessmentData]);

  return (
    <div className="space-y-6 w-full">
      {/* Success Alert (if coming from redirect with success message) */}
      {createMutation.isSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Vulnerability created successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <VulnerabilityForm
        mode="create"
        initialData={
          assessmentId && assessmentData?.data
            ? { source: assessmentData.data.name }
            : undefined
        }
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
        error={error}
        images={proofImages}
        onImagesChange={setProofImages}
      />
    </div>
  );
}
