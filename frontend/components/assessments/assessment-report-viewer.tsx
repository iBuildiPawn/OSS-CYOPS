"use client";

import { useState, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

// Configure PDF.js worker - use unpkg for reliable CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface AssessmentReportViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  filename: string;
  onDownload?: () => void;
}

export function AssessmentReportViewer({
  open,
  onOpenChange,
  fileUrl,
  filename,
  onDownload,
}: AssessmentReportViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get authentication token for PDF requests
  const token = getAuthToken();

  // Memoize file configuration to prevent unnecessary reloads
  const fileConfig = useMemo(() => {
    const httpHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    return { url: fileUrl, httpHeaders };
  }, [fileUrl, token]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const scrollToPage = (pageNumber: number) => {
    const pageElement = pageRefs.current[pageNumber];
    if (pageElement && containerRef.current) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();

      const scrollTop =
        container.scrollTop + (pageRect.top - containerRect.top) - 32; // 32px offset for spacing

      container.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });

      setCurrentPage(pageNumber);
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0",
          isFullScreen
            ? "!fixed !inset-0 !w-screen !h-screen !max-w-none !transform-none !translate-x-0 !translate-y-0 !m-0 rounded-none border-0"
            : "max-w-7xl transition-all duration-300",
        )}
        showCloseButton={false}
        overlayClassName={
          isFullScreen ? "bg-black/80 backdrop-blur-sm" : undefined
        }
      >
        <DialogHeader className="px-6 py-5 border-b bg-background z-10">
          <div className="flex items-center justify-between gap-6">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold truncate flex-1">
              {filename}
            </DialogTitle>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Page count display */}
              {numPages && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                  <span className="text-sm font-medium">
                    {numPages} {numPages === 1 ? "page" : "pages"}
                  </span>
                </div>
              )}

              {/* Zoom controls */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  className="h-8 w-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3.5rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  className="h-8 w-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullScreen}
                  className="h-9 w-9"
                  title="Toggle fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>

                {onDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDownload}
                    className="h-9 w-9"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex">
          {/* Page navigation sidebar */}
          {numPages && numPages > 1 && (
            <div className="w-20 border-r bg-muted/20 overflow-y-auto">
              <div
                className={`${isFullScreen ? "h-[calc(100vh-5rem)]" : "h-[75vh]"} py-4`}
              >
                <div className="flex flex-col gap-1 px-2">
                  {Array.from(new Array(numPages), (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={`nav_page_${pageNum}`}
                        onClick={() => scrollToPage(pageNum)}
                        className={cn(
                          "flex items-center justify-center h-10 rounded-md text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          currentPage === pageNum
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground",
                        )}
                        title={`Go to page ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PDF viewer area */}
          <div
            ref={containerRef}
            className={`overflow-auto ${isFullScreen ? "h-[calc(100vh-5rem)]" : "h-[75vh]"} flex flex-col items-center p-8 bg-slate-100 dark:bg-slate-900 flex-1`}
          >
            <Document
              file={fileConfig}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="text-muted-foreground text-base">
                    Loading PDF...
                  </div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-96">
                  <div className="text-destructive text-base">
                    Failed to load PDF
                  </div>
                </div>
              }
            >
              {Array.from(new Array(numPages), (_, index) => {
                const pageNum = index + 1;
                return (
                  <div
                    key={`page_${pageNum}`}
                    ref={(el) => {
                      pageRefs.current[pageNum] = el;
                    }}
                    className="mb-4"
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-xl rounded-sm"
                    />
                  </div>
                );
              })}
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
