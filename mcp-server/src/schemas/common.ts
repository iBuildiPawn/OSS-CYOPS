/**
 * Common Zod schemas used across all tools
 */

import { z } from "zod";
import { ResponseFormat, DEFAULT_LIMIT, MAX_LIMIT, DEFAULT_OFFSET } from "../constants.js";

/**
 * Response format schema
 */
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

/**
 * Pagination schemas
 */
export const LimitSchema = z.number()
  .int("Limit must be an integer")
  .min(1, "Limit must be at least 1")
  .max(MAX_LIMIT, `Limit cannot exceed ${MAX_LIMIT}`)
  .default(DEFAULT_LIMIT)
  .describe(`Maximum number of results to return (1-${MAX_LIMIT}, default: ${DEFAULT_LIMIT})`);

export const OffsetSchema = z.number()
  .int("Offset must be an integer")
  .min(0, "Offset cannot be negative")
  .default(DEFAULT_OFFSET)
  .describe("Number of results to skip for pagination (default: 0)");

/**
 * Common pagination input schema
 */
export const PaginationInputSchema = z.object({
  limit: LimitSchema,
  offset: OffsetSchema
});

/**
 * ID parameter schema
 */
export const IDSchema = z.string()
  .min(1, "ID cannot be empty")
  .describe("Unique identifier (UUID)");

/**
 * Optional string that can be empty
 */
export const OptionalStringSchema = z.string().optional();

/**
 * Date range filter schema
 */
export const DateRangeSchema = z.object({
  from: z.string()
    .datetime("Invalid datetime format, use ISO 8601")
    .optional()
    .describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)"),
  to: z.string()
    .datetime("Invalid datetime format, use ISO 8601")
    .optional()
    .describe("End date in ISO 8601 format (e.g., 2024-12-31T23:59:59Z)")
}).optional();
