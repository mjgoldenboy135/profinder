"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const { currentUser, loading: authLoading, logout } = useAuthContext();
  const router = useRouter();

  // Since Django doesn't require email verification by default, redirect verified/logged in users
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.replace("/login");
      } else {
        // With Django JWT auth, users are considered verified upon login
        router.replace("/map");
      }
    }
  }, [currentUser, authLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (authLoading || !currentUser) {
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
            <MailCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Account Verified</CardTitle>
          <CardDescription>
            Your account is active. You can proceed to use Profinder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/map">Go to Map</Link>
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Button variant="link" onClick={handleLogout}>
            Log out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
