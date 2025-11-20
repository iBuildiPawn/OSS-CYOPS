"use client";

import { Archive, CheckCircle, Wrench, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetStatus } from "@/types/asset";

interface AssetStatusBadgeProps {
  status: AssetStatus;
  className?: string;
  showIcon?: boolean;
}

export function AssetStatusBadge({
  status,
  className,
  showIcon = false,
}: AssetStatusBadgeProps) {
  const statusConfig = {
    ACTIVE: {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700 text-white border-green-700",
      label: "Active",
      icon: CheckCircle,
    },
    INACTIVE: {
      variant: "secondary" as const,
      className: "bg-gray-500 hover:bg-gray-600 text-white border-gray-600",
      label: "Inactive",
      icon: XCircle,
    },
    DECOMMISSIONED: {
      variant: "outline" as const,
      className: "bg-black hover:bg-gray-900 text-white border-black",
      label: "Decommissioned",
      icon: Archive,
    },
    UNDER_MAINTENANCE: {
      variant: "default" as const,
      className:
        "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-700",
      label: "Under Maintenance",
      icon: Wrench,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, "gap-1", className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
