"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, roleApi } from "@/lib/api";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateUserFormData {
  email: string;
  password: string;
  name: string;
  role_id: string;
  otp_code: string;
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>();

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.listRoles(),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserFormData) => adminApi.createUser(data),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
      reset();
      setSelectedRoleId("");
    },
    onError: (error: any) => {
      toast.error("Failed to create user", {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    if (!selectedRoleId) {
      toast.error("Please select a role");
      return;
    }

    createUserMutation.mutate({
      ...data,
      role_id: selectedRoleId,
    });
  };

  const handleClose = () => {
    if (!createUserMutation.isPending) {
      onOpenChange(false);
      reset();
      setSelectedRoleId("");
    }
  };

  const roles = rolesData?.roles || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will be automatically verified.
            You must provide your 2FA code to confirm this action.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              disabled={createUserMutation.isPending}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register("name")}
              disabled={createUserMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
              disabled={createUserMutation.isPending}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={createUserMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedRoleId && (
              <p className="text-sm text-muted-foreground">
                Select a role to assign to the user
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp_code">
              Your 2FA Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="otp_code"
              type="text"
              placeholder="000000"
              maxLength={6}
              {...register("otp_code", {
                required: "2FA code is required",
                pattern: {
                  value: /^[0-9]{6}$/,
                  message: "Code must be 6 digits",
                },
              })}
              disabled={createUserMutation.isPending}
              className="text-center text-2xl tracking-widest"
            />
            {errors.otp_code && (
              <p className="text-sm text-destructive">
                {errors.otp_code.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Enter your 6-digit authenticator code to confirm this action
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
