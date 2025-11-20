import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Shield,
  Server,
  TrendingUp,
  Users,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface AnalystReportViewProps {
  data: any;
}

export function AnalystReportView({ data }: AnalystReportViewProps) {
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "bg-red-500/10 text-red-500",
      HIGH: "bg-orange-500/10 text-orange-500",
      MEDIUM: "bg-yellow-500/10 text-yellow-500",
      LOW: "bg-blue-500/10 text-blue-500",
      NONE: "bg-gray-500/10 text-gray-500",
    };
    return colors[severity] || "bg-gray-500/10 text-gray-500";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-red-500/10 text-red-500",
      IN_PROGRESS: "bg-yellow-500/10 text-yellow-500",
      RESOLVED: "bg-green-500/10 text-green-500",
      VERIFIED: "bg-blue-500/10 text-blue-500",
      CLOSED: "bg-gray-500/10 text-gray-500",
      FALSE_POSITIVE: "bg-purple-500/10 text-purple-500",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vulnerabilities
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.total_vulnerabilities}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.open_vulnerabilities} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.resolved_vulnerabilities}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.total_vulnerabilities > 0
                ? (
                    (data.resolved_vulnerabilities /
                      data.total_vulnerabilities) *
                    100
                  ).toFixed(1)
                : 0}
              % resolution rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_assets}</div>
            <p className="text-xs text-muted-foreground">Managed assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Findings
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.findings_overview.total_findings}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.findings_overview.open_findings} open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities by Severity */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerabilities by Severity</CardTitle>
          <CardDescription>
            Distribution of vulnerabilities across severity levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.vulnerabilities_by_severity).map(
              ([severity, count]: [string, any]) => (
                <div key={severity} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(severity)}>
                        {severity}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <Progress
                    value={
                      data.total_vulnerabilities > 0
                        ? (count / data.total_vulnerabilities) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vulnerabilities by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerabilities by Status</CardTitle>
          <CardDescription>
            Current status distribution of all vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.vulnerabilities_by_status).map(
              ([status, count]: [string, any]) => (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(status)}>
                        {status.replace("_", " ")}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <Progress
                    value={
                      data.total_vulnerabilities > 0
                        ? (count / data.total_vulnerabilities) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assets by Criticality */}
      {Object.keys(data.assets_by_criticality).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assets by Criticality</CardTitle>
            <CardDescription>
              Distribution of assets by criticality level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.assets_by_criticality).map(
                ([criticality, count]: [string, any]) => (
                  <div key={criticality} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{criticality}</span>
                      <span className="text-sm">{count}</span>
                    </div>
                    <Progress
                      value={
                        data.total_assets > 0
                          ? (count / data.total_assets) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top CVEs */}
      {data.top_cves && data.top_cves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top CVEs</CardTitle>
            <CardDescription>
              Most impactful CVEs affecting multiple systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CVE ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>CVSS Score</TableHead>
                  <TableHead className="text-right">Affected Systems</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_cves.map((cve: any) => (
                  <TableRow key={cve.cve_id}>
                    <TableCell className="font-mono text-sm">
                      {cve.cve_id}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {cve.title}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(cve.severity)}>
                        {cve.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{cve.cvss_score.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {cve.affected_systems}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Vulnerabilities */}
      {data.recent_vulnerabilities &&
        data.recent_vulnerabilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Vulnerabilities</CardTitle>
              <CardDescription>
                Latest vulnerabilities discovered in the reporting period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discovery Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_vulnerabilities.map((vuln: any) => (
                    <TableRow key={vuln.id}>
                      <TableCell className="max-w-xs truncate">
                        {vuln.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(vuln.severity)}>
                          {vuln.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vuln.status)}>
                          {vuln.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(vuln.discovery_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{vuln.assigned_to}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Assigned Vulnerabilities */}
      {data.assigned_vulnerabilities &&
        data.assigned_vulnerabilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Vulnerabilities
              </CardTitle>
              <CardDescription>
                Vulnerability workload by assignee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">In Progress</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assigned_vulnerabilities.map((assignee: any) => (
                    <TableRow key={assignee.assignee_name}>
                      <TableCell className="font-medium">
                        {assignee.assignee_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {assignee.total}
                      </TableCell>
                      <TableCell className="text-right">
                        {assignee.open}
                      </TableCell>
                      <TableCell className="text-right">
                        {assignee.in_progress}
                      </TableCell>
                      <TableCell className="text-right">
                        {assignee.resolved}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Trend Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
          <CardDescription>
            Vulnerability trends over different time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Last 30 Days</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New:</span>
                  <span className="font-medium">
                    {data.trend_data.last_30_days.new_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="font-medium">
                    {data.trend_data.last_30_days.resolved_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Findings:</span>
                  <span className="font-medium">
                    {data.trend_data.last_30_days.new_findings}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Last 60 Days</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New:</span>
                  <span className="font-medium">
                    {data.trend_data.last_60_days.new_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="font-medium">
                    {data.trend_data.last_60_days.resolved_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Findings:</span>
                  <span className="font-medium">
                    {data.trend_data.last_60_days.new_findings}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Last 90 Days</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New:</span>
                  <span className="font-medium">
                    {data.trend_data.last_90_days.new_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="font-medium">
                    {data.trend_data.last_90_days.resolved_vulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Findings:</span>
                  <span className="font-medium">
                    {data.trend_data.last_90_days.new_findings}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
