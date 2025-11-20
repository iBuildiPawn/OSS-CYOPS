"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, roleApi } from "@/lib/api";
import type { User } from "@/types/api";

interface RoleAssignmentProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleAssignment({
  user,
  open,
  onOpenChange,
}: RoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const queryClient = useQueryClient();

  // Load roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: roleApi.listRoles,
    enabled: open,
  });

  // Set initial role when user changes
  useState(() => {
    if (user?.role?.id) {
      setSelectedRoleId(user.role.id);
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      adminApi.assignRole(userId, roleId),
    onSuccess: () => {
      toast.success("Role assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to assign role", {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  const handleAssign = () => {
    if (!user || !selectedRoleId) {
      toast.error("Please select a role");
      return;
    }

    assignMutation.mutate({
      userId: user.id,
      roleId: selectedRoleId,
    });
  };

  const roles = rolesData?.roles || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Role
          </DialogTitle>
          <DialogDescription>
            Assign a role to <span className="font-medium">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Role */}
          {user?.role && (
            <div className="space-y-2">
              <Label>Current Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{user.role.display_name}</Badge>
                <span className="text-sm text-muted-foreground">
                  Level {user.role.level}
                </span>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">New Role</Label>
            {rolesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roles...
              </div>
            ) : (
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{role.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Level {role.level}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Role Details */}
          {selectedRoleId && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
              {roles
                .filter((r) => r.id === selectedRoleId)
                .map((role) => (
                  <div key={role.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{role.display_name}</span>
                      <Badge variant="secondary">Level {role.level}</Badge>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                    {role.is_system && (
                      <Badge variant="outline" className="text-xs">
                        System Role
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selectedRoleId ||
              selectedRoleId === user?.role?.id ||
              assignMutation.isPending
            }
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
