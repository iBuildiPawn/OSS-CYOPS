import axios, { type AxiosError, type AxiosInstance } from "axios";
import { AppError, ErrorType } from "@/lib/error-handler";

// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookie-based sessions
});

// Token management
const TOKEN_KEY = "auth_token";

export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    // Also set as cookie for proxy.ts to access (server-side)
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    // Also remove cookie
    document.cookie = "auth_token=; path=/; max-age=0";
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common error scenarios
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const data = error.response.data as {
        message?: string;
        field?: string;
        details?: Record<string, unknown>;
      };

      // Create structured error
      let errorType = ErrorType.UNKNOWN;
      let message =
        data?.message || error.message || "An unexpected error occurred";

      switch (status) {
        case 401:
          errorType = ErrorType.AUTHENTICATION;
          message = "Your session has expired. Please sign in again.";
          // Redirect to login
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/signin")
          ) {
            removeAuthToken();
            window.location.href = "/signin";
          }
          break;
        case 403:
          errorType = ErrorType.AUTHORIZATION;
          message =
            data?.message ||
            "You don't have permission to perform this action.";
          break;
        case 404:
          errorType = ErrorType.NOT_FOUND;
          message = data?.message || "The requested resource was not found.";
          break;
        case 409:
          errorType = ErrorType.CONFLICT;
          message =
            data?.message || "This operation conflicts with existing data.";
          break;
        case 422:
          errorType = ErrorType.VALIDATION;
          message =
            data?.message || "Validation failed. Please check your input.";
          break;
        case 429:
          errorType = ErrorType.RATE_LIMIT;
          message = "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = ErrorType.SERVER;
          message =
            data?.message || "A server error occurred. Please try again later.";
          break;
      }

      // Throw structured AppError
      throw new AppError(message, errorType, {
        statusCode: status,
        field: data?.field,
        details: data?.details,
        retryable:
          status === 429 || status === 503 || status === 504 || status >= 500,
      });
    } else if (error.request) {
      // Request made but no response - network error
      throw new AppError(
        "Network connection failed. Please check your internet connection.",
        ErrorType.NETWORK,
        { retryable: true },
      );
    } else {
      // Error in request configuration
      throw new AppError(
        error.message || "Failed to make request.",
        ErrorType.UNKNOWN,
      );
    }
  },
);

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
  request_id?: string;
  details?: Record<string, unknown>;
}

// Helper functions
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || "An unexpected error occurred";
  }
  return "An unexpected error occurred";
};

export default apiClient;
