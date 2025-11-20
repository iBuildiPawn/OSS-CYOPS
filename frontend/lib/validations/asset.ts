import { z } from "zod";

// Enum schemas
export const systemTypeSchema = z.enum([
  "SERVER",
  "WORKSTATION",
  "NETWORK_DEVICE",
  "APPLICATION",
  "CONTAINER",
  "CLOUD_SERVICE",
  "OTHER",
]);

export const environmentSchema = z.enum([
  "PRODUCTION",
  "STAGING",
  "DEVELOPMENT",
  "TEST",
]);

export const assetCriticalitySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export const assetStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "DECOMMISSIONED",
  "UNDER_MAINTENANCE",
]);

// IP address validation regex (IPv4 and IPv6)
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

// Create asset schema
export const assetCreateSchema = z
  .object({
    hostname: z.string().min(1).max(255).optional(),
    ip_address: z
      .string()
      .refine(
        (val) => !val || ipv4Regex.test(val) || ipv6Regex.test(val),
        "Must be a valid IPv4 or IPv6 address",
      )
      .optional(),
    asset_id: z.string().min(1).max(100).optional(),
    system_type: systemTypeSchema,
    description: z.string().optional(),
    environment: environmentSchema,
    criticality: assetCriticalitySchema.optional(),
    status: assetStatusSchema.optional(),
    owner_id: z.string().uuid().optional(),
    department: z.string().max(100).optional(),
    location: z.string().max(255).optional(),
    tags: z
      .array(
        z
          .string()
          .regex(
            /^[a-zA-Z0-9-_]+$/,
            "Tags must be alphanumeric with hyphens/underscores",
          ),
      )
      .optional(),
  })
  .refine((data) => data.hostname || data.ip_address || data.asset_id, {
    message:
      "At least one of hostname, IP address, or asset ID must be provided",
    path: ["hostname"],
  });

// Update asset schema (all fields optional except validation)
export const assetUpdateSchema = z.object({
  hostname: z.string().min(1).max(255).optional(),
  ip_address: z
    .string()
    .refine(
      (val) => !val || ipv4Regex.test(val) || ipv6Regex.test(val),
      "Must be a valid IPv4 or IPv6 address",
    )
    .optional(),
  asset_id: z.string().min(1).max(100).optional(),
  system_type: systemTypeSchema.optional(),
  description: z.string().optional(),
  environment: environmentSchema.optional(),
  criticality: assetCriticalitySchema.optional(),
  status: assetStatusSchema.optional(),
  owner_id: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
});

// Status update schema
export const assetStatusUpdateSchema = z.object({
  status: assetStatusSchema,
  notes: z.string().optional(),
});

// Add tags schema
export const addTagsSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(50)
        .regex(
          /^[a-zA-Z0-9-_]+$/,
          "Tags must be alphanumeric with hyphens/underscores",
        ),
    )
    .min(1, "At least one tag is required"),
});

// Type inference from schemas
export type AssetCreateFormData = z.infer<typeof assetCreateSchema>;
export type AssetUpdateFormData = z.infer<typeof assetUpdateSchema>;
export type AssetStatusUpdateFormData = z.infer<typeof assetStatusUpdateSchema>;
export type AddTagsFormData = z.infer<typeof addTagsSchema>;
