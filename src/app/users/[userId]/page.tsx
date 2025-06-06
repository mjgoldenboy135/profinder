
import PublicProfileCard from "@/components/profile/PublicProfileCard";
// import { placeholderUsers } from "@/lib/placeholder-data"; // No longer needed for direct data
import type { User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/services/userService"; // Import the Firestore service

interface UserProfilePageProps {
  params: {
    userId: string;
  };
}

// This is now an async server component
async function fetchUser(userId: string): Promise<User | null> {
  try {
    const user = await getUserProfile(userId);
    return user;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const user = await fetchUser(params.userId);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>User Not Found</AlertTitle>
          <AlertDescription>
            The profile you are looking for does not exist or could not be loaded.
            This might be due to an incorrect ID or an issue fetching the data.
          </AlertDescription>
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
