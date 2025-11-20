"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { assessmentApi } from "@/lib/api";
import { toast } from "sonner";
import type {
  CreateAssessmentRequest,
  AssessmentType,
} from "@/types/assessment";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssessmentCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (assessmentId: string) => void;
}

export function AssessmentCreateModal({
  open,
  onOpenChange,
  onSuccess,
}: AssessmentCreateModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<CreateAssessmentRequest>({
    defaultValues: {
      start_date: format(new Date(), "yyyy-MM-dd"),
      assessment_type: "INTERNAL_AUDIT",
    },
  });

  const assessmentType = watch("assessment_type");

  const createMutation = useMutation({
    mutationFn: assessmentApi.create,
    onSuccess: (data) => {
      toast.success("Assessment created successfully");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      reset();
      onOpenChange(false);
      onSuccess?.(data.data.id);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to create assessment");
      toast.error("Failed to create assessment");
    },
  });

  const onSubmit = (data: CreateAssessmentRequest) => {
    setError(null);
    createMutation.mutate(data);
  };

  const assessmentTypes: { value: AssessmentType; label: string }[] = [
    { value: "INTERNAL_AUDIT", label: "Internal Audit" },
    { value: "EXTERNAL_AUDIT", label: "External Audit" },
    { value: "PENETRATION_TEST", label: "Penetration Test" },
    { value: "VULNERABILITY_SCAN", label: "Vulnerability Scan" },
    { value: "CODE_REVIEW", label: "Code Review" },
    { value: "SECURITY_REVIEW", label: "Security Review" },
    { value: "COMPLIANCE_AUDIT", label: "Compliance Audit" },
    { value: "THIRD_PARTY_ASSESSMENT", label: "3rd Party Assessment" },
  ];

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Assessment</DialogTitle>
          <DialogDescription>
            Add a new security assessment to track findings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Assessment Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...register("name", { required: "Name is required" })}
                      placeholder="e.g., Q1 2025 Security Audit"
                      disabled={createMutation.isPending}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Describe the scope and objectives of this assessment"
                      rows={3}
                      disabled={createMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessment_type">
                      Assessment Type{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={assessmentType}
                      onValueChange={(value) =>
                        setValue("assessment_type", value as AssessmentType)
                      }
                      disabled={createMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Assessor Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Assessor Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assessor_name">
                        Assessor Name{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="assessor_name"
                        {...register("assessor_name", {
                          required: "Assessor name is required",
                        })}
                        placeholder="e.g., John Doe"
                        disabled={createMutation.isPending}
                      />
                      {errors.assessor_name && (
                        <p className="text-sm text-destructive">
                          {errors.assessor_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assessor_organization">
                        Organization
                      </Label>
                      <Input
                        id="assessor_organization"
                        {...register("assessor_organization")}
                        placeholder="e.g., XYZ Security"
                        disabled={createMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Timeline</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        name="start_date"
                        control={control}
                        rules={{ required: "Start date is required" }}
                        render={({ field }) => (
                          <DatePicker
                            date={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              );
                            }}
                            disabled={createMutation.isPending}
                            placeholder="Select start date"
                          />
                        )}
                      />
                      {errors.start_date && (
                        <p className="text-sm text-destructive">
                          {errors.start_date.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Controller
                        name="end_date"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            date={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : undefined,
                              );
                            }}
                            disabled={createMutation.isPending}
                            placeholder="Select end date"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Creating..." : "Create Assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
