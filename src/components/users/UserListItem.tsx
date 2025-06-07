
"use client";

import type { User } from "@/lib/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, MessageSquare } from "lucide-react";

interface UserListItemProps {
  user: User;
}

export default function UserListItem({ user }: UserListItemProps) {
  const fallbackName = user.fullName ? user.fullName.split(" ").map(n => n[0]).join("") : "PN";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="h-16 w-16 border">
          <AvatarImage src={user.profilePictureUrl || `https://placehold.co/64x64.png?text=${fallbackName}`} alt={user.fullName} />
          <AvatarFallback className="text-xl">{fallbackName}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl font-headline mb-1">
            <Link href={`/users/${user.id}`} className="hover:underline">
              {user.fullName}
            </Link>
          </CardTitle>
          {user.profession && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 mr-1.5" />
              <span>{user.profession}</span>
            </div>
          )}
          {user.location?.address && (
            <div className="flex items-center text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-4 w-4 mr-1.5" />
              <span>{user.location.address}</span>
            </div>
          )}
           {user.isOnline && (
            <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Online
                </span>
            </div>
          )}
        </div>
      </CardHeader>
      {user.bio && (
        <CardContent className="px-4 pb-2 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        </CardContent>
      )}
      <CardFooter className="p-4 border-t">
        <div className="flex gap-2 w-full">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/users/${user.id}`}>View Profile</Link>
        </Button>
        <Button size="sm" className="flex-1" asChild>
          <Link href={`/messages?chatWith=${user.id}`}>
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Link>
        </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
