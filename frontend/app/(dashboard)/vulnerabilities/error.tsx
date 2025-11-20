"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function VulnerabilitiesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Vulnerabilities section error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An error occurred while loading the vulnerability management
                system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              <code className="text-xs block mt-2 p-2 bg-destructive/10 rounded">
                {error.message || "An unexpected error occurred"}
              </code>
              {error.digest && (
                <p className="text-xs mt-2 text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">What you can try:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Refresh the page to try loading again</li>
              <li>Check your network connection</li>
              <li>Clear your browser cache and cookies</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/overview">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              If this error persists, please contact your system administrator
              with the error ID above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
