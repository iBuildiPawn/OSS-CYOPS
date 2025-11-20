"use client";

import { AlertCircle, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VulnerabilityForm } from "@/components/vulnerabilities/vulnerability-form";
import { VulnerabilityFormSkeleton } from "@/components/vulnerabilities/vulnerability-skeletons";
import {
  useUpdateVulnerability,
  useVulnerability,
} from "@/hooks/use-vulnerabilities";
import { usePageHeader } from "@/contexts/page-header-context";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditVulnerabilityPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useVulnerability(id);
  const updateMutation = useUpdateVulnerability(id);
  const { setPageHeader } = usePageHeader();

  const vulnerability = data?.data;

  // Memoize header elements (MUST be before any conditional returns)
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);

  // Set page header (MUST be before any conditional returns)
  useEffect(() => {
    setPageHeader(
      "Edit Vulnerability",
      "Update vulnerability details and information",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  const handleSubmit = async (formData: any) => {
    try {
      await updateMutation.mutateAsync(formData);

      toast.success("Vulnerability updated", {
        description: "The vulnerability has been updated successfully.",
      });

      router.push(`/vulnerabilities/${id}`);
    } catch (err) {
      toast.error("Failed to update vulnerability", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  };

  if (isLoading) {
    return <VulnerabilityFormSkeleton />;
  }

  if (error || !vulnerability) {
    return (
      <div className="space-y-6 w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "Vulnerability not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Convert vulnerability data to form data format
  const initialData = {
    title: vulnerability.title,
    description: vulnerability.description,
    severity: vulnerability.severity,
    cvss_score: vulnerability.cvss_score ?? undefined,
    cvss_vector: vulnerability.cvss_vector || undefined,
    cve_id: vulnerability.cve_id || undefined,
    discovery_date: vulnerability.discovery_date,
    impact_assessment: vulnerability.impact_assessment || undefined,
    steps_to_reproduce: vulnerability.steps_to_reproduce || undefined,
    mitigation_recommendations:
      vulnerability.mitigation_recommendations || undefined,
  };

  return (
    <div className="space-y-6 w-full">
      {/* Form */}
      <VulnerabilityForm
        mode="edit"
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        onCancel={() => router.push(`/vulnerabilities/${id}`)}
      />
    </div>
  );
}
