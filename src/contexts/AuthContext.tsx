
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
    console.log(`[AuthContext] AuthProvider mounted at ${new Date().toISOString()}`);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const eventTime = new Date().toISOString();
      console.log(`[AuthContext] onAuthStateChanged fired at ${eventTime}. User:`, user ? { uid: user.uid, email: user.email } : null);

      if (user) {
        console.log(`[AuthContext] Setting current Firebase user at ${eventTime}. UID: ${user.uid}`);
        setCurrentUser(user);
        // setLoading(true) // Temporarily set loading while fetching profile
        try {
          console.log(`[AuthContext] Fetching Firestore profile for UID: ${user.uid} at ${eventTime}`);
          const profile = await getUserProfile(user.uid);
          console.log(`[AuthContext] Firestore profile fetched for UID: ${user.uid} at ${eventTime}. Profile:`, profile);
          console.log(`[AuthContext] Setting current app profile for UID: ${user.uid} at ${eventTime}`);
          setCurrentUserProfile(profile);
        } catch (error) {
          console.error("[AuthContext] Error fetching user profile after auth state change:", error);
          console.log(`[AuthContext] Setting current app profile to null due to error for UID: ${user.uid} at ${eventTime}`);
          setCurrentUserProfile(null);
        } finally {
          // setLoading(false); // Moved below
        }
      } else {
        console.log(`[AuthContext] No Firebase user. Setting currentUser and currentUserProfile to null at ${eventTime}`);
        setCurrentUser(null);
        setCurrentUserProfile(null);
      }
      console.log(`[AuthContext] Setting loading to false at ${eventTime}`);
      setLoading(false); // Set loading to false after auth state and initial profile fetch attempt
    });

    return () => {
      console.log(`[AuthContext] AuthProvider unmounting, unsubscribing from onAuthStateChanged at ${new Date().toISOString()}`);
      unsubscribe();
    };
  }, []);

  const refreshUserProfile = async () => {
    const refreshTime = new Date().toISOString();
    console.log(`[AuthContext] refreshUserProfile called at ${refreshTime}`);
    const firebaseAuthUser = auth.currentUser;
    console.log(`[AuthContext] auth.currentUser in refreshUserProfile at ${refreshTime}:`, firebaseAuthUser ? { uid: firebaseAuthUser.uid, email: firebaseAuthUser.email } : null);


    if (firebaseAuthUser) {
      console.log(`[AuthContext] refreshUserProfile: Firebase user found (UID: ${firebaseAuthUser.uid}). Setting loading to true at ${refreshTime}`);
      setLoading(true);
      try {
        console.log(`[AuthContext] refreshUserProfile: Fetching Firestore profile for UID: ${firebaseAuthUser.uid} at ${refreshTime}`);
        const firestoreProfile = await getUserProfile(firebaseAuthUser.uid);
        console.log(`[AuthContext] refreshUserProfile: Firestore profile fetched for UID: ${firebaseAuthUser.uid}. Profile:`, firestoreProfile, `at ${refreshTime}`);
        console.log(`[AuthContext] refreshUserProfile: Setting current app profile for UID: ${firebaseAuthUser.uid} at ${refreshTime}`);
        setCurrentUserProfile(firestoreProfile);

        console.log(`[AuthContext] refreshUserProfile: Setting current Firebase user state (from auth.currentUser) for UID: ${firebaseAuthUser.uid} at ${refreshTime}`);
        setCurrentUser(firebaseAuthUser);

      } catch (error) {
        console.error("[AuthContext] Error refreshing user profile:", error);
      } finally {
        console.log(`[AuthContext] refreshUserProfile: Setting loading to false for UID: ${firebaseAuthUser.uid} at ${refreshTime}`);
        setLoading(false);
      }
    } else {
      console.log(`[AuthContext] refreshUserProfile: No Firebase user. Setting currentUser and currentUserProfile to null at ${refreshTime}`);
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

