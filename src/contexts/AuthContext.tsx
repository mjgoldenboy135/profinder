
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, getRedirectResult, type UserCredential } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase'; // Your Firebase auth instance
import type { User as AppUser } from '@/lib/types'; // Import your app's User type
import { getUserProfile, createUserProfile } from '@/services/userService'; // Import userService
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: FirebaseUser | null; // Firebase Auth user
  currentUserProfile: AppUser | null; // Firestore user profile
  loading: boolean;
  refreshUserProfile: () => Promise<void>; // Added refreshUserProfile to type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Step 2: Handle the result when the user returns
    getRedirectResult(auth)
      .then(async (result: UserCredential | null) => {
        if (result) {
          // User just signed in via redirect.
          const user = result.user;
          toast({
            title: "Login Successful!",
            description: `Welcome back, ${user.displayName || "User"}!`,
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
          // The onAuthStateChanged listener below will handle setting the user state
          // and fetching the full profile, then redirecting.
        } else {
            // This runs on normal page loads, not after a redirect.
            setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error during sign-in redirect:", error);
        toast({
          title: "Google Login Failed",
          description: `An error occurred during sign-in: ${error.message}`,
          variant: "destructive",
        });
        setLoading(false);
      });

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
      setLoading(true);
      try {
        const firestoreProfile = await getUserProfile(firebaseAuthUser.uid);
        setCurrentUserProfile(firestoreProfile);
        setCurrentUser(firebaseAuthUser);
      } catch (error) {
        console.error("[AuthContext refreshUserProfile] Error refreshing user profile:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentUserProfile(null);
      setCurrentUser(null);
      setLoading(false);
    }
  };


  const value = {
    currentUser,
    currentUserProfile,
    loading,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
