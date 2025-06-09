
"use client";

import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Linkedin, Mail, MessageSquare, Star as StarIcon, Briefcase, GraduationCap, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { addFavoriteUser, removeFavoriteUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface PublicProfileCardProps {
  user: User; // The user whose profile is being viewed
}

export default function PublicProfileCard({ user }: PublicProfileCardProps) {
  const { currentUser, currentUserProfile, loading: authLoading, refreshUserProfile } = useAuthContext();
  const { toast } = useToast();
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const fallbackName = user.fullName ? user.fullName.split(" ").map(n => n[0]).join("") : "PN";

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.favoriteUserIds) {
      setIsFavorited(currentUserProfile.favoriteUserIds.includes(user.id));
    } else {
      setIsFavorited(false);
    }
  }, [currentUserProfile, user.id]);

  const handleToggleFavorite = async () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to manage favorites.", variant: "destructive" });
      return;
    }
    if (currentUser.uid === user.id) {
        toast({ title: "Action Not Allowed", description: "You cannot favorite your own profile.", variant: "destructive"});
        return;
    }

    setIsUpdatingFavorite(true);
    const newFavoriteState = !isFavorited; // Determine new state
    setIsFavorited(newFavoriteState); // Optimistic update

    try {
      if (newFavoriteState) { // User wants to add
        await addFavoriteUser(currentUser.uid, user.id);
        toast({ title: "Added to Favorites", description: `${user.fullName} has been added to your favorites.` });
      } else { // User wants to remove
        await removeFavoriteUser(currentUser.uid, user.id);
        toast({ title: "Removed from Favorites", description: `${user.fullName} has been removed from your favorites.` });
      }
      if (refreshUserProfile) await refreshUserProfile(); // Refresh to confirm from source and update context
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast({ title: "Error", description: "Could not update favorite status. Please try again.", variant: "destructive" });
      setIsFavorited(!newFavoriteState); // Revert optimistic update on error
    } finally {
      setIsUpdatingFavorite(false);
    }
  };
  
  const showFavoriteButton = currentUser && currentUser.uid !== user.id;


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader className="items-center text-center">
        <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-md">
          <AvatarImage src={user.profilePictureUrl || `https://placehold.co/128x128.png?text=${fallbackName}`} alt={user.fullName} />
          <AvatarFallback className="text-4xl">{fallbackName}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-3xl font-headline">{user.fullName}</CardTitle>
        <CardDescription className="text-lg text-accent-foreground">{user.profession || "Profession not specified"}</CardDescription>
        {user.location?.address && (
          <div className="flex items-center text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{user.location.address}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {user.bio && (
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">About Me</h3>
            <p className="text-foreground/90 whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}
        
        {user.professionalDetails && (
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">Professional Details</h3>
            <p className="text-foreground/90 whitespace-pre-wrap">{user.professionalDetails}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user.education && (
            <div className="flex items-start">
              <GraduationCap className="h-6 w-6 mr-3 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Education</h4>
                <p className="text-foreground/80">{user.education}</p>
              </div>
            </div>
          )}
          {user.yearsOfExperience !== undefined && (
             <div className="flex items-start">
              <StarIcon className="h-6 w-6 mr-3 mt-1 text-primary flex-shrink-0" /> {/* Reverted to StarIcon for consistency */}
              <div>
                <h4 className="font-semibold">Experience</h4>
                <p className="text-foreground/80">{user.yearsOfExperience} {user.yearsOfExperience === 1 ? "year" : "years"}</p>
              </div>
            </div>
          )}
        </div>

        {user.showContact && user.email && (
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">Contact Information</h3>
            <div className="space-y-2">
              {user.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-primary" />
                  <a href={`mailto:${user.email}`} className="text-foreground/80 hover:text-primary transition-colors">{user.email}</a>
                </div>
              )}
            </div>
          </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-6 border-t">
        {user.linkedinProfileUrl && (
          <Button variant="outline" asChild>
            <a href={user.linkedinProfileUrl} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-2 h-5 w-5 text-primary" /> LinkedIn
            </a>
          </Button>
        )}
        {user.showContact && user.email && (
           <Button variant="outline" asChild>
            <a href={`mailto:${user.email}`}>
              <Mail className="mr-2 h-5 w-5 text-primary" /> Email
            </a>
          </Button>
        )}
        {currentUser && currentUser.uid !== user.id && (
          <Button asChild>
            <Link href={`/messages?chatWith=${user.id}`}>
              <MessageSquare className="mr-2 h-5 w-5" /> Message
            </Link>
          </Button>
        )}
        {showFavoriteButton && !authLoading && (
          <Button 
            variant={isFavorited ? "default" : "outline"} 
            onClick={handleToggleFavorite}
            disabled={isUpdatingFavorite || authLoading}
            className="w-full sm:w-auto"
          >
            {isUpdatingFavorite ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StarIcon className={`mr-2 h-5 w-5 ${isFavorited ? 'fill-current text-yellow-400 dark:text-yellow-300' : 'text-muted-foreground'}`} />
            )}
            {isFavorited ? 'Favorited' : 'Add to Favorites'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

    