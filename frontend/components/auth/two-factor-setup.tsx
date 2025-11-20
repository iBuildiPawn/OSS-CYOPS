"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { twoFactorApi } from "@/lib/api";
import type { Enable2FAResponse } from "@/types/api";

export function TwoFactorSetup() {
  const [step, setStep] = useState<"enable" | "verify">("enable");
  const [setupData, setSetupData] = useState<Enable2FAResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedBackup, setCopiedBackup] = useState(false);
  const queryClient = useQueryClient();

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: () => twoFactorApi.enable("Auth App"),
    onSuccess: (data) => {
      setSetupData(data);
      setStep("verify");
      toast.success("2FA setup initiated", {
        description: "Scan the QR code with your authenticator app",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to enable 2FA", {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  // Verify 2FA mutation
  const verifyMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.verify({ code }),
    onSuccess: () => {
      toast.success("2FA enabled successfully!", {
        description:
          "Your account is now protected with two-factor authentication",
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Reset state
      setStep("enable");
      setSetupData(null);
      setVerificationCode("");
    },
    onError: (error: any) => {
      toast.error("Verification failed", {
        description: error.response?.data?.error || "Invalid verification code",
      });
    },
  });

  const handleEnable = () => {
    enableMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      verifyMutation.mutate(verificationCode);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backup_codes) {
      navigator.clipboard.writeText(setupData.backup_codes.join("\n"));
      setCopiedBackup(true);
      toast.success("Backup codes copied", {
        description: "Store these codes in a safe place",
      });
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  if (step === "enable") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Two-factor authentication (2FA) requires you to enter a code from
            your authenticator app when signing in. This provides an additional
            layer of security beyond your password.
          </p>
          <Alert>
            <AlertDescription>
              You'll need an authenticator app like Google Authenticator, Authy,
              or 1Password to complete the setup.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleEnable}
            disabled={enableMutation.isPending}
            className="w-full"
          >
            {enableMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enable Two-Factor Authentication
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete 2FA Setup</CardTitle>
        <CardDescription>
          Scan the QR code and enter the verification code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="border rounded-lg p-4 bg-white">
            {setupData?.qr_code && (
              <img
                src={setupData.qr_code}
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code with your authenticator app
          </p>
        </div>

        {/* Manual Entry */}
        {setupData?.secret && (
          <div className="space-y-2">
            <Label htmlFor="secret">Or enter this code manually:</Label>
            <div className="flex gap-2">
              <Input
                id="secret"
                value={setupData.secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret);
                  toast.success("Secret copied to clipboard");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Backup Codes */}
        {setupData?.backup_codes && setupData.backup_codes.length > 0 && (
          <div className="space-y-2">
            <Label>Backup Codes</Label>
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium">
                  Save these backup codes in a safe place!
                </p>
                <p className="text-sm">
                  You can use these codes to access your account if you lose
                  access to your authenticator app. Each code can only be used
                  once.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-3 rounded-md">
                  {setupData.backup_codes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                  className="w-full mt-2"
                >
                  {copiedBackup ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedBackup ? "Copied!" : "Copy Backup Codes"}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              maxLength={6}
              className="font-mono text-lg tracking-widest text-center"
              autoComplete="off"
            />
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("enable");
                setSetupData(null);
                setVerificationCode("");
              }}
              disabled={verifyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                verificationCode.length !== 6 || verifyMutation.isPending
              }
              className="flex-1"
            >
              {verifyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify and Enable
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
