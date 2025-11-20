"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Server,
  Clock,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { vulnerabilityApi } from "@/lib/api";
import { FindingDetailsSection } from "./finding-details-section";
import type { VulnerabilityFinding } from "@/types/vulnerability";

interface FindingCardProps {
  findings: VulnerabilityFinding[];
  vulnerabilityId: string;
}

export function FindingCard({ findings, vulnerabilityId }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch vulnerability details
  const { data: vulnerabilityData, isLoading: vulnLoading } = useQuery({
    queryKey: ["vulnerability", vulnerabilityId],
    queryFn: async () => {
      const response = await vulnerabilityApi.get(vulnerabilityId);
      return response.data;
    },
    enabled: isExpanded, // Only fetch when expanded
  });

  const vulnerability = vulnerabilityData;
  const firstFinding = findings[0];

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
      HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      LOW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      NONE: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return (
      colors[severity] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-red-500/10 text-red-500 border-red-500/20",
      MITIGATED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      FIXED: "bg-green-500/10 text-green-500 border-green-500/20",
      VERIFIED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      ACCEPTED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertTriangle className="h-4 w-4" />;
      case "MITIGATED":
      case "FIXED":
        return <CheckCircle className="h-4 w-4" />;
      case "VERIFIED":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Count findings by status
  const statusCounts = findings.reduce(
    (acc, finding) => {
      acc[finding.status] = (acc[finding.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </Button>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">
                  {vulnerability?.title || "Loading..."}
                </CardTitle>
                {vulnerability?.severity && (
                  <Badge
                    variant="outline"
                    className={getSeverityColor(vulnerability.severity)}
                  >
                    {vulnerability.severity}
                  </Badge>
                )}
                {vulnerability?.cve_id && (
                  <Badge variant="outline" className="font-mono">
                    {vulnerability.cve_id}
                  </Badge>
                )}
              </div>

              <CardDescription className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  {findings.length} affected system(s)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  First detected:{" "}
                  {format(new Date(firstFinding.first_detected), "PPP")}
                </span>
              </CardDescription>

              {/* Status Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <Badge
                    key={status}
                    variant="outline"
                    className={`${getStatusColor(status)} flex items-center gap-1`}
                  >
                    {getStatusIcon(status)}
                    <span className="capitalize">{status.toLowerCase()}</span>:{" "}
                    {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {vulnLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : vulnerability ? (
            <div className="space-y-6">
              {/* Vulnerability Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h4>
                <p className="text-sm text-muted-foreground">
                  {vulnerability.description}
                </p>
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Findings on Affected Systems
                </h4>
                <div className="space-y-3">
                  {findings.map((finding) => (
                    <FindingDetailsSection
                      key={finding.id}
                      finding={finding}
                      vulnerability={vulnerability}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load vulnerability details
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
