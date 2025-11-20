/**
 * Error handling utilities for API and application errors
 */

import { toast } from "sonner";

/**
 * Standard error response from backend API
 */
export interface APIError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  NETWORK = "NETWORK_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  SERVER = "SERVER_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * Structured error class for application errors
 */
export class AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  field?: string;
  details?: Record<string, unknown>;
  retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options?: {
      statusCode?: number;
      field?: string;
      details?: Record<string, unknown>;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.statusCode = options?.statusCode;
    this.field = options?.field;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;
  }
}

/**
 * Parse error from various sources into AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(error.message, ErrorType.UNKNOWN);
  }

  // API error response
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;

    // Check for fetch/network errors
    if ("cause" in err && err.cause instanceof Error) {
      return new AppError(
        "Network connection failed. Please check your internet connection.",
        ErrorType.NETWORK,
        { retryable: true },
      );
    }

    // API error response
    if ("message" in err && typeof err.message === "string") {
      const statusCode =
        typeof err.statusCode === "number" ? err.statusCode : undefined;
      const type = getErrorTypeFromStatus(statusCode);

      return new AppError(err.message, type, {
        statusCode,
        field: typeof err.field === "string" ? err.field : undefined,
        details:
          typeof err.details === "object"
            ? (err.details as Record<string, unknown>)
            : undefined,
        retryable: isRetryableError(statusCode),
      });
    }
  }

  // Fallback for unknown errors
  return new AppError(
    "An unexpected error occurred. Please try again.",
    ErrorType.UNKNOWN,
  );
}

/**
 * Determine error type from HTTP status code
 */
function getErrorTypeFromStatus(statusCode?: number): ErrorType {
  if (!statusCode) return ErrorType.UNKNOWN;

  if (statusCode === 401) return ErrorType.AUTHENTICATION;
  if (statusCode === 403) return ErrorType.AUTHORIZATION;
  if (statusCode === 404) return ErrorType.NOT_FOUND;
  if (statusCode === 409) return ErrorType.CONFLICT;
  if (statusCode === 422) return ErrorType.VALIDATION;
  if (statusCode === 429) return ErrorType.RATE_LIMIT;
  if (statusCode >= 500) return ErrorType.SERVER;

  return ErrorType.UNKNOWN;
}

/**
 * Determine if error is retryable based on status code
 */
function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return false;

  // Network errors, rate limits, and server errors are retryable
  return (
    statusCode === 429 || // Rate limit
    statusCode === 503 || // Service unavailable
    statusCode === 504 || // Gateway timeout
    statusCode >= 500 // Server errors
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const appError = parseError(error);

  switch (appError.type) {
    case ErrorType.NETWORK:
      return "Network connection failed. Please check your internet connection and try again.";
    case ErrorType.VALIDATION:
      return appError.field
        ? `Validation error: ${appError.message}`
        : "Please check your input and try again.";
    case ErrorType.AUTHENTICATION:
      return "Your session has expired. Please sign in again.";
    case ErrorType.AUTHORIZATION:
      return "You don't have permission to perform this action.";
    case ErrorType.NOT_FOUND:
      return "The requested resource was not found.";
    case ErrorType.CONFLICT:
      return "This operation conflicts with existing data. Please refresh and try again.";
    case ErrorType.RATE_LIMIT:
      return "Too many requests. Please wait a moment and try again.";
    case ErrorType.SERVER:
      return "A server error occurred. Our team has been notified.";
    default:
      return (
        appError.message || "An unexpected error occurred. Please try again."
      );
  }
}

/**
 * Show error toast notification
 */
export function showErrorToast(error: unknown, title?: string): void {
  const appError = parseError(error);
  const message = getErrorMessage(error);

  toast.error(title || "Error", {
    description: message,
    duration: appError.type === ErrorType.NETWORK ? 5000 : 4000,
  });
}

/**
 * Handle API error with toast notification
 */
export function handleAPIError(error: unknown, context?: string): AppError {
  const appError = parseError(error);

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[API Error${context ? ` - ${context}` : ""}]:`, {
      message: appError.message,
      type: appError.type,
      statusCode: appError.statusCode,
      field: appError.field,
      details: appError.details,
    });
  }

  // Show toast notification
  showErrorToast(appError, context);

  // In production, send to error tracking service
  // Example: Sentry.captureException(appError, { extra: { context } });

  return appError;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  },
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error: unknown) => parseError(error).retryable,
    onRetry,
  } = options || {};

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        break;
      }

      // Call retry callback
      onRetry?.(error, attempt + 1);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next retry (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Validate response status and throw appropriate error
 */
export async function validateResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorData: APIError | null = null;

    // Try to parse JSON error response
    if (contentType?.includes("application/json")) {
      try {
        errorData = await response.json();
      } catch {
        // Failed to parse JSON, use status text
      }
    }

    const message =
      errorData?.message || response.statusText || "Request failed";

    throw new AppError(message, getErrorTypeFromStatus(response.status), {
      statusCode: response.status,
      field: errorData?.field,
      details: errorData?.details,
      retryable: isRetryableError(response.status),
    });
  }
}

/**
 * Optimistic update error handler
 */
export function handleOptimisticError<T>(
  error: unknown,
  rollback: () => void,
  context?: string,
): void {
  const appError = parseError(error);

  // Rollback optimistic update
  rollback();

  // Handle conflict errors specially
  if (appError.type === ErrorType.CONFLICT) {
    toast.error("Update Conflict", {
      description:
        "This item was modified by another user. The page will refresh to show the latest data.",
      duration: 5000,
    });

    // Refresh page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);

    return;
  }

  // Standard error handling
  handleAPIError(error, context);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Record<string, string[]> | undefined,
): string {
  if (!errors) return "";

  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("; ");
}
