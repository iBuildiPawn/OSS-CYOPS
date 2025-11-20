"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Settings as SettingsIcon, User } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { SessionsList } from "@/components/profile/sessions-list";
import { TwoFactorDisable } from "@/components/auth/two-factor-disable";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { profileApi } from "@/lib/api";
import { usePageHeader } from "@/contexts/page-header-context";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const { setPageHeader } = usePageHeader();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.getProfile,
  });

  const user = data?.user;

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <User className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "My Profile",
      "Manage your profile, account settings, and security preferences",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  if (isLoading) {
    return (
      <>
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500">Failed to load profile</p>
          <Button onClick={() => router.push("/signin")} className="mt-4">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="max-w-3xl">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              <p className="text-muted-foreground text-sm mt-1">
                View and edit your profile information
              </p>
            </div>
            {user && <ProfileForm user={user} />}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-3xl space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold">Account Settings</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your account settings and password
              </p>
            </div>
            <ChangePasswordForm />
            <SessionsList />
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Security Settings
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your account security and two-factor authentication
              </p>
            </div>
            {user && (
              <>
                {user.two_factor_enabled ? (
                  <TwoFactorDisable />
                ) : (
                  <TwoFactorSetup />
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
  );
}
