"use client";

import type { UserProfile } from "@/lib/types";
import { availabilityMeta, professionLabel } from "@/lib/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, MessageSquare, MapPinIcon as ViewOnMapIcon, BadgeCheck } from "lucide-react";

interface UserListItemProps {
  user: UserProfile;
}

// Shared sky-blue button palette (Facebook-suggestions style).
const PRIMARY_BTN = "flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold shadow-none";
const SECONDARY_BTN = "flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 font-semibold border-0 shadow-none";

export default function UserListItem({ user }: UserListItemProps) {
  const fallbackName = user.full_name ? user.full_name.split(" ").map(n => n[0]).join("") : "PN";
  const hasValidLocation = user.lat != null && user.lng != null;
  const availability = availabilityMeta(user.availability);
  const roleLabel = professionLabel(user.profession, user.company);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg flex flex-col h-full">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="h-16 w-16 border">
          <AvatarImage src={user.profile_picture_url || `https://placehold.co/64x64.png?text=${fallbackName}`} alt={user.full_name} />
          <AvatarFallback className="text-xl">{fallbackName}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl font-bold mb-1">
            <Link href={`/users/${user.id}`} className="hover:underline inline-flex items-center gap-1">
              {user.full_name}
              {user.email_verified && <BadgeCheck className="h-4 w-4 text-sky-500" aria-label="Verified" />}
            </Link>
          </CardTitle>
          {roleLabel && (
            <div className="flex items-center text-sm text-sky-600 dark:text-sky-400 font-medium">
              <Briefcase className="h-4 w-4 mr-1.5 shrink-0" />
              <span>{roleLabel}</span>
            </div>
          )}
          {user.address && (
            <div className="flex items-center text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-4 w-4 mr-1.5 shrink-0" />
              <span>{user.address}</span>
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {user.is_online && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Online
              </span>
            )}
            {user.availability && user.availability !== 'none' && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${availability.color}`}>
                {availability.label}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      {user.bio && (
        <CardContent className="px-4 pb-2 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        </CardContent>
      )}
      <CardFooter className="p-4 border-t mt-auto">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2 w-full">
            <Button size="sm" className={PRIMARY_BTN} asChild>
              <Link href={`/messages?chatWith=${user.id}`}>
                <MessageSquare className="mr-2 h-4 w-4" /> Message
              </Link>
            </Button>
            <Button size="sm" className={SECONDARY_BTN} asChild>
              <Link href={`/users/${user.id}`}>View Profile</Link>
            </Button>
          </div>
          {hasValidLocation && (
            <Button size="sm" className={SECONDARY_BTN} asChild>
              <Link href={`/map?userId=${user.id}&lat=${user.lat}&lng=${user.lng}`}>
                <ViewOnMapIcon className="mr-2 h-4 w-4" /> View on Map
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
