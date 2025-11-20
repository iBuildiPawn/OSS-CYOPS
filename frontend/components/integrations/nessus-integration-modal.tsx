"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationConfigApi } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Wifi, Eye, EyeOff } from "lucide-react";
import { NessusScanBrowserModal } from "./nessus-scan-browser-modal";

const nessusConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  base_url: z
    .string()
    .url("Must be a valid URL")
    .min(1, "Base URL is required"),
  access_key: z.string().min(1, "Access key is required"),
  secret_key: z.string().min(1, "Secret key is required"),
  auto_sync: z.boolean().optional().default(false),
  sync_interval_mins: z.number().min(15).optional().default(60),
});

type NessusConfigFormData = z.infer<typeof nessusConfigSchema>;

interface NessusIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId?: string;
  onSuccess?: () => void;
}

export function NessusIntegrationModal({
  open,
  onOpenChange,
  configId: externalConfigId,
  onSuccess,
}: NessusIntegrationModalProps) {
  const queryClient = useQueryClient();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const form = useForm({
    resolver: zodResolver(nessusConfigSchema),
    defaultValues: {
      name: "",
      base_url: "https://",
      access_key: "",
      secret_key: "",
      auto_sync: false,
      sync_interval_mins: 60,
    },
  });

  // Create integration config
  const createMutation = useMutation({
    mutationFn: (data: NessusConfigFormData) =>
      integrationConfigApi.create({
        ...data,
        type: "nessus",
      }),
    onSuccess: (response) => {
      const newConfigId = String(response.data.id);
      setConfigId(newConfigId);
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      toast.success("Integration created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to create integration",
      );
    },
  });

  // Test connection
  const testConnection = async () => {
    const values = form.getValues();

    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setTestingConnection(true);
    setConnectionTested(false);

    try {
      // Create the config first
      const response = await integrationConfigApi.create({
        ...values,
        type: "nessus",
      });

      const newConfigId = String(response.data.id);
      setConfigId(newConfigId);

      // Test the connection
      await integrationConfigApi.testConnection(newConfigId);

      setConnectionTested(true);
      toast.success("Connection successful! You can now browse scans.");
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
    } catch (error: any) {
      toast.error(
        error.response?.data?.details ||
          error.response?.data?.error ||
          "Connection test failed",
      );
      setConnectionTested(false);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleBrowseScans = () => {
    if (!configId) {
      toast.error("Please test connection first");
      return;
    }
    setShowBrowser(true);
  };

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
    setShowBrowser(false);
    setConfigId(null);
    setConnectionTested(false);
    form.reset();
  };

  return (
    <>
      <Dialog open={open && !showBrowser} onOpenChange={onOpenChange}>
        <DialogContent className="sm:!max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Connect to Nessus</DialogTitle>
            <DialogDescription>
              Configure your Nessus integration to import vulnerability scans
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Production Nessus Server"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this integration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nessus URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://nessus.example.com:8834"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The full URL of your Nessus server (include https:// and
                      port)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Nessus access key" {...field} />
                    </FormControl>
                    <FormDescription>
                      Generated in Nessus under Settings → API Keys
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secret_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showSecretKey ? "text" : "password"}
                          placeholder="Your Nessus secret key"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your secret key will be encrypted before storage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_sync"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable auto-sync (Coming soon)</FormLabel>
                      <FormDescription>
                        Automatically import new scans at regular intervals
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {connectionTested && configId && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Connection successful! You can now browse and import scans
                    from this Nessus server.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>

          <div className="flex justify-between gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={testingConnection}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                onClick={handleBrowseScans}
                disabled={!connectionTested || !configId}
              >
                Browse Scans
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan Browser Modal */}
      {configId && (
        <NessusScanBrowserModal
          open={showBrowser}
          onOpenChange={setShowBrowser}
          configId={configId}
          configName={form.getValues("name")}
          onImportSuccess={handleSuccess}
        />
      )}
    </>
  );
}
