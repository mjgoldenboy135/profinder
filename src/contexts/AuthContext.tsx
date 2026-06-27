'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@/lib/types';
import { apiFetch, setTokens, clearTokens, getAccessToken } from '@/lib/api';

export interface CurrentUser {
  id: number;
  uid: string; // string alias of id for backward compatibility
  email: string;
  emailVerified: boolean;
}

interface AuthContextType {
  currentUser: CurrentUser | null;
  currentUserProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = getAccessToken();
    if (!token) {
      setCurrentUser(null);
      setCurrentUserProfile(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch('/users/me/');
      if (res.ok) {
        const profile: UserProfile = await res.json();
        setCurrentUserProfile(profile);
        setCurrentUser({ id: profile.id, uid: String(profile.id), email: profile.email, emailVerified: true });
      } else {
        clearTokens();
        setCurrentUser(null);
        setCurrentUserProfile(null);
      }
    } catch {
      setCurrentUser(null);
      setCurrentUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const refreshUserProfile = async () => {
    await fetchProfile();
  };

  const logout = () => {
    clearTokens();
    setCurrentUser(null);
    setCurrentUserProfile(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, currentUserProfile, loading, refreshUserProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
