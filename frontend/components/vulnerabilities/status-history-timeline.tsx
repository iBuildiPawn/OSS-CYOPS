"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ArrowRight, Clock, FileText, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatusHistoryEntry } from "@/types/vulnerability";
import { VulnerabilityStatusBadge } from "./vulnerability-status-badge";

interface StatusHistoryTimelineProps {
  history?: StatusHistoryEntry[];
  isLoading?: boolean;
  className?: string;
}

export function StatusHistoryTimeline({
  history = [],
  isLoading = false,
  className,
}: StatusHistoryTimelineProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
          <CardDescription>No status changes recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Status History</CardTitle>
        <CardDescription>
          {history.length} status {history.length === 1 ? "change" : "changes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {/* Timeline items */}
          <div className="space-y-8">
            {history.map((item, index) => (
              <div key={item.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2 pb-4">
                  {/* Status change */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <VulnerabilityStatusBadge status={item.old_status} />
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <VulnerabilityStatusBadge status={item.new_status} />
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.changed_by && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {item.changed_by.name || item.changed_by.email}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span title={format(new Date(item.changed_at), "PPpp")}>
                        {formatDistanceToNow(new Date(item.changed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="mt-2 rounded-md border bg-muted/50 p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{item.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
interface StatusHistoryCompactProps {
  history?: StatusHistoryEntry[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

export function StatusHistoryCompact({
  history = [],
  isLoading = false,
  maxItems = 5,
  className,
}: StatusHistoryCompactProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-sm text-muted-foreground">No status changes</p>
      </div>
    );
  }

  const displayHistory = history.slice(0, maxItems);
  const remaining = history.length - maxItems;

  return (
    <div className={cn("space-y-2", className)}>
      {displayHistory.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <VulnerabilityStatusBadge
                status={item.old_status}
                className="text-xs"
              />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <VulnerabilityStatusBadge
                status={item.new_status}
                className="text-xs"
              />
            </div>
            {item.changed_by && (
              <span className="text-muted-foreground truncate">
                by {item.changed_by.name || item.changed_by.email}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(item.changed_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      ))}

      {remaining > 0 && (
        <div className="text-center py-2">
          <Badge variant="outline" className="text-xs">
            +{remaining} more {remaining === 1 ? "change" : "changes"}
          </Badge>
        </div>
      )}
    </div>
  );
}
