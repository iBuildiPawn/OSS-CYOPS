/**
 * Higher-Order Component for protecting routes with authentication
 *
 * Validates token on every render and navigation, preventing:
 * - Expired token access
 * - Cached page access after logout
 * - Session invalidation bypass
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ComponentType, useEffect, useState } from "react";
import { validateAuthToken } from "./auth-guard";

export interface WithAuthOptions {
  /**
   * Path to redirect to if not authenticated
   * @default "/signin"
   */
  redirectTo?: string;

  /**
   * Whether to show loading state while checking auth
   * @default true
   */
  showLoading?: boolean;

  /**
   * Custom loading component
   */
  LoadingComponent?: ComponentType;

  /**
   * Check auth on every navigation
   * @default true
   */
  checkOnNavigation?: boolean;
}

const defaultOptions: Required<Omit<WithAuthOptions, "LoadingComponent">> = {
  redirectTo: "/signin",
  showLoading: true,
  checkOnNavigation: true,
};

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">
          Verifying authentication...
        </p>
      </div>
    </div>
  );
}

/**
 * HOC to protect routes with authentication
 *
 * @example
 * ```tsx
 * export default withAuth(DashboardPage);
 * ```
 *
 * @example
 * ```tsx
 * export default withAuth(AdminPage, {
 *   redirectTo: "/overview",
 *   showLoading: false,
 * });
 * ```
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {},
) {
  const opts = { ...defaultOptions, ...options };
  const LoadingComponent = options.LoadingComponent || DefaultLoadingComponent;

  return function ProtectedRoute(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const checkAuthentication = () => {
        const isValid = validateAuthToken();

        if (!isValid) {
          // Store the attempted URL for redirect after login
          if (typeof window !== "undefined") {
            sessionStorage.setItem("redirectAfterLogin", pathname);
          }
          router.replace(opts.redirectTo);
          return false;
        }

        setIsAuthenticated(true);
        setIsChecking(false);
        return true;
      };

      // Small delay to allow token to be stored after login redirect
      const timeoutId = setTimeout(() => {
        checkAuthentication();
      }, 100);

      if (opts.checkOnNavigation) {
        // Re-check on navigation (pathname change)
        checkAuthentication();
      }

      // Set up periodic validation (every 30 seconds)
      const interval = setInterval(() => {
        const isValid = validateAuthToken();
        if (!isValid && isAuthenticated) {
          // Token expired during session
          router.replace(opts.redirectTo);
        }
      }, 30 * 1000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(interval);
      };
    }, [pathname, router, isAuthenticated]);

    // Show loading state while checking
    if (isChecking && opts.showLoading) {
      return <LoadingComponent />;
    }

    // Don't render component if not authenticated
    if (!isAuthenticated) {
      return null;
    }

    // Render protected component
    return <Component {...props} />;
  };
}

/**
 * Hook to check authentication status in components
 * Use this for manual auth checks
 */
export function useAuthGuard() {
  const router = useRouter();

  const checkAuth = (): boolean => {
    const isValid = validateAuthToken();
    if (!isValid) {
      router.replace("/signin");
      return false;
    }
    return true;
  };

  return { checkAuth, isAuthenticated: validateAuthToken() };
}

/**
 * @deprecated Use withAuth HOC instead
 */
export function useProtectedRoute() {
  const router = useRouter();

  useEffect(() => {
    const isValid = validateAuthToken();
    if (!isValid) {
      router.push("/signin");
    }
  }, [router]);
}
