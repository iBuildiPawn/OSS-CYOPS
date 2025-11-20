"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetCriticality } from "@/types/asset";

interface AssetCriticalityBadgeProps {
  criticality?: AssetCriticality;
  className?: string;
}

export function AssetCriticalityBadge({
  criticality,
  className,
}: AssetCriticalityBadgeProps) {
  if (!criticality) {
    return (
      <Badge
        variant="outline"
        className={cn("border-gray-300 text-gray-600", className)}
      >
        Not Set
      </Badge>
    );
  }

  const criticalityConfig = {
    CRITICAL: {
      variant: "destructive" as const,
      className: "bg-red-600 hover:bg-red-700 text-white border-red-700",
      label: "Critical",
    },
    HIGH: {
      variant: "default" as const,
      className:
        "bg-orange-500 hover:bg-orange-600 text-white border-orange-600",
      label: "High",
    },
    MEDIUM: {
      variant: "default" as const,
      className:
        "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600",
      label: "Medium",
    },
    LOW: {
      variant: "default" as const,
      className: "bg-blue-500 hover:bg-blue-600 text-white border-blue-600",
      label: "Low",
    },
  };

  const config = criticalityConfig[criticality];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
