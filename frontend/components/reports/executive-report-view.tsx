import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ExecutiveReportViewProps {
  data: any;
}

export function ExecutiveReportView({ data }: ExecutiveReportViewProps) {
  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-500";
    if (score < 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getPostureColor = (posture: string) => {
    const colors: Record<string, string> = {
      Strong: "bg-green-500/10 text-green-500",
      Moderate: "bg-yellow-500/10 text-yellow-500",
      "Needs Improvement": "bg-red-500/10 text-red-500",
    };
    return colors[posture] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getRiskColor(data.risk_score)}`}
            >
              {data.risk_score.toFixed(1)}/100
            </div>
            <p className="text-xs text-muted-foreground">
              Security posture: {data.security_posture}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {data.critical_vulnerabilities}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.high_vulnerabilities} high severity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remediation Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.remediation_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Vulnerabilities resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.cost_impact_estimate / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated potential cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Posture */}
      <Card>
        <CardHeader>
          <CardTitle>Security Posture Overview</CardTitle>
          <CardDescription>
            Current organizational security status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Posture</span>
                <Badge className={getPostureColor(data.security_posture)}>
                  {data.security_posture}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance Score</span>
                <span className="text-sm">
                  {data.compliance_score.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.compliance_score} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Remediation Progress
                </span>
                <span className="text-sm">
                  {data.remediation_rate.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.remediation_rate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Risks */}
      {data.key_risks && data.key_risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Key Risks
            </CardTitle>
            <CardDescription>
              High-priority security concerns requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.key_risks.map((risk: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {data.recommended_actions && data.recommended_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Strategic recommendations to improve security posture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommended_actions.map((action: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {data.monthly_trend && data.monthly_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
            <CardDescription>
              Security metrics trends over the past months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.monthly_trend.map((month: any, index: number) => (
                <div key={`${month.month}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{month.month}</span>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Vulns: {month.vulnerabilities}</span>
                      <span>Resolved: {month.resolved}</span>
                      <span className={getRiskColor(month.risk_score)}>
                        Risk: {month.risk_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <Progress value={month.risk_score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
