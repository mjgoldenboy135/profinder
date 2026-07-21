"use client";

import type { UserProfile } from "@/lib/types";
import { availabilityMeta, professionLabel, REPORT_REASONS } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Linkedin, Mail, Phone, MessageSquare, Star as StarIcon, Briefcase, GraduationCap, MapPin, Loader2, Share2, Copy, Check, Navigation, BadgeCheck, Ban, ShieldOff, Flag, CalendarDays, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { addFavoriteUser, removeFavoriteUser, getFavoriteUsers, blockUser, unblockUser, reportUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { findOrCreateChat } from "@/services/chatService";

const SHARE_PLATFORMS = [
  {
    name: "WhatsApp",
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.116 1.535 5.845L.057 23.527a.5.5 0 0 0 .527.583l5.848-1.533A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.877 9.877 0 0 1-5.031-1.378l-.36-.214-3.733.979.997-3.645-.235-.374A9.869 9.869 0 0 1 2.106 12C2.106 6.529 6.529 2.106 12 2.106S21.894 6.529 21.894 12 17.471 21.894 12 21.894z"/></svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    name: "Twitter / X",
    color: "#000000",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    ),
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ),
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Telegram",
    color: "#26A5E4",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

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
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(!!user.is_blocked);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const fallbackName = user.full_name ? user.full_name.split(" ").map(n => n[0]).join("") : "PN";
  const availability = availabilityMeta(user.availability);
  const websiteLabel = (() => {
    if (!user.website_url) return "";
    if (user.website_name?.trim()) return user.website_name.trim();
    try {
      return new URL(user.website_url).hostname.replace(/^www\./, "");
    } catch {
      return "Website";
    }
  })();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;

  useEffect(() => {
    setIsBlocked(!!user.is_blocked);
  }, [user.is_blocked]);

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

  const showFavoriteButton = currentUser && currentUser.id !== user.id && !isBlocked;

  const getProfileUrl = () =>
    typeof window !== 'undefined' ? window.location.href : '';

  const getShareText = () =>
    `Check out ${user.full_name}'s profile on Profinder${user.profession ? ` — ${user.profession}` : ''}`;

  const handleNativeShare = async () => {
    const url = getProfileUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: user.full_name, text: getShareText(), url });
      } catch {}
    }
    setShareOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getProfileUrl());
      setCopied(true);
      toast({ title: "Link Copied!", description: "Profile link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" });
    }
  };

  const handlePlatformShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    setShareOpen(false);
  };

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

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      await blockUser(user.id);
      setIsBlocked(true);
      setIsFavorited(false);
      toast({ title: "User Blocked", description: `${user.full_name} can no longer message you.` });
      if (refreshUserProfile) await refreshUserProfile();
    } catch {
      toast({ title: "Error", description: "Could not block this user. Please try again.", variant: "destructive" });
    } finally {
      setIsBlocking(false);
      setBlockConfirmOpen(false);
    }
  };

  const handleUnblock = async () => {
    setIsBlocking(true);
    try {
      await unblockUser(user.id);
      setIsBlocked(false);
      toast({ title: "User Unblocked", description: `${user.full_name} has been unblocked.` });
    } catch {
      toast({ title: "Error", description: "Could not unblock this user. Please try again.", variant: "destructive" });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast({ title: "Select a Reason", description: "Please choose a reason for reporting.", variant: "destructive" });
      return;
    }
    setIsReporting(true);
    try {
      await reportUser(user.id, reportReason, reportDetails.trim());
      toast({ title: "Report Submitted", description: "Thank you. Our team will review this report." });
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch {
      toast({ title: "Error", description: "Could not submit your report. Please try again.", variant: "destructive" });
    } finally {
      setIsReporting(false);
    }
  };

  const isOwnProfile = currentUser && currentUser.id === user.id;
  const canModerate = currentUser && !isOwnProfile;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader className="items-center text-center relative">
        <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-md">
          <AvatarImage src={user.profile_picture_url || `https://placehold.co/128x128.png?text=${fallbackName}`} alt={user.full_name} />
          <AvatarFallback className="text-4xl">{fallbackName}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-3xl font-headline flex items-center justify-center gap-2">
          {user.full_name}
          {user.email_verified && <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified account" />}
        </CardTitle>
        <CardDescription className="text-lg text-accent-foreground">{professionLabel(user.profession, user.company) || "Profession not specified"}</CardDescription>
        {user.availability && user.availability !== 'none' && (
          <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availability.color}`}>
            {availability.label}
          </span>
        )}
        {user.address && (
          <div className="flex items-center text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{user.address}</span>
          </div>
        )}
        {memberSince && (
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>Member since {memberSince}</span>
          </div>
        )}
        {isBlocked && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
            <Ban className="h-4 w-4" />
            <span>You have blocked this user.</span>
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
      <CardFooter className="flex-col gap-4 pt-6 border-t">
        {/* Primary actions: consistent, professional styling */}
        <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 w-full flex-wrap">
          {currentUser && currentUser.id !== user.id && !isBlocked && (
            <Button onClick={handleStartChat} disabled={isStartingChat} className="w-full sm:w-auto">
              {isStartingChat ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
              Message
            </Button>
          )}
          {showFavoriteButton && !authLoading && (
            <Button
              variant="outline"
              onClick={handleToggleFavorite}
              disabled={isUpdatingFavorite || authLoading}
              className="w-full sm:w-auto"
            >
              {isUpdatingFavorite ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StarIcon className={`mr-2 h-5 w-5 ${isFavorited ? 'fill-current text-yellow-500' : 'text-primary'}`} />
              )}
              {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
            </Button>
          )}
          {user.lat != null && user.lng != null && (
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${user.lat},${user.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="mr-2 h-5 w-5 text-primary" /> Directions
              </a>
            </Button>
          )}
          {user.linkedin_profile_url && (
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a href={user.linkedin_profile_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="mr-2 h-5 w-5 text-primary" /> LinkedIn
              </a>
            </Button>
          )}
          {user.website_url && (
            <Button variant="outline" className="w-full sm:w-auto max-w-full" asChild>
              <a href={user.website_url} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-2 h-5 w-5 text-primary shrink-0" /> <span className="truncate">{websiteLabel}</span>
              </a>
            </Button>
          )}
          {user.show_contact && user.email && (
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a href={`mailto:${user.email}`}><Mail className="mr-2 h-5 w-5 text-primary" /> Email</a>
            </Button>
          )}

          {/* Share Profile */}
          <Popover open={shareOpen} onOpenChange={setShareOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Share2 className="mr-2 h-5 w-5 text-primary" /> Share Profile
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="center">
            <p className="text-sm font-semibold mb-3 text-center">Share {user.full_name}&apos;s Profile</p>
            <div className="grid grid-cols-1 gap-2">
              {SHARE_PLATFORMS.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformShare(platform.getUrl(getProfileUrl(), getShareText()))}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-left text-sm"
                  style={{ color: platform.color }}
                >
                  {platform.icon}
                  <span className="text-foreground font-medium">{platform.name}</span>
                </button>
              ))}

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-left text-sm text-primary"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="text-foreground font-medium">More options...</span>
                </button>
              )}

              <div className="border-t my-1" />

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-left text-sm"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-foreground font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Moderation actions: block/unblock + report */}
        {canModerate && (
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 w-full flex-wrap border-t pt-4">
            {isBlocked ? (
              <Button
                variant="outline"
                onClick={handleUnblock}
                disabled={isBlocking}
                className="w-full sm:w-auto"
              >
                {isBlocking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldOff className="mr-2 h-5 w-5 text-primary" />}
                Unblock User
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setBlockConfirmOpen(true)}
                disabled={isBlocking}
                className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Ban className="mr-2 h-5 w-5" /> Block User
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setReportOpen(true)}
              className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Flag className="mr-2 h-5 w-5" /> Report User
            </Button>
          </div>
        )}
      </CardFooter>

      {/* Block confirmation */}
      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Ban className="mr-2 h-5 w-5 text-destructive" /> Block {user.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to message you, and any existing chats will be closed. They won&apos;t be told that you blocked them, and they&apos;ll disappear from your discovery results. You can unblock them anytime from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBlock(); }}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report dialog */}
      <AlertDialog open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if (!open) { setReportReason(""); setReportDetails(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Flag className="mr-2 h-5 w-5 text-destructive" /> Report {user.full_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Reports are confidential. Tell us what&apos;s wrong and our team will review this profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-details">Additional details (optional)</Label>
              <Textarea
                id="report-details"
                placeholder="Add any details that will help us understand the issue."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSubmitReport(); }}
              disabled={isReporting || !reportReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
