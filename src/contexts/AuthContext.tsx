
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, getRedirectResult, type UserCredential } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase'; // Your Firebase auth instance
import type { User as AppUser } from '@/lib/types'; // Import your app's User type
import { getUserProfile, createUserProfile } from '@/services/userService'; // Import userService
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Import Loader2

interface AuthContextType {
  currentUser: FirebaseUser | null;
  currentUserProfile: AppUser | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A simple full-page loader component
function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Signing in...</p>
      </div>
    </div>
  );
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true); // New state to track redirect processing
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // This effect handles the result of the redirect sign-in.
    // It runs only once on component mount.
    getRedirectResult(auth)
      .then(async (result: UserCredential | null) => {
        if (result) {
          // If result exists, it means the user just signed in via redirect.
          const user = result.user;
          toast({
            title: "Login Successful!",
            description: `Welcome, ${user.displayName || "User"}!`,
          });
          
          const userProfile = await getUserProfile(user.uid);
          if (!userProfile) {
            // Create a profile if one doesn't exist
            await createUserProfile(user.uid, {
              fullName: user.displayName || "Google User",
              email: user.email || "", 
              profilePictureUrl: user.photoURL || "",
              isOnline: false, 
              showContact: false, 
              locationVisibility: 'public',
            });
          }
          // The onAuthStateChanged listener below will handle setting the final user state
          // and fetching the complete profile. We don't need to do anything else here.
        }
      })
      .catch((error) => {
        console.error("Error during sign-in redirect:", error);
        toast({
          title: "Google Login Failed",
          description: `An error occurred during sign-in: ${error.message}`,
          variant: "destructive",
        });
      })
      .finally(() => {
        // Mark the redirect processing as complete, regardless of outcome.
        setIsProcessingRedirect(false);
      });

    // This listener handles all auth state changes, including the one from the redirect result above.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUserProfile(profile);
        } catch (error) {
          console.error("[AuthContext] Error fetching user profile:", error);
          setCurrentUserProfile(null);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
      }
      // Only set loading to false once the initial auth state has been determined.
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUserProfile = async () => {
    const firebaseAuthUser = auth.currentUser;
    if (firebaseAuthUser) {
      // No need to set loading here, as this is a background refresh
      try {
        const firestoreProfile = await getUserProfile(firebaseAuthUser.uid);
        setCurrentUserProfile(firestoreProfile);
        // Refresh the auth user object itself in case displayName/photoURL changed in Auth
        await firebaseAuthUser.reload();
        setCurrentUser(auth.currentUser);
      } catch (error) {
        console.error("[AuthContext refreshUserProfile] Error refreshing user profile:", error);
      }
    } else {
      setCurrentUserProfile(null);
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    currentUserProfile,
    loading: loading || isProcessingRedirect, // The app is loading if either is true
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {(loading || isProcessingRedirect) ? <FullPageLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
