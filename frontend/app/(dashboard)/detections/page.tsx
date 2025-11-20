"use client";

import { Search, AlertCircle, Clock, Zap, TrendingUp } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePageHeader } from "@/contexts/page-header-context";

export default function DetectionsPage() {
  const { setPageHeader } = usePageHeader();

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Search className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Detections",
      "Advanced threat detection and security monitoring system",
      headerIcon,
    );
  }, [setPageHeader, headerIcon]);

  return (
    <div className="space-y-6 w-full">
      {/* Feature Coming Soon Banner */}
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Search className="h-16 w-16 text-primary/60" />
              <div className="absolute -top-1 -right-1">
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">Advanced Detection System</CardTitle>
          <CardDescription className="text-base max-w-2xl mx-auto">
            Our next-generation detection platform will provide real-time threat
            detection, automated security monitoring, and intelligent alert
            correlation to enhance your security posture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Development Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Development Progress</h3>
              <Badge variant="outline">In Development</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>25%</span>
              </div>
              <Progress value={25} className="h-2" />
            </div>
          </div>

          {/* Planned Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Real-time Detection */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-base">
                    Real-time Detection
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  Continuous monitoring and instant threat detection across all
                  your assets and network traffic.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q1 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Behavioral Analysis */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">
                    Behavioral Analysis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  AI-powered behavioral analytics to identify anomalous
                  activities and potential insider threats.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q2 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Automated Response */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-base">
                    Automated Response
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  Intelligent automated incident response and containment
                  actions based on threat severity.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q3 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Threat Intelligence */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">
                    Threat Intelligence
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  Integration with global threat intelligence feeds for enhanced
                  detection capabilities.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q2 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Machine Learning */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-base">
                    ML Detection Engine
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  Advanced machine learning algorithms for predictive threat
                  detection and false positive reduction.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q4 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Custom Rules Engine */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">
                    Custom Rules Engine
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  Flexible rule creation system allowing custom detection logic
                  for organization-specific threats.
                </CardDescription>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Q1 2026
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Status */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Current Development Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Completed</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Architecture design and planning</li>
                    <li>• Database schema design</li>
                    <li>• API endpoint specifications</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🔨 In Progress</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Core detection engine development</li>
                    <li>• Real-time data pipeline setup</li>
                    <li>• Frontend component development</li>
                  </ul>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Next Milestone:</strong> Alpha release of basic
                  detection capabilities scheduled for Q1 2026. This will
                  include fundamental threat detection patterns and real-time
                  monitoring infrastructure.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center space-y-4 pt-4">
            <p className="text-muted-foreground">
              Interested in early access or have specific detection
              requirements?
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline">Contact Development Team</Button>
              <Button>Request Feature</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Temporary Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Current Detection Capabilities
          </CardTitle>
          <CardDescription>
            While the advanced detection system is under development, you can
            still leverage existing security features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Available Now:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  •{" "}
                  <a
                    href="/vulnerabilities"
                    className="text-primary hover:underline"
                  >
                    Vulnerability Management
                  </a>
                </li>
                <li>
                  •{" "}
                  <a href="/assets" className="text-primary hover:underline">
                    Asset Discovery & Monitoring
                  </a>
                </li>
                <li>
                  •{" "}
                  <a
                    href="/integrations"
                    className="text-primary hover:underline"
                  >
                    Security Tool Integrations
                  </a>
                </li>
                <li>
                  •{" "}
                  <a href="/reports" className="text-primary hover:underline">
                    Security Reports & Analytics
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Enhancement Pipeline:</h4>
              <ul className="text-sm space-y-1">
                <li>• Enhanced Nessus integration</li>
                <li>• SIEM connector development</li>
                <li>• Custom alerting mechanisms</li>
                <li>• Advanced reporting dashboards</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
