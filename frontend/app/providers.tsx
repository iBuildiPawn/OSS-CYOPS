"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { parseError } from "@/lib/error-handler";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - optimized for asset lists
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection (formerly cacheTime)
            refetchOnWindowFocus: true, // SECURITY: Refetch on window focus to ensure fresh data
            refetchOnMount: false, // Use cached data on mount if available
            retry: (failureCount, error) => {
              // Parse error to check if it's retryable
              const appError = parseError(error);

              // Don't retry authentication/authorization errors
              if (appError.statusCode === 401 || appError.statusCode === 403) {
                return false;
              }

              // Don't retry validation errors
              if (appError.statusCode === 422) {
                return false;
              }

              // Retry network errors and server errors up to 2 times
              if (appError.retryable && failureCount < 2) {
                return true;
              }

              return false;
            },
            retryDelay: (attemptIndex) => {
              // Exponential backoff: 1s, 2s, 4s
              return Math.min(1000 * 2 ** attemptIndex, 10000);
            },
            // Performance: Enable structural sharing for better React rendering
            structuralSharing: true,
          },
          mutations: {
            retry: (failureCount, error) => {
              // Parse error to check if it's retryable
              const appError = parseError(error);

              // Only retry network errors and rate limits for mutations
              if (appError.retryable && failureCount < 1) {
                return true;
              }

              return false;
            },
            retryDelay: 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
