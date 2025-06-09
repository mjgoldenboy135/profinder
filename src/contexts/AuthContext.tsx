
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase'; // Your Firebase auth instance
import type { User as AppUser } from '@/lib/types'; // Import your app's User type
import { getUserProfile } from '@/services/userService'; // Import userService

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false); // Set loading to false as soon as auth state is known

      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUserProfile(profile);
        } catch (error) {
          console.error("AuthContext: Error fetching user profile:", error);
          setCurrentUserProfile(null); // Ensure profile is null on error
        }
      } else {
        setCurrentUserProfile(null); // No user, so no profile
      }
      // setLoading(false); // Moved up
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Function to refresh current user's profile data
  const refreshUserProfile = async () => {
    if (currentUser) {
      setLoading(true); // Optionally set loading true during refresh
      try {
        const profile = await getUserProfile(currentUser.uid);
        setCurrentUserProfile(profile);
      } catch (error) {
        console.error("AuthContext: Error refreshing user profile:", error);
        // Potentially leave profile as is, or set to null depending on desired behavior
      } finally {
        setLoading(false); // Set loading false after refresh attempt
      }
    }
  };


  const value = {
    currentUser,
    currentUserProfile,
    loading,
    refreshUserProfile, // Expose refresh function
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
