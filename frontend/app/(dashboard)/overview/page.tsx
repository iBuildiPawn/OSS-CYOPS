"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Database,
  Plus,
  Puzzle,
  Shield,
  ShieldAlert,
  Server,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  profileApi,
  vulnerabilityApi,
  assetApi,
  integrationConfigApi,
  vulnerabilityFindingApi,
} from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { FindingDetailView } from "@/components/findings/finding-detail-view";
import type { VulnerabilityFinding } from "@/types/vulnerability";
import { usePageHeader } from "@/contexts/page-header-context";

export default function DashboardPage() {
  const [selectedFinding, setSelectedFinding] =
    useState<VulnerabilityFinding | null>(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const { setPageHeader } = usePageHeader();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.getProfile,
  });

  const { data: vulnStatsData, isLoading: vulnStatsLoading } = useQuery({
    queryKey: ["vulnerability-stats"],
    queryFn: () => vulnerabilityApi.getStats(),
    refetchInterval: 60000, // Poll every 60 seconds
  });

  const { data: assetStatsData, isLoading: assetStatsLoading } = useQuery({
    queryKey: ["asset-stats"],
    queryFn: () => assetApi.getStats(),
    refetchInterval: 60000, // Poll every 60 seconds
  });

  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: () => integrationConfigApi.list(),
  });

  const { data: recentVulnsData, isLoading: recentVulnsLoading } = useQuery({
    queryKey: ["recent-vulnerabilities"],
    queryFn: () =>
      vulnerabilityApi.list({
        page: 1,
        limit: 5,
        status: "OPEN",
        severity: "CRITICAL,HIGH",
      }),
    refetchInterval: 60000, // Poll every 60 seconds
  });

  const { data: recentFixedFindings, isLoading: recentFixedLoading } = useQuery(
    {
      queryKey: ["recent-fixed-findings"],
      queryFn: () =>
        vulnerabilityFindingApi.list({ page: 1, limit: 10, status: "FIXED" }),
      refetchInterval: 60000, // Poll every 60 seconds
    },
  );

  const user = profileData?.user;
  const vulnStats = vulnStatsData?.data;
  const assetStats = assetStatsData?.data;
  const integrations = integrationsData?.data || [];
  const activeIntegrations = integrations.filter((i: any) => i.active).length;

  // Memoize header elements to prevent infinite re-renders (MUST be before any returns)
  const headerIcon = useMemo(() => <Shield className="h-5 w-5" />, []);

  // Set page header with user's name (MUST be before any returns)
  useEffect(() => {
    setPageHeader(
      "Security Operations Dashboard",
      user?.name
        ? `Welcome back, ${user.name}! Here's your security posture overview`
        : "Monitor your security posture overview",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon, user?.name]);

  const isLoading =
    profileLoading ||
    vulnStatsLoading ||
    assetStatsLoading ||
    integrationsLoading ||
    recentVulnsLoading ||
    recentFixedLoading;

  if (isLoading) {
    return (
      <>
        <div className="space-y-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-[500px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-80" />
          <Skeleton className="col-span-3 h-80" />
        </div>
      </>
    );
  }

  const totalVulnerabilities = vulnStats?.total_count || 0;
  const criticalCount = vulnStats?.by_severity?.critical || 0;
  const highCount = vulnStats?.by_severity?.high || 0;
  const openCount = vulnStats?.by_status?.open || 0;
  const resolvedCount = vulnStats?.by_status?.resolved || 0;
  const totalAssets = assetStats?.total_assets || 0;
  const activeAssets = assetStats?.by_status?.active || 0;

  const riskScore =
    totalVulnerabilities > 0
      ? Math.min(
          100,
          Math.round(
            ((criticalCount * 10 + highCount * 5) / totalVulnerabilities) * 100,
          ),
        )
      : 0;

  const resolutionRate =
    totalVulnerabilities > 0
      ? Math.round((resolvedCount / totalVulnerabilities) * 100)
      : 0;

  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vulnerabilities
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVulnerabilities}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
              <Badge variant="destructive" className="text-xs bg-orange-500">
                {highCount} High
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {openCount} open, {resolvedCount} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                riskScore >= 70
                  ? "text-red-500"
                  : riskScore >= 40
                    ? "text-orange-500"
                    : "text-green-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskScore}/100</div>
            <Progress value={riskScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on severity distribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Asset Coverage
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {activeAssets} active
            </p>
            <Button variant="link" className="h-auto p-0 mt-2" asChild>
              <Link href="/assets" className="text-xs flex items-center">
                View all assets <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeIntegrations}/{integrations.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Active scanners
            </p>
            <Button variant="link" className="h-auto p-0 mt-2" asChild>
              <Link href="/integrations" className="text-xs flex items-center">
                Manage <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Critical Vulnerabilities */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Critical & High Priority Findings</CardTitle>
                <CardDescription>
                  Open vulnerabilities requiring immediate attention
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/vulnerabilities">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVulnsData?.data && recentVulnsData.data.length > 0 ? (
                recentVulnsData.data.map((vuln: any) => (
                  <Link
                    key={vuln.id}
                    href={`/vulnerabilities/${vuln.id}`}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            vuln.severity === "CRITICAL" || vuln.severity === "HIGH"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            vuln.severity === "HIGH" 
                              ? "bg-orange-500 hover:bg-orange-600" 
                              : vuln.severity === "MEDIUM"
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : vuln.severity === "LOW"
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : ""
                          }
                        >
                          {vuln.severity}
                        </Badge>
                        <span className="font-medium text-sm">
                          {vuln.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {vuln.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {vuln.cve_id && (
                          <Badge variant="secondary" className="text-xs">
                            {vuln.cve_id}
                          </Badge>
                        )}
                        {vuln.cvss_score && (
                          <span className="text-xs text-muted-foreground">
                            CVSS: {vuln.cvss_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-sm font-medium">
                    No critical issues found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your security posture looks good!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Overview & Quick Actions */}
        <div className="col-span-3 space-y-4">
          {/* Resolution Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall</span>
                    <span className="text-sm text-muted-foreground">
                      {resolutionRate}%
                    </span>
                  </div>
                  <Progress value={resolutionRate} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                      <p className="text-lg font-bold">{resolvedCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Open</p>
                      <p className="text-lg font-bold">{openCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scanner Status</CardTitle>
            </CardHeader>
            <CardContent>
              {integrations.length > 0 ? (
                <div className="space-y-3">
                  {integrations.slice(0, 3).map((integration: any) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Activity
                          className={`h-4 w-4 ${
                            integration.active
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {integration.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {integration.type}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={integration.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {integration.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                  {integrations.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href="/integrations">
                        View all {integrations.length} integrations
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No integrations configured
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/integrations">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/vulnerabilities">
                    <Shield className="h-4 w-4 mr-2" />
                    View All Vulnerabilities
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/assets">
                    <Server className="h-4 w-4 mr-2" />
                    Manage Assets
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/integrations">
                    <Puzzle className="h-4 w-4 mr-2" />
                    Configure Scanners
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recently Fixed Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recently Fixed Findings</CardTitle>
              <CardDescription>
                Latest vulnerabilities that have been remediated
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/vulnerabilities/findings?status=FIXED">
                View All <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentFixedFindings?.data && recentFixedFindings.data.length > 0 ? (
            <div className="space-y-2">
              {recentFixedFindings.data.map((finding: any) => (
                <button
                  key={finding.id}
                  onClick={() => {
                    setSelectedFinding(finding);
                    setDetailViewOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {finding.affected_system?.hostname ||
                            finding.affected_system?.ip_address ||
                            "Unknown Host"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {finding.port}/{finding.protocol}
                        </Badge>
                        {finding.service_name && (
                          <span className="text-xs text-muted-foreground">
                            {finding.service_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {finding.vulnerability?.title || "Vulnerability"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Fixed</p>
                      <p className="text-xs font-medium">
                        {finding.fixed_at
                          ? new Date(finding.fixed_at).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                    {finding.attachments_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {finding.attachments_count} proof
                        {finding.attachments_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No recent fixes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fixed findings will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finding Detail View Modal */}
      {selectedFinding && (
        <FindingDetailView
          finding={selectedFinding}
          isOpen={detailViewOpen}
          onClose={() => {
            setDetailViewOpen(false);
            setSelectedFinding(null);
          }}
          canUpload={false}
        />
      )}
    </>
  );
}
