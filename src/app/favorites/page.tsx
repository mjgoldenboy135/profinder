
"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/types";
import { useAuthContext } from "@/contexts/AuthContext";
import { getFavoriteUsers, removeFavoriteUser } from "@/services/userService";
import UserListItem from "@/components/users/UserListItem";
import { Loader2, StarOff, Users, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FavoritesPage() {
  const { currentUser, currentUserProfile, loading: authLoading, refreshUserProfile } = useAuthContext();
  const { toast } = useToast();
  const [favoritedUsers, setFavoritedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRemovingFavorite, setIsRemovingFavorite] = useState(false);

  const fetchFavorites = async () => {
    if (!currentUser) {
      setIsLoading(false);
      setError("Please log in to view your favorites.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const users = await getFavoriteUsers(currentUser.uid);
      setFavoritedUsers(users);
    } catch (err: any) {
      console.error("Error fetching favorite users:", err);
      setError(err.message || "Failed to load favorites.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchFavorites();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, currentUserProfile]);


  const handleInitiateRemoveFavorite = (user: User) => {
    setUserToRemove(user);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmRemoveFavorite = async () => {
    if (!currentUser || !userToRemove) return;
    setIsRemovingFavorite(true);
    try {
      await removeFavoriteUser(currentUser.uid, userToRemove.id);
      toast({
        title: "Removed from Favorites",
        description: `${userToRemove.fullName} has been removed from your favorites.`,
      });
      setFavoritedUsers(prev => prev.filter(u => u.id !== userToRemove.id));
      if (refreshUserProfile) await refreshUserProfile();
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Could not remove favorite. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingFavorite(false);
      setIsConfirmDialogOpen(false);
      setUserToRemove(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your favorite professionals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Favorites</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        { !currentUser && (
            <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
        )}
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold font-headline mb-8 text-primary">My Favorite Professionals</h1>
      
      {favoritedUsers.length > 0 ? (
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritedUsers.map(user => (
              user && user.id ? (
                <div key={user.id} className="relative">
                  <UserListItem user={user} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleInitiateRemoveFavorite(user)}
                        aria-label={`Remove ${user.fullName} from favorites`}
                        disabled={isRemovingFavorite && userToRemove?.id === user.id}
                      >
                        {isRemovingFavorite && userToRemove?.id === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isRemovingFavorite && userToRemove?.id === user.id ? "Removing..." : "Unfavorite"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : null
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <div className="text-center py-10">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Favorites Yet</h2>
          <p className="text-muted-foreground mb-6">
            You haven't added any professionals to your favorites list.
          </p>
          <Button asChild>
            <Link href="/users">Discover Professionals</Link>
          </Button>
        </div>
      )}

      {userToRemove && (
        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Unfavorite</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove {userToRemove.fullName} from your favorites?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRemovingFavorite}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmRemoveFavorite}
                        disabled={isRemovingFavorite}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isRemovingFavorite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StarOff className="mr-2 h-4 w-4" />}
                        {isRemovingFavorite ? "Removing..." : "Unfavorite"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
