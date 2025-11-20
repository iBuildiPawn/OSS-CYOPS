"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { assetApi } from "@/lib/api";
import {
  type AssetCreateFormData,
  type AssetUpdateFormData,
  assetCreateSchema,
  assetUpdateSchema,
} from "@/lib/validations/asset";
import type { Asset } from "@/types/asset";

interface AssetFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<Asset>;
  onSubmit: (
    data: AssetCreateFormData | AssetUpdateFormData,
  ) => void | Promise<void>;
  onCancel: () => void;
  onFormChange?: (isDirty: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AssetForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  onFormChange,
  isLoading = false,
  error = null,
}: AssetFormProps) {
  const schema = mode === "create" ? assetCreateSchema : assetUpdateSchema;

  // State for duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: Asset[];
    field: "hostname" | "ip_address";
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AssetCreateFormData | AssetUpdateFormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      system_type: "SERVER",
      environment: "PRODUCTION",
      status: "ACTIVE",
    },
  });

  const systemType = watch("system_type");
  const environment = watch("environment");

  // Notify parent component of form changes
  useEffect(() => {
    onFormChange?.(isDirty);
  }, [isDirty, onFormChange]);

  // Duplicate check handler
  const checkForDuplicates = useCallback(
    async (field: "hostname" | "ip_address", value: string) => {
      if (!value || value.trim() === "") {
        setDuplicateWarning(null);
        return;
      }

      // Skip duplicate check in edit mode if value hasn't changed
      if (mode === "edit" && defaultValues) {
        if (field === "hostname" && value === defaultValues.hostname) return;
        if (field === "ip_address" && value === defaultValues.ip_address)
          return;
      }

      try {
        setIsCheckingDuplicate(true);
        const currentEnv = environment || "PRODUCTION";

        const response = await assetApi.checkDuplicate({
          [field]: value,
          environment: currentEnv as any,
        });

        if (
          response.is_duplicate &&
          response.matches &&
          response.matches.length > 0
        ) {
          setDuplicateWarning({
            matches: response.matches,
            field,
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error("Error checking for duplicates:", err);
        // Don't show error to user, just silently fail
      } finally {
        setIsCheckingDuplicate(false);
      }
    },
    [mode, defaultValues, environment],
  );
  const criticality = watch("criticality");
  const status = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <Alert
          variant="default"
          className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Similar asset{duplicateWarning.matches.length > 1 ? "s" : ""}{" "}
              found
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {duplicateWarning.matches.length === 1
                ? "An asset"
                : `${duplicateWarning.matches.length} assets`}{" "}
              with the same{" "}
              {duplicateWarning.field === "hostname"
                ? "hostname"
                : "IP address"}{" "}
              already exist{duplicateWarning.matches.length === 1 ? "s" : ""} in
              this environment:
            </p>
            <ul className="mt-2 space-y-1">
              {duplicateWarning.matches.map((match) => (
                <li key={match.id} className="text-sm">
                  <Link
                    href={`/assets/${match.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    target="_blank"
                  >
                    {match.hostname || match.ip_address || match.asset_id}
                  </Link>
                  {match.hostname && match.ip_address && (
                    <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                      ({match.ip_address})
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              Please verify this is not a duplicate before proceeding.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Identification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
          <CardDescription>
            Provide at least one identifier: hostname, IP address, or asset ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hostname */}
          <div className="space-y-2">
            <Label htmlFor="hostname">
              Hostname
              {isCheckingDuplicate && (
                <Loader2 className="inline h-3 w-3 ml-2 animate-spin" />
              )}
            </Label>
            <Input
              id="hostname"
              placeholder="e.g., web-server-01, db-primary"
              {...register("hostname")}
              onBlur={(e) => checkForDuplicates("hostname", e.target.value)}
              disabled={isLoading}
            />
            {errors.hostname && (
              <p className="text-sm text-destructive">
                {errors.hostname.message}
              </p>
            )}
          </div>

          {/* IP Address */}
          <div className="space-y-2">
            <Label htmlFor="ip_address">
              IP Address
              {isCheckingDuplicate && (
                <Loader2 className="inline h-3 w-3 ml-2 animate-spin" />
              )}
            </Label>
            <Input
              id="ip_address"
              placeholder="e.g., 192.168.1.100 or 2001:db8::1"
              {...register("ip_address")}
              onBlur={(e) => checkForDuplicates("ip_address", e.target.value)}
              disabled={isLoading}
            />
            {errors.ip_address && (
              <p className="text-sm text-destructive">
                {errors.ip_address.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Supports IPv4 and IPv6 addresses
            </p>
          </div>

          {/* Asset ID */}
          <div className="space-y-2">
            <Label htmlFor="asset_id">Asset ID</Label>
            <Input
              id="asset_id"
              placeholder="e.g., ASSET-001, SRV-PROD-001"
              {...register("asset_id")}
            />
            {errors.asset_id && (
              <p className="text-sm text-destructive">
                {errors.asset_id.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Internal asset identifier or inventory number
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the asset and its purpose..."
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Classification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>
            Categorize the asset by type, environment, and criticality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Type */}
          <div className="space-y-2">
            <Label htmlFor="system_type">System Type *</Label>
            <Select
              value={systemType}
              onValueChange={(value) =>
                setValue("system_type", value as any, { shouldDirty: true })
              }
            >
              <SelectTrigger id="system_type">
                <SelectValue placeholder="Select system type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SERVER">Server</SelectItem>
                <SelectItem value="WORKSTATION">Workstation</SelectItem>
                <SelectItem value="NETWORK_DEVICE">Network Device</SelectItem>
                <SelectItem value="APPLICATION">Application</SelectItem>
                <SelectItem value="CONTAINER">Container</SelectItem>
                <SelectItem value="CLOUD_SERVICE">Cloud Service</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.system_type && (
              <p className="text-sm text-destructive">
                {errors.system_type.message}
              </p>
            )}
          </div>

          {/* Environment */}
          <div className="space-y-2">
            <Label htmlFor="environment">Environment *</Label>
            <Select
              value={environment}
              onValueChange={(value) =>
                setValue("environment", value as any, { shouldDirty: true })
              }
            >
              <SelectTrigger id="environment">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="STAGING">Staging</SelectItem>
                <SelectItem value="DEVELOPMENT">Development</SelectItem>
                <SelectItem value="TEST">Test</SelectItem>
              </SelectContent>
            </Select>
            {errors.environment && (
              <p className="text-sm text-destructive">
                {errors.environment.message}
              </p>
            )}
          </div>

          {/* Criticality */}
          <div className="space-y-2">
            <Label htmlFor="criticality">Business Criticality</Label>
            <Select
              value={criticality || ""}
              onValueChange={(value) =>
                setValue("criticality", value as any, { shouldDirty: true })
              }
            >
              <SelectTrigger id="criticality">
                <SelectValue placeholder="Select criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            {errors.criticality && (
              <p className="text-sm text-destructive">
                {errors.criticality.message}
              </p>
            )}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Critical:</strong> Essential to business operations, any
                downtime causes major impact
                <br />
                <strong>High:</strong> Important to operations, downtime causes
                significant impact
                <br />
                <strong>Medium:</strong> Supports operations, downtime causes
                moderate impact
                <br />
                <strong>Low:</strong> Minimal business impact if unavailable
              </AlertDescription>
            </Alert>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status || "ACTIVE"}
              onValueChange={(value) =>
                setValue("status", value as any, { shouldDirty: true })
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">
                  Under Maintenance
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ownership Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership & Location</CardTitle>
          <CardDescription>
            Assign ownership and physical/logical location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              placeholder="e.g., Engineering, IT, Security"
              {...register("department")}
            />
            {errors.department && (
              <p className="text-sm text-destructive">
                {errors.department.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., DC1-Rack5-U12, AWS us-east-1, Office Floor 3"
              {...register("location")}
            />
            {errors.location && (
              <p className="text-sm text-destructive">
                {errors.location.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Physical location, datacenter, cloud region, or organizational
              location
            </p>
          </div>

          {/* Owner ID - Note: For now, we'll show a text field. In production, this would be a user selector */}
          <div className="space-y-2">
            <Label htmlFor="owner_id">Owner ID (UUID)</Label>
            <Input
              id="owner_id"
              placeholder="Optional: UUID of the asset owner"
              {...register("owner_id")}
            />
            {errors.owner_id && (
              <p className="text-sm text-destructive">
                {errors.owner_id.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty for now. User selector will be added in Phase 6.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tags Section - Only for create mode initially */}
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags for easier categorization and filtering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., web, production, critical, nginx"
                {...register("tags")}
              />
              {"tags" in errors && errors.tags && (
                <p className="text-sm text-destructive">
                  {errors.tags.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tags must be alphanumeric with hyphens or underscores only
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={isLoading || (!isDirty && mode === "edit")}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Asset" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
