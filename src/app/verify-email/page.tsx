
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const { currentUser, loading: authLoading, refreshUserProfile } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        // If no user is logged in, they shouldn't be here
        router.replace("/login");
      } else if (currentUser.emailVerified) {
        // If user is already verified, send them to the map
        router.replace("/map");
      }
    }
  }, [currentUser, authLoading, router]);

  const handleResendVerification = async () => {
    if (!currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(currentUser);
      toast({
        title: "Verification Email Sent",
        description: `A new verification link has been sent to ${currentUser.email}.`,
      });
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast({
        title: "Error",
        description: error.code === 'auth/too-many-requests' 
          ? "You've requested this too many times. Please wait a few minutes before trying again."
          : "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;
    setIsChecking(true);
    try {
      // Reload the user object from Firebase to get the latest state
      await currentUser.reload();
      
      // The onAuthStateChanged listener in AuthContext will handle the update,
      // but we can force a check here and redirect immediately if verified.
      // We also need to refresh our app's specific profile data.
      await refreshUserProfile();
      
      if (auth.currentUser?.emailVerified) {
        toast({
          title: "Email Verified!",
          description: "Thank you for verifying your email. Redirecting...",
        });
        router.push("/map");
      } else {
        toast({
          title: "Email Not Verified",
          description: "Please check your inbox (and spam folder) for the verification link.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      toast({
        title: "Error",
        description: "Could not check verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", variant: "destructive" });
    }
  };
  
  if (authLoading || !currentUser || currentUser.emailVerified) {
    // Show a loading state while we wait for auth state or redirect
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
            <MailWarning className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Verify Your Email</CardTitle>
          <CardDescription>
            A verification link has been sent to your email address:
            <br />
            <strong className="text-primary">{currentUser.email}</strong>
            <br />
            Please click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Button onClick={handleCheckVerification} className="w-full" size="lg" disabled={isChecking}>
            {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
            {isChecking ? "Checking..." : "I have verified my email"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Can't find the email? Check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center border-t pt-6">
          <Button variant="outline" onClick={handleResendVerification} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend Email
          </Button>
          <Button variant="link" onClick={handleLogout}>
             Log out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
