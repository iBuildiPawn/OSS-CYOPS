"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { twoFactorApi } from "@/lib/api";

const disable2FASchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  code: z.string().length(6, "Code must be exactly 6 digits"),
});

type Disable2FAFormData = z.infer<typeof disable2FASchema>;

export function TwoFactorDisable() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<Disable2FAFormData>({
    resolver: zodResolver(disable2FASchema),
    defaultValues: {
      password: "",
      code: "",
    },
  });

  const disableMutation = useMutation({
    mutationFn: (data: Disable2FAFormData) =>
      twoFactorApi.disable({ password: data.password, code: data.code }),
    onSuccess: () => {
      toast.success("2FA disabled", {
        description:
          "Two-factor authentication has been disabled for your account",
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to disable 2FA", {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  const onSubmit = (data: Disable2FAFormData) => {
    disableMutation.mutate(data);
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <CardTitle>Disable Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Remove the extra layer of security from your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Disabling 2FA will make your account less secure. You will only need
            your password to sign in.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Disable Two-Factor Authentication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your password and a verification code from your
                authenticator app to confirm.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className="font-mono text-lg tracking-widest text-center"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the 6-digit code from your authenticator app or a
                        backup code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setOpen(false);
                    }}
                    disabled={disableMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={disableMutation.isPending}
                  >
                    {disableMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Disable 2FA
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
