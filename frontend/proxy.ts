import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 * Runs on Node.js runtime at the network boundary
 * Handles authentication and route protection
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies (JWT-based auth)
  const token = request.cookies.get("auth_token")?.value;

  // Define public routes (no authentication required)
  const publicRoutes = [
    "/",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/dev/design-system", // Dev tools
  ];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Public routes: redirect authenticated users to overview
  if (isPublicRoute) {
    if (token && pathname !== "/" && !pathname.startsWith("/dev")) {
      // Authenticated user trying to access auth pages - redirect to overview
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    // Allow access to public routes
    return NextResponse.next();
  }

  // Protected routes: require authentication
  if (!token) {
    // No token found - redirect to signin with return URL
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated - allow access to protected routes
  // Note: Detailed permission checks (RBAC) are handled in layouts/components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
