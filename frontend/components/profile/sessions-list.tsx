"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { handleApiError, profileApi } from "@/lib/api";

export function SessionsList() {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: profileApi.getActiveSessions,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: profileApi.revokeSession,
    onSuccess: () => {
      toast.success("Session revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setRevokingId(null);
    },
    onError: (error: unknown) => {
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
      setRevokingId(null);
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: profileApi.revokeAllSessions,
    onSuccess: () => {
      toast.success("All other sessions revoked");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: unknown) => {
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
    },
  });

  const handleRevokeSession = (sessionId: string) => {
    setRevokingId(sessionId);
    revokeSessionMutation.mutate(sessionId);
  };

  const handleRevokeAll = () => {
    if (confirm("Are you sure you want to revoke all other sessions?")) {
      revokeAllMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Loading sessions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load sessions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sessions = data?.sessions || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Manage your active login sessions</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revokeAllMutation.isPending}
            >
              Revoke All Others
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No active sessions</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {session.user_agent || "Unknown Device"}
                  </p>
                  <p className="text-xs text-gray-500">
                    IP: {session.ip_address || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(session.created_at).toLocaleString()}
                  </p>
                  {session.last_used_at && (
                    <p className="text-xs text-gray-500">
                      Last used:{" "}
                      {new Date(session.last_used_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
