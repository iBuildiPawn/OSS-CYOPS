"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type {
  AffectedSystem,
  CreateAffectedSystemRequest,
} from "@/types/vulnerability";

// Validation schema
const affectedSystemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  type: z.string().min(1, "Type is required"),
  version: z.string().optional(),
  environment: z.string().optional(),
  description: z.string().optional(),
  ip_address: z.string().optional(),
  hostname: z.string().optional(),
  owner: z.string().optional(),
});

type FormMode = "create" | "edit";

interface AffectedSystemFormProps {
  mode: FormMode;
  initialData?: Partial<AffectedSystem>;
  onSubmit: (data: CreateAffectedSystemRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AffectedSystemForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: AffectedSystemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateAffectedSystemRequest>({
    resolver: zodResolver(affectedSystemSchema),
    defaultValues: initialData || {
      name: "",
      type: "SERVER",
      version: "",
      environment: "PRODUCTION",
      description: "",
      ip_address: "",
      hostname: "",
      owner: "",
    },
  });

  const type = watch("type");
  const environment = watch("environment");

  const typeOptions = [
    { value: "SERVER", label: "Server" },
    { value: "WORKSTATION", label: "Workstation" },
    { value: "NETWORK_DEVICE", label: "Network Device" },
    { value: "APPLICATION", label: "Application" },
    { value: "CONTAINER", label: "Container" },
    { value: "CLOUD_SERVICE", label: "Cloud Service" },
    { value: "OTHER", label: "Other" },
  ];

  const environmentOptions = [
    { value: "PRODUCTION", label: "Production" },
    { value: "STAGING", label: "Staging" },
    { value: "DEVELOPMENT", label: "Development" },
    { value: "TEST", label: "Test" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide the essential details about this affected system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Production Web Server 1"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(value) => setValue("type", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={environment}
                onValueChange={(value) => setValue("environment", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {environmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              {...register("version")}
              placeholder="e.g., 2.5.1"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Additional details about this system..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Network Information */}
      <Card>
        <CardHeader>
          <CardTitle>Network Information</CardTitle>
          <CardDescription>Optional network-related details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                {...register("hostname")}
                placeholder="e.g., web-server-01"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip_address">IP Address</Label>
              <Input
                id="ip_address"
                {...register("ip_address")}
                placeholder="e.g., 192.168.1.100"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              {...register("owner")}
              placeholder="e.g., IT Team or john.doe@example.com"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {mode === "create" ? "Create System" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
