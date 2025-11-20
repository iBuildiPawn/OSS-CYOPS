"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi, handleApiError } from "@/lib/api";

export function VerifyEmailComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [message, setMessage] = useState<string>("");

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      setVerificationStatus("success");
      setMessage(data.message || "Email verified successfully!");
    },
    onError: (error) => {
      setVerificationStatus("error");
      setMessage(handleApiError(error));
    },
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setVerificationStatus("error");
      setMessage("No verification token provided");
    }
  }, [searchParams]);

  if (verificationStatus === "pending") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifying Email</CardTitle>
          <CardDescription>
            Please wait while we verify your email address...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verificationStatus === "error") {
    return (
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Verification Failed</CardTitle>
          <CardDescription className="text-red-500">{message}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/signup")}
          >
            Go to Sign Up
          </Button>
          <Link
            href="/signin"
            className="text-sm text-blue-600 hover:underline text-center w-full"
          >
            Already verified? Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-green-200">
      <CardHeader>
        <CardTitle className="text-green-600">Email Verified!</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push("/signin")}>
          Continue to Sign In
        </Button>
      </CardFooter>
    </Card>
  );
}
