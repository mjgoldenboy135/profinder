
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
      // setLoading(false); // Initial loading done once auth state is known

      if (user) {
        // setLoading(true) here could cause a flash if profile fetch is slow
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUserProfile(profile);
        } catch (error) {
          console.error("AuthContext: Error fetching user profile:", error);
          setCurrentUserProfile(null);
        } finally {
          // setLoading(false); // Moved below
        }
      } else {
        setCurrentUserProfile(null);
      }
      setLoading(false); // Set loading to false after auth state and initial profile fetch attempt
    });

    return () => unsubscribe();
  }, []);

  const refreshUserProfile = async () => {
    // Use auth.currentUser directly for the most up-to-date Firebase Auth user state
    const firebaseAuthUser = auth.currentUser;

    if (firebaseAuthUser) {
      setLoading(true);
      try {
        // Fetch Firestore profile
        const firestoreProfile = await getUserProfile(firebaseAuthUser.uid);
        setCurrentUserProfile(firestoreProfile);

        // Explicitly update the currentUser state in context with the latest from auth.currentUser
        // This ensures that if updateProfile (e.g., for photoURL) mutated auth.currentUser,
        // our context reflects it. This is a safeguard in case onAuthStateChanged is delayed
        // or doesn't fire for certain profile updates.
        setCurrentUser(firebaseAuthUser);

      } catch (error) {
        console.error("AuthContext: Error refreshing user profile:", error);
        // Optionally handle error, e.g., by not changing current state or setting to null
      } finally {
        setLoading(false);
      }
    } else {
      // If auth.currentUser is null (e.g., user signed out during the operation)
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
