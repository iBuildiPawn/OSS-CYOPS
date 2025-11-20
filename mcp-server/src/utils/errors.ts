/**
 * Error handling utilities
 */

import { AxiosError } from "axios";

/**
 * Handle API errors and return user-friendly error messages
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Handle response errors
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;

      switch (status) {
        case 400:
          return `Error: Invalid request. ${data?.error || data?.message || "Please check your parameters."}`;

        case 401:
          return "Error: Authentication required. Check that CYOPS_API_TOKEN is set correctly and not expired.";

        case 403:
          return `Error: Permission denied. ${data?.error || "You don't have access to this resource."}`;

        case 404:
          return `Error: Resource not found. ${data?.error || "Please verify the ID is correct."}`;

        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";

        case 500:
        case 502:
        case 503:
          return `Error: Backend service error (${status}). ${data?.error || "Please try again later."}`;

        default:
          return `Error: API request failed with status ${status}. ${data?.error || data?.message || ""}`;
      }
    }

    // Handle request errors
    if (axiosError.request) {
      if (axiosError.code === "ECONNABORTED") {
        return "Error: Request timed out. The backend may be slow or unresponsive.";
      }
      if (axiosError.code === "ECONNREFUSED") {
        return `Error: Cannot connect to backend at ${axiosError.config?.baseURL}. Check that CYOPS_BACKEND_URL is correct and the backend is running.`;
      }
      return `Error: Network error (${axiosError.code || "unknown"}). Check your connection to the backend.`;
    }
  }

  // Handle other errors
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: An unexpected error occurred: ${String(error)}`;
}

// Re-export axios for type checking
import axios from "axios";
