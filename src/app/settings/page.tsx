"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, KeyRound, AlertTriangle, ShieldOff, Sun, Moon, Monitor } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { getBlockedUsers, unblockUser } from "@/services/userService";
import { apiFetch } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function SettingsPage() {
  const { currentUser, loading: authLoading, logout } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    try {
      setBlockedUsers(await getBlockedUsers());
    } catch {
      setBlockedUsers([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) loadBlockedUsers();
  }, [currentUser, loadBlockedUsers]);

  const handleUnblock = async (targetId: number, name: string) => {
    setUnblockingId(targetId);
    try {
      await unblockUser(targetId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
      toast({ title: "User Unblocked", description: `${name} has been unblocked.` });
    } catch {
      toast({ title: "Error", description: "Could not unblock user. Please try again.", variant: "destructive" });
    } finally {
      setUnblockingId(null);
    }
  };

  const handleDeleteProfile = async () => {
    if (!currentUser) return;
    setIsDeletingProfile(true);
    try {
      const res = await apiFetch('/users/me/', { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Server rejected the deletion.');
      }
      logout();
      toast({ title: "Profile Deleted", description: "Your account has been permanently removed." });
      router.push('/login');
    } catch (error) {
      toast({ title: "Deletion Failed", description: "Could not delete profile. Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingProfile(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }

  if (!currentUser) {
    return <p className="text-center py-10">Please log in to view your settings.</p>;
  }

  return (
    <div className="py-8 w-full max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-primary">Settings</h1>
        <p className="text-muted-foreground">Manage your appearance, security, and account.</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-headline">Appearance</CardTitle>
          <CardDescription>Choose how Profinder looks to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex-1 justify-center"
            >
              <Sun className="mr-2 h-5 w-5" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex-1 justify-center"
            >
              <Moon className="mr-2 h-5 w-5" /> Dark
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5">
            <Monitor className="h-4 w-4" /> Currently using the <span className="font-medium capitalize">{theme}</span> theme.
          </p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-headline">Security</CardTitle>
          <CardDescription>Keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/change-password"><KeyRound className="mr-2 h-4 w-4" /> Change Password</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Blocked users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-headline flex items-center">
            <ShieldOff className="mr-2 h-5 w-5 text-primary" /> Blocked Users
          </CardTitle>
          <CardDescription>
            Blocked users can&apos;t message you or see that you blocked them, and they won&apos;t appear in your discovery results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul className="space-y-2">
              {blockedUsers.map((u) => {
                const initials = u.full_name ? u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.profile_picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.profile_picture_url} alt={u.full_name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">{initials}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.full_name}</p>
                        {u.profession && <p className="truncate text-xs text-muted-foreground">{u.profession}</p>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(u.id, u.full_name)}
                      disabled={unblockingId === u.id}
                      className="shrink-0"
                    >
                      {unblockingId === u.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Unblock
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg font-headline text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full sm:w-auto">Delete Profile</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your profile. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingProfile}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProfile}
                  disabled={isDeletingProfile}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isDeletingProfile ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
