"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { profileApi } from "@/lib/api";
import { validateAuthToken } from "@/lib/auth-guard";
import { isAdmin } from "@/lib/permissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Validate auth token first
  useEffect(() => {
    if (!validateAuthToken()) {
      toast.error("Session expired. Please sign in again.");
      router.replace("/signin");
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.getProfile,
    retry: false,
    // Force refetch to ensure fresh data
    staleTime: 0,
  });

  const user = data?.user;

  useEffect(() => {
    if (isLoading) return;

    if (error || !user) {
      toast.error("Please sign in to access admin panel");
      router.push("/signin");
      return;
    }

    if (!isAdmin(user)) {
      toast.error("Access denied: Admin privileges required");
      router.push("/overview");
      return;
    }
  }, [user, isLoading, error, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authorized
  if (!user || !isAdmin(user)) {
    return null;
  }

  return <>{children}</>;
}
