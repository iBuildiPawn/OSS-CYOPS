"use client";

import { Calculator, Info } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CVSS_OPTIONS,
  type CVSSMetrics,
  calculateCVSSScore,
  DEFAULT_CVSS_METRICS,
  generateCVSSVector,
  getCVSSSeverity,
  parseCVSSVector,
} from "@/lib/cvss-calculator";

interface CVSSCalculatorProps {
  initialVector?: string;
  onCalculate: (score: number, vector: string) => void;
}

export function CVSSCalculator({
  initialVector,
  onCalculate,
}: CVSSCalculatorProps) {
  const [metrics, setMetrics] = useState<CVSSMetrics>(() => {
    if (initialVector) {
      const parsed = parseCVSSVector(initialVector);
      if (parsed) return parsed;
    }
    return DEFAULT_CVSS_METRICS;
  });

  const score = calculateCVSSScore(metrics);
  const vector = generateCVSSVector(metrics);
  const severity = getCVSSSeverity(score);

  const updateMetric = <K extends keyof CVSSMetrics>(
    key: K,
    value: CVSSMetrics[K],
  ) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onCalculate(score, vector);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case "Critical":
        return "bg-red-600 text-white";
      case "High":
        return "bg-orange-600 text-white";
      case "Medium":
        return "bg-yellow-600 text-white";
      case "Low":
        return "bg-blue-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const metricSections = [
    {
      title: "Attack Vector (AV)",
      description: "How the vulnerability is exploited",
      key: "AV" as const,
    },
    {
      title: "Attack Complexity (AC)",
      description: "Conditions beyond attacker's control",
      key: "AC" as const,
    },
    {
      title: "Privileges Required (PR)",
      description: "Level of privileges needed",
      key: "PR" as const,
    },
    {
      title: "User Interaction (UI)",
      description: "Whether user must participate",
      key: "UI" as const,
    },
    {
      title: "Scope (S)",
      description: "Impact beyond vulnerable component",
      key: "S" as const,
    },
    {
      title: "Confidentiality (C)",
      description: "Impact on data confidentiality",
      key: "C" as const,
    },
    {
      title: "Integrity (I)",
      description: "Impact on data integrity",
      key: "I" as const,
    },
    {
      title: "Availability (A)",
      description: "Impact on availability",
      key: "A" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              CVSS v3.1 Calculator
            </CardTitle>
            <CardDescription>
              Calculate Common Vulnerability Scoring System score
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Score</div>
              <div className="text-3xl font-bold">{score.toFixed(1)}</div>
            </div>
            <Badge className={getSeverityColor()}>{severity}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {metricSections.map((section) => (
            <div key={section.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={section.key}>{section.title}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{section.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={metrics[section.key]}
                onValueChange={(value) =>
                  updateMetric(section.key, value as any)
                }
              >
                <SelectTrigger id={section.key}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CVSS_OPTIONS[section.key].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvss-vector">CVSS Vector String</Label>
          <Input
            id="cvss-vector"
            value={vector}
            readOnly
            className="font-mono text-sm"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleApply}>Apply CVSS Score</Button>
        </div>
      </CardContent>
    </Card>
  );
}
