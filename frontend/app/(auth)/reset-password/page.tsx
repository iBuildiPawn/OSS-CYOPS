import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { CyberShieldLogo } from "@/components/ui/icons/cyber-shield-logo";

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a
          href="/"
          className="flex flex-col items-center justify-center gap-4 text-center"
        >
          <div className="flex items-center justify-center">
            <CyberShieldLogo
              size={56}
              className="text-primary"
              strokeWidth={2}
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">
              CYOPS
            </h1>
            <p className="text-sm text-muted-foreground">
              Enterprise-Grade Security Operations Platform
            </p>
          </div>
        </a>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Create New Password</h2>
          <p className="mt-2 text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
