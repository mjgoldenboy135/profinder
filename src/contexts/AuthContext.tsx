
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
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  );
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  const refreshUserProfile = async () => {
    const firebaseAuthUser = auth.currentUser;
    if (firebaseAuthUser) {
      try {
        const firestoreProfile = await getUserProfile(firebaseAuthUser.uid);
        setCurrentUserProfile(firestoreProfile);
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
    loading,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <FullPageLoader /> : children}
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
