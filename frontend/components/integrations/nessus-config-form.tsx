"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Switch } from "@/components/ui/switch";
import { integrationConfigApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  base_url: z.string().url("Must be a valid URL"),
  access_key: z.string().min(1, "Access key is required"),
  secret_key: z.string().min(1, "Secret key is required"),
  auto_sync: z.boolean(),
  sync_interval_mins: z.number().min(5, "Minimum interval is 5 minutes"),
});

type FormData = {
  name: string;
  base_url: string;
  access_key: string;
  secret_key: string;
  auto_sync: boolean;
  sync_interval_mins: number;
};

interface NessusConfigFormProps {
  config?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NessusConfigForm({
  config,
  onSuccess,
  onCancel,
}: NessusConfigFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: config?.name || "",
      base_url: config?.base_url || "",
      access_key: "",
      secret_key: "",
      auto_sync: config?.auto_sync || false,
      sync_interval_mins: config?.sync_interval_mins || 60,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (config) {
        // Update existing
        const updateData: any = {
          name: data.name,
          base_url: data.base_url,
          auto_sync: data.auto_sync,
          sync_interval_mins: data.sync_interval_mins,
        };

        // Only include credentials if they were entered
        if (data.access_key) {
          updateData.access_key = data.access_key;
        }
        if (data.secret_key) {
          updateData.secret_key = data.secret_key;
        }

        await integrationConfigApi.update(config.id, updateData);
        toast.success("Configuration updated successfully");
      } else {
        // Create new
        await integrationConfigApi.create({
          ...data,
          type: "nessus",
        });
        toast.success("Configuration created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to save configuration",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Configuration Name</FormLabel>
              <FormControl>
                <Input placeholder="Production Nessus Server" {...field} />
              </FormControl>
              <FormDescription>
                A friendly name to identify this Nessus server
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
              <FormLabel>Nessus API URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://nessus.example.com:8834"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The base URL of your Nessus server (include port if
                non-standard)
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
                <Input
                  type="password"
                  placeholder={
                    config ? "Leave blank to keep current" : "Enter access key"
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your Nessus API access key (will be encrypted)
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
                <Input
                  type="password"
                  placeholder={
                    config ? "Leave blank to keep current" : "Enter secret key"
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your Nessus API secret key (will be encrypted)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-4">Auto-Sync Settings</h3>

          <FormField
            control={form.control}
            name="auto_sync"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Auto-Sync</FormLabel>
                  <FormDescription>
                    Automatically import vulnerabilities from this Nessus server
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("auto_sync") && (
            <FormField
              control={form.control}
              name="sync_interval_mins"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Sync Interval (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="5"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How often to check for new vulnerabilities (minimum 5
                    minutes)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config ? "Update" : "Create"} Configuration
          </Button>
        </div>
      </form>
    </Form>
  );
}
