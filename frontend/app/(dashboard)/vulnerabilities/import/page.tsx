"use client";

import { useState, useEffect, useMemo } from "react";
import { Upload, ChevronRight } from "lucide-react";
import Link from "next/link";
import { NessusUploader } from "@/components/vulnerabilities/nessus-uploader";
import { ImportResults } from "@/components/vulnerabilities/import-results";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePageHeader } from "@/contexts/page-header-context";

export default function VulnerabilityImportPage() {
  const [importResult, setImportResult] = useState<any>(null);
  const { setPageHeader } = usePageHeader();

  const handleImportComplete = (result: any) => {
    setImportResult(result);
  };

  const handleReset = () => {
    setImportResult(null);
  };

  // Memoize header elements to prevent infinite re-renders
  const headerIcon = useMemo(() => <Upload className="h-5 w-5" />, []);

  // Set page header
  useEffect(() => {
    setPageHeader(
      "Import from Nessus",
      "Upload vulnerability scan results from Tenable Nessus scanner",
      headerIcon,
      undefined,
    );
  }, [setPageHeader, headerIcon]);

  return (
    <>
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/vulnerabilities">Vulnerabilities</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/integrations">Integrations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Nessus Import</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {importResult ? (
        <ImportResults result={importResult} onReset={handleReset} />
      ) : (
        <NessusUploader onImportComplete={handleImportComplete} />
      )}
    </>
  );
}
