"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FINDING_STATUS_CONFIG,
  type VulnerabilityFinding,
  type FindingStatus,
} from "@/types/vulnerability";
import { Server } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface AssetFindingsListProps {
  findings: VulnerabilityFinding[];
  assetId: string;
}

export function AssetFindingsList({
  findings,
  assetId,
}: AssetFindingsListProps) {
  const getStatusBadge = (status: FindingStatus) => {
    const config = FINDING_STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
      <Badge
        variant={
          config.color === "green"
            ? "default"
            : config.color === "red"
              ? "destructive"
              : "secondary"
        }
        className="flex items-center gap-1"
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Vulnerability Findings
          </CardTitle>
          <CardDescription>
            Individual vulnerability instances on this asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No vulnerability findings for this asset</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group findings by status
  const findingsByStatus = findings.reduce(
    (acc, finding) => {
      acc[finding.status] = (acc[finding.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Vulnerability Findings ({findings.length})
        </CardTitle>
        <CardDescription>
          Individual vulnerability instances on this asset
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(findingsByStatus).map(([status, count]) => (
            <Badge key={status} variant="outline">
              {FINDING_STATUS_CONFIG[status as FindingStatus]?.label || status}:{" "}
              {count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vulnerability</TableHead>
              <TableHead>Port/Protocol</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((finding) => (
              <TableRow key={finding.id}>
                <TableCell>
                  <Link
                    href={`/vulnerabilities/${finding.vulnerability_id}`}
                    className="hover:underline"
                  >
                    <div className="font-medium">
                      {finding.vulnerability?.title || "Unknown"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {finding.vulnerability?.severity}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <code className="text-sm">
                    {finding.port}/{finding.protocol}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{finding.service_name}</span>
                </TableCell>
                <TableCell>{getStatusBadge(finding.status)}</TableCell>
                <TableCell className="text-sm">
                  {formatDate(finding.last_seen)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
