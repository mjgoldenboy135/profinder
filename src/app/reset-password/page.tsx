"use client";

import { Suspense, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { confirmPasswordReset } from "@/services/authService";

const schema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordInner() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const linkValid = Boolean(uid && token);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await confirmPasswordReset(uid, token, values.newPassword);
      toast({ title: "Password Reset", description: "You can now log in with your new password." });
      router.push("/login");
    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err.message || "This reset link may be invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Set a New Password</CardTitle>
          <CardDescription>
            {linkValid
              ? "Choose a new password for your account."
              : "This reset link is missing required information. Please request a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkValid ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </Form>
          ) : (
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request a New Reset Link</Link>
            </Button>
          )}
          <div className="mt-6 text-center">
            <Button variant="link" asChild className="text-primary">
              <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
