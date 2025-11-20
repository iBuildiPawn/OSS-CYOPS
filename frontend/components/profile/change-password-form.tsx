"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleApiError, profileApi, removeAuthToken } from "@/lib/api";
import {
  type ChangePasswordFormData,
  changePasswordSchema,
} from "@/lib/validations/profile";

export function ChangePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: (data) => {
      toast.success(data.message);
      reset();
      setIsLoading(false);
      // Clear token and redirect to signin after password change
      removeAuthToken();
      setTimeout(() => {
        router.push("/signin");
      }, 1500);
    },
    onError: (error: unknown) => {
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
      setIsLoading(false);
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    setIsLoading(true);
    changePasswordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              placeholder="••••••••"
              {...register("current_password")}
              disabled={isLoading}
            />
            {errors.current_password && (
              <p className="text-sm text-red-500">
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="••••••••"
              {...register("new_password")}
              disabled={isLoading}
            />
            {errors.new_password && (
              <p className="text-sm text-red-500">
                {errors.new_password.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, number,
              and special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              {...register("confirm_password")}
              disabled={isLoading}
            />
            {errors.confirm_password && (
              <p className="text-sm text-red-500">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Changing..." : "Change Password"}
          </Button>

          <p className="text-sm text-amber-600">
            ⚠️ You will be signed out after changing your password
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
