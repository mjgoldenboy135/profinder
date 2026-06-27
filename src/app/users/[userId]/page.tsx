"use client";

import { useEffect, useState, use } from "react";
import PublicProfileCard from "@/components/profile/PublicProfileCard";
import type { UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/services/userService";

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { userId } = use(params);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(Number(userId))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>User Not Found</AlertTitle>
          <AlertDescription>The profile you are looking for does not exist or could not be loaded.</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
          <Link href="/users">Back to User List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <PublicProfileCard user={user} />
    </div>
  );
}
