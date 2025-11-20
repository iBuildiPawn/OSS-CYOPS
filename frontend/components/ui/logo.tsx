import * as React from "react";
import { CyberShieldLogo } from "@/components/ui/icons/cyber-shield-logo";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "icon-only";
}

const sizeConfig = {
  sm: { icon: 16, text: "text-sm" },
  md: { icon: 24, text: "text-base" },
  lg: { icon: 32, text: "text-lg" },
  xl: { icon: 48, text: "text-2xl" },
};

export function Logo({
  size = "md",
  showText = true,
  variant = "default",
  className,
  ...props
}: LogoProps) {
  const config = sizeConfig[size];

  if (variant === "icon-only") {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <CyberShieldLogo
          size={config.icon}
          className="text-primary"
          strokeWidth={2}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <CyberShieldLogo
        size={config.icon}
        className="text-primary"
        strokeWidth={2}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight", config.text)}>
            CYOPS
          </span>
          <span className="text-[0.65em] text-muted-foreground">
            Cyber Operations
          </span>
        </div>
      )}
    </div>
  );
}
