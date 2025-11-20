"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, Link as LinkIcon, Settings, Loader2 } from "lucide-react";

interface IntegrationCardProps {
  id: string;
  name: string;
  vendor: string;
  description: string;
  logo?: string;
  logoIcon?: React.ReactNode;
  enabled: boolean;
  configured: boolean;
  configCount?: number;
  supportsUpload?: boolean;
  supportsApi?: boolean;
  onToggle?: (enabled: boolean) => void;
  onUpload?: () => void;
  onConnect?: () => void;
  onConfigure?: () => void;
  isToggling?: boolean;
  features?: string[];
}

export function IntegrationCard({
  id,
  name,
  vendor,
  description,
  logo,
  logoIcon,
  enabled,
  configured,
  configCount = 0,
  supportsUpload = true,
  supportsApi = true,
  onToggle,
  onUpload,
  onConnect,
  onConfigure,
  isToggling = false,
  features = [],
}: IntegrationCardProps) {
  return (
    <Card
      className={`relative transition-all ${enabled ? "border-primary" : "border-muted"}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Logo/Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {logo ? (
                <img
                  src={logo}
                  alt={`${vendor} logo`}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                logoIcon || <div className="w-8 h-8 rounded bg-primary/10" />
              )}
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{vendor}</CardTitle>
                {configured && configCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {configCount} {configCount === 1 ? "Config" : "Configs"}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={isToggling || !configured}
            />
            {isToggling && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features List */}
        {features.length > 0 && (
          <div className="space-y-2">
            <ul className="grid grid-cols-1 gap-1.5">
              {features.slice(0, 3).map((feature, idx) => (
                <li
                  key={idx}
                  className="text-xs text-muted-foreground flex items-center gap-2"
                >
                  <div className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="truncate">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            {/* Upload Button */}
            {supportsUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUpload}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            )}

            {/* Connect API Button */}
            {supportsApi && (
              <Button
                variant="outline"
                size="sm"
                onClick={onConnect}
                className="w-full"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {configured && configCount > 0 ? "Add More" : "Connect"}
              </Button>
            )}
          </div>

          {/* Configure Button */}
          {configured && configCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onConfigure}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Configurations
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
