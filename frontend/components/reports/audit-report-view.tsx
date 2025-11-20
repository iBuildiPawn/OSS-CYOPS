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
  FileCheck,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface AuditReportViewProps {
  data: any;
}

export function AuditReportView({ data }: AuditReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Report Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">From:</span>{" "}
              <span className="font-medium">
                {format(new Date(data.report_period_start), "MMM d, yyyy")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">To:</span>{" "}
              <span className="font-medium">
                {format(new Date(data.report_period_end), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
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
            <p className="text-xs text-muted-foreground">In reporting period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data.vulnerabilities_resolved}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.remediation_compliance.toFixed(1)}% compliance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.completed_assessments}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assets Scanned
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assets_scanned}</div>
            <p className="text-xs text-muted-foreground">Total assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Metrics</CardTitle>
          <CardDescription>
            Key compliance and remediation indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Remediation Compliance
                </span>
                <span className="text-sm">
                  {data.remediation_compliance.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.remediation_compliance} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Documented Findings
                </p>
                <p className="text-2xl font-bold">{data.documented_findings}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Verified Remediations
                </p>
                <p className="text-2xl font-bold">
                  {data.verified_remediations}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold">
                  {data.vulnerabilities_open}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Policy Violations
                </p>
                <p className="text-2xl font-bold">{data.policy_violations}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Frameworks */}
      {data.compliance_frameworks && data.compliance_frameworks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Frameworks
            </CardTitle>
            <CardDescription>
              Coverage and status of compliance frameworks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.compliance_frameworks.map((framework: any) => (
                <div key={framework.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {framework.name}
                      </span>
                      <Badge variant="outline">{framework.status}</Badge>
                    </div>
                    <span className="text-sm">
                      {framework.coverage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={framework.coverage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {data.audit_trail && data.audit_trail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>
              Recent security-related activities and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.audit_trail
                  .slice(0, 20)
                  .map((entry: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs">
                        {format(new Date(entry.timestamp), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.resource}
                      </TableCell>
                      <TableCell className="text-sm">{entry.user}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {entry.description}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
