"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChart,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageHeader } from "@/contexts/page-header-context";
import { vulnerabilityFindingApi, assessmentApi } from "@/lib/api";
import { FindingCard } from "@/components/reports/finding-card";
import type { VulnerabilityFinding } from "@/types/vulnerability";

type FilterType = "date" | "assessment" | "source";

export default function ReportsPage() {
  const [filterType, setFilterType] = useState<FilterType>("date");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [shouldFetchReport, setShouldFetchReport] = useState(false);

  const { setPageHeader } = usePageHeader();

  // Fetch findings based on selected filter
  const {
    data: findingsData,
    isLoading: findingsLoading,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: [
      "report-findings",
      filterType,
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
      selectedAssessment,
      selectedSource,
    ],
    queryFn: async () => {
      // Build query params based on filter type
      const params: any = {
        limit: 1000, // Get all findings for the report
      };

      if (filterType === "source" && selectedSource) {
        params.scanner_name = selectedSource;
      }

      const response = await vulnerabilityFindingApi.list(params);
      return response;
    },
    enabled: shouldFetchReport, // Only fetch when explicitly requested
  });

  // Fetch assessments list for dropdown
  const { data: assessmentsData } = useQuery({
    queryKey: ["assessments-list"],
    queryFn: async () => {
      const response = await assessmentApi.list({ limit: 100 });
      return response;
    },
  });

  // Fetch available sources
  const { data: sourcesData } = useQuery({
    queryKey: ["finding-sources"],
    queryFn: async () => {
      // This will get unique scanner names from findings
      const response = await vulnerabilityFindingApi.list({ limit: 1 });
      // In production, you'd want a dedicated endpoint for this
      return ["Nessus", "Qualys", "OpenVAS", "Manual"];
    },
  });

  // Filter findings based on date range if applicable
  const filteredFindings = useMemo(() => {
    if (!findingsData?.data) return [];

    let findings = findingsData.data;

    // Apply date filter
    if (filterType === "date") {
      findings = findings.filter((finding) => {
        const findingDate = new Date(finding.first_detected);
        return findingDate >= dateRange.from && findingDate <= dateRange.to;
      });
    }

    // Apply assessment filter
    if (filterType === "assessment" && selectedAssessment) {
      // Filter findings by assessment's vulnerabilities
      // This would need to be implemented in the backend
      // For now, return all findings
    }

    return findings;
  }, [findingsData, filterType, dateRange.from, dateRange.to, selectedAssessment]);

  // Group findings by vulnerability
  const groupedFindings = useMemo(() => {
    const groups: Record<string, VulnerabilityFinding[]> = {};

    filteredFindings.forEach((finding) => {
      const vulnId = finding.vulnerability_id;
      if (!groups[vulnId]) {
        groups[vulnId] = [];
      }
      groups[vulnId].push(finding);
    });

    return groups;
  }, [filteredFindings]);

  const handleExport = () => {
    // TODO: Implement export functionality
  };

  const handleGenerateReport = () => {
    // Validate required filters are selected
    if (filterType === "assessment" && !selectedAssessment) {
      alert("Please select an assessment");
      return;
    }
    if (filterType === "source" && !selectedSource) {
      alert("Please select a source");
      return;
    }

    // Enable fetching and trigger the query
    setShouldFetchReport(true);
    if (shouldFetchReport) {
      refetchFindings();
    }
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <FileBarChart className="h-5 w-5" />, []);

  // Set page header - only run once on mount
  useEffect(() => {
    setPageHeader(
      "Enhanced Reports",
      "View detailed findings with remediation evidence and proof images",
      headerIcon,
      undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 w-full">
      {/* Filter Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Select how you want to filter the findings report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Type Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Filter By:</label>
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as FilterType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Range</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="source">Source</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          {filterType === "date" && (
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(dateRange.from, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) =>
                        date && setDateRange({ ...dateRange, from: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(dateRange.to, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) =>
                        date && setDateRange({ ...dateRange, to: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Assessment Filter */}
          {filterType === "assessment" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Assessment:</label>
              <Select
                value={selectedAssessment}
                onValueChange={setSelectedAssessment}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentsData?.data.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {assessment.name} - {assessment.assessment_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source Filter */}
          {filterType === "source" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Source:</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sourcesData?.map((source) => (
                    <SelectItem key={source} value={source.toLowerCase()}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleGenerateReport}>
              <FileBarChart className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!shouldFetchReport || !findingsData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Findings List */}
      <Card>
        <CardHeader>
          <CardTitle>Findings Report</CardTitle>
          <CardDescription>
            {shouldFetchReport ? (
              <>
                {filteredFindings.length} finding(s) found
                {filterType === "date" &&
                  ` from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}`}
                {filterType === "assessment" &&
                  selectedAssessment &&
                  ` for selected assessment`}
                {filterType === "source" &&
                  selectedSource &&
                  ` from ${selectedSource}`}
              </>
            ) : (
              "Select your filters and click 'Generate Report' to view findings"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!shouldFetchReport ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Report Generated
              </h3>
              <p className="text-muted-foreground text-center">
                Configure your filters above and click "Generate Report" to view
                findings
              </p>
            </div>
          ) : findingsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(groupedFindings).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No findings available
              </h3>
              <p className="text-muted-foreground text-center">
                No findings match your selected filters. Try adjusting your
                criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedFindings).map(([vulnId, findings]) => (
                <FindingCard
                  key={vulnId}
                  findings={findings}
                  vulnerabilityId={vulnId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
