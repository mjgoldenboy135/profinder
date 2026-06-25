"use client";

import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Linkedin, Mail, Phone, MessageSquare, Star as StarIcon, Briefcase, GraduationCap, MapPin, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { addFavoriteUser, removeFavoriteUser, getFavoriteUsers } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { findOrCreateChat } from "@/services/chatService";

interface PublicProfileCardProps {
  user: UserProfile;
}

export default function PublicProfileCard({ user }: PublicProfileCardProps) {
  const { currentUser, loading: authLoading, refreshUserProfile } = useAuthContext();
  const { toast } = useToast();
  const router = useRouter();

  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const fallbackName = user.full_name ? user.full_name.split(" ").map(n => n[0]).join("") : "PN";

  useEffect(() => {
    if (!currentUser || currentUser.id === user.id) return;
    getFavoriteUsers().then(favs => {
      setIsFavorited(favs.some(f => f.id === user.id));
    }).catch(() => {});
  }, [currentUser, user.id]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to manage favorites.", variant: "destructive" });
      return;
    }
    if (currentUser.id === user.id) {
      toast({ title: "Action Not Allowed", description: "You cannot favorite your own profile.", variant: "destructive" });
      return;
    }
    setIsUpdatingFavorite(true);
    const newFavoriteState = !isFavorited;
    setIsFavorited(newFavoriteState);
    try {
      if (newFavoriteState) {
        await addFavoriteUser(user.id);
        toast({ title: "Added to Favorites", description: `${user.full_name} has been added to your favorites.` });
      } else {
        await removeFavoriteUser(user.id);
        toast({ title: "Removed from Favorites", description: `${user.full_name} has been removed from your favorites.` });
      }
      await refreshUserProfile();
    } catch {
      toast({ title: "Error", description: "Could not update favorite status.", variant: "destructive" });
      setIsFavorited(!newFavoriteState);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const showFavoriteButton = currentUser && currentUser.id !== user.id;

  const handleStartChat = async () => {
    if (!currentUser) { router.push('/login'); return; }
    setIsStartingChat(true);
    try {
      const chat = await findOrCreateChat(user.id);
      router.push(`/messages/${chat.id}`);
    } catch {
      toast({ title: 'Error', description: 'Could not start chat.', variant: 'destructive' });
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader className="items-center text-center">
        <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-md">
          <AvatarImage src={user.profile_picture_url || `https://placehold.co/128x128.png?text=${fallbackName}`} alt={user.full_name} />
          <AvatarFallback className="text-4xl">{fallbackName}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-3xl font-headline">{user.full_name}</CardTitle>
        <CardDescription className="text-lg text-accent-foreground">{user.profession || "Profession not specified"}</CardDescription>
        {user.address && (
          <div className="flex items-center text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{user.address}</span>
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
        {user.professional_details && (
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">Professional Details</h3>
            <p className="text-foreground/90 whitespace-pre-wrap">{user.professional_details}</p>
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
          {user.years_of_experience !== undefined && user.years_of_experience !== null && (
            <div className="flex items-start">
              <Briefcase className="h-6 w-6 mr-3 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Experience</h4>
                <p className="text-foreground/80">{user.years_of_experience} {user.years_of_experience === 1 ? "year" : "years"}</p>
              </div>
            </div>
          )}
        </div>
        {user.show_contact && (user.email || user.phone_number) && (
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">Contact Information</h3>
            {user.email && (
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-primary" />
                <a href={`mailto:${user.email}`} className="text-foreground/80 hover:text-primary transition-colors">{user.email}</a>
              </div>
            )}
            {user.phone_number && (
              <div className="flex items-center mt-2">
                <Phone className="h-5 w-5 mr-2 text-primary" />
                <a href={`tel:${user.phone_number}`} className="text-foreground/80 hover:text-primary transition-colors">{user.phone_number}</a>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-6 border-t">
        {user.linkedin_profile_url && (
          <Button variant="outline" asChild>
            <a href={user.linkedin_profile_url} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-2 h-5 w-5 text-primary" /> LinkedIn
            </a>
          </Button>
        )}
        {user.show_contact && user.email && (
          <Button variant="outline" asChild>
            <a href={`mailto:${user.email}`}><Mail className="mr-2 h-5 w-5 text-primary" /> Email</a>
          </Button>
        )}
        {currentUser && currentUser.id !== user.id && (
          <Button onClick={handleStartChat} disabled={isStartingChat}>
            {isStartingChat ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
            Message
          </Button>
        )}
        {showFavoriteButton && !authLoading && (
          <Button
            variant={isFavorited ? "outline" : "default"}
            onClick={handleToggleFavorite}
            disabled={isUpdatingFavorite || authLoading}
            className="w-full sm:w-auto"
          >
            {isUpdatingFavorite ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StarIcon className={`mr-2 h-5 w-5 ${isFavorited ? 'fill-current text-yellow-400' : 'text-muted-foreground'}`} />
            )}
            {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
