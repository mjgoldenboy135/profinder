"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setTokens } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { verifyEmail, resendVerification } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck, MailWarning, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "idle" | "verifying" | "success" | "error";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUserProfile } = useAuthContext();
  const { toast } = useToast();

  const uid = params.get("uid");
  const token = params.get("token");
  const email = params.get("email") || "";

  const [status, setStatus] = useState<Status>(uid && token ? "verifying" : "idle");
  const [resending, setResending] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!uid || !token || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const data = await verifyEmail(uid, token);
        setTokens(data.access, data.refresh);
        await refreshUserProfile();
        setStatus("success");
        toast({ title: "Email Verified", description: "Your account is now active." });
        setTimeout(() => router.push("/map"), 1200);
      } catch {
        setStatus("error");
      }
    })();
  }, [uid, token, refreshUserProfile, router, toast]);

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Email needed", description: "Please log in to resend your verification link.", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      await resendVerification(email);
      toast({ title: "Verification Sent", description: "If your account still needs verifying, a new link is on its way." });
    } catch {
      toast({ title: "Error", description: "Could not resend right now. Please try again later.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  let icon = <MailWarning className="h-12 w-12 text-primary" />;
  let title = "Verify Your Email";
  let description = email
    ? `We sent a verification link to ${email}. Click it to activate your account.`
    : "Please check your inbox for a verification link to activate your account.";

  if (status === "verifying") {
    icon = <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    title = "Verifying…";
    description = "Confirming your email address, one moment.";
  } else if (status === "success") {
    icon = <MailCheck className="h-12 w-12 text-green-600" />;
    title = "Email Verified";
    description = "Your account is active. Redirecting you in…";
  } else if (status === "error") {
    icon = <XCircle className="h-12 w-12 text-destructive" />;
    title = "Verification Failed";
    description = "This verification link is invalid or has expired. Request a new one below.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">{icon}</div>
          <CardTitle className="text-3xl font-headline mt-4">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(status === "idle" || status === "error") && (
            <Button className="w-full" onClick={handleResend} disabled={resending}>
              {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resending ? "Sending…" : "Resend Verification Email"}
            </Button>
          )}
          {status === "success" && (
            <Button asChild className="w-full">
              <Link href="/map">Continue</Link>
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Button variant="link" asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
