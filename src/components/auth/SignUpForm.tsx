"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import Image from "next/image";
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
import { useRouter } from "next/navigation";
import { apiFetch, setTokens } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { refreshUserProfile } = useAuthContext();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignUpFormValues) {
    form.clearErrors();
    try {
      const res = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ full_name: values.fullName, email: values.email, password: values.password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.email) {
          form.setError("email", { type: "manual", message: Array.isArray(err.email) ? err.email[0] : err.email });
        }
        toast({ title: "Sign Up Failed", description: err.detail || "Could not create account.", variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.verification_required || !data.access) {
        toast({ title: "Verify Your Email", description: "We sent a verification link to your email. Please check your inbox to activate your account." });
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      setTokens(data.access, data.refresh);
      await refreshUserProfile();
      toast({ title: "Account Created!", description: "Welcome to Proximity Network." });
      router.push("/profile");
    } catch {
      toast({ title: "Sign Up Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl overflow-hidden">
      <CardHeader className="p-0">
        <div className="overflow-hidden rounded-t-lg">
          <div className="relative aspect-video w-full">
            <Image
              src="/home_image.jpg"
              alt="Profinder - Professional Networking"
              fill
              style={{ objectFit: 'cover' }}
              data-ai-hint="professional network"
            />
          </div>
        </div>
        <div className="p-6 text-center">
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join Profinder to connect with professionals.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
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
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
        </Form>
        <GoogleSignInButton redirectTo="/profile" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
