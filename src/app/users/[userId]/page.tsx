import PublicProfileCard from "@/components/profile/PublicProfileCard";
import { placeholderUsers } from "@/lib/placeholder-data";
import type { User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserProfilePageProps {
  params: {
    userId: string;
  };
}

// This would be an async server component fetching data in a real app
// async function getUser(userId: string): Promise<User | null> {
//   // API call to fetch user by ID
//   return placeholderUsers.find(user => user.id === userId) || null;
// }

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const user = placeholderUsers.find(u => u.id === params.userId);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>User Not Found</AlertTitle>
          <AlertDescription>
            The profile you are looking for does not exist or could not be loaded.
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
