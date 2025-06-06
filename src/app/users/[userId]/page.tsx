
import PublicProfileCard from "@/components/profile/PublicProfileCard";
import type { User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/services/userService"; // Import the Firestore service
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

interface UserProfilePageProps {
  params: {
    userId: string;
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  let user: User | null = null;
  try {
    user = await getUserProfile(params.userId);

    if (user) {
      // Create a mutable copy for serialization
      const serializableUser = { ...user };

      // Convert Firestore Timestamps to numbers (milliseconds)
      if (serializableUser.createdAt && serializableUser.createdAt instanceof Timestamp) {
        serializableUser.createdAt = serializableUser.createdAt.toMillis() as any;
      }
      if (serializableUser.updatedAt && serializableUser.updatedAt instanceof Timestamp) {
        serializableUser.updatedAt = serializableUser.updatedAt.toMillis() as any;
      }
      user = serializableUser; // Use the serialized version
    }
  } catch (error) {
    console.error("Error processing user profile in UserProfilePage:", error);
    // User will remain null, leading to the "User Not Found" display
  }


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
