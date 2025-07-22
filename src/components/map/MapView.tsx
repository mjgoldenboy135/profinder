
"use client";

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { MapPin as MapPinIcon, Loader2, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription as UILabelAlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext'; // Import useAuthContext

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || undefined;

const ALL_PROFESSIONS_FILTER_VALUE = "__ALL_PROFESSIONS__";
const DEFAULT_ZOOM = 9;
const FOCUSED_ZOOM = 14;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

export default function MapView() {
  const [allOnlineUsers, setAllOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>(ALL_PROFESSIONS_FILTER_VALUE);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);
  const { currentUser } = useAuthContext();
  const mapRef = useRef<google.maps.Map | null>(null);

  const targetUserId = searchParams.get('userId');
  const targetLatParam = searchParams.get('lat');
  const targetLngParam = searchParams.get('lng');

  useEffect(() => {
    if (!API_KEY) {
      console.warn("[MapView] Google Maps API Key is missing. Map functionality will be disabled.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("isOnline", "==", true));

    const unsubscribe: Unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        if (userData.location && userData.location.lat != null && userData.location.lng != null) {
          fetchedUsers.push(userData);
        }
      });
      setAllOnlineUsers(fetchedUsers);
      setIsLoading(false);
    }, (error) => {
      console.error("[MapView] Error fetching real-time online users:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleUsers = useMemo(() => {
    const currentMapViewerId = currentUser?.uid;
    return allOnlineUsers.filter(user => {
      const professionMatch = selectedProfession === ALL_PROFESSIONS_FILTER_VALUE || user.profession === selectedProfession;
      if (!professionMatch) return false;

      const visibility = user.locationVisibility || 'public';
      if (visibility === 'public') return true;
      if (visibility === 'favorites') return !!currentMapViewerId && !!user.favoriteUserIds?.includes(currentMapViewerId);
      if (visibility === 'none') return false;
      return true;
    });
  }, [allOnlineUsers, selectedProfession, currentUser]);

  useEffect(() => {
    if (allOnlineUsers.length > 0) {
      const professions = new Set(allOnlineUsers.map(user => user.profession).filter(Boolean) as string[]);
      setAvailableProfessions(Array.from(professions).sort());
    } else {
      setAvailableProfessions([]);
    }
  }, [allOnlineUsers]);

  const initialCenter = useMemo(() => {
    const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
      return { lat: targetUser.location.lat, lng: targetUser.location.lng };
    }
    if (visibleUsers.length > 0 && visibleUsers[0].location?.lat != null && visibleUsers[0].location?.lng != null) {
      return { lat: visibleUsers[0].location.lat, lng: visibleUsers[0].location.lng };
    }
    return DEFAULT_CENTER;
  }, [targetLatParam, targetLngParam, targetUserId, allOnlineUsers, visibleUsers]);

  const initialZoom = useMemo(() => {
    return (targetLatParam && targetLngParam) || targetUserId ? FOCUSED_ZOOM : DEFAULT_ZOOM;
  }, [targetLatParam, targetLngParam, targetUserId]);
  
  useEffect(() => {
    if (mapRef.current) {
        const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
        if (targetLatParam && targetLngParam) {
            const lat = parseFloat(targetLatParam);
            const lng = parseFloat(targetLngParam);
            if (!isNaN(lat) && !isNaN(lng)) {
                mapRef.current.panTo({ lat, lng });
                mapRef.current.setZoom(FOCUSED_ZOOM);
            }
        } else if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
            mapRef.current.panTo({ lat: targetUser.location.lat, lng: targetUser.location.lng });
            mapRef.current.setZoom(FOCUSED_ZOOM);
        }
    }
  }, [targetUserId, targetLatParam, targetLngParam, allOnlineUsers]);


  if (!API_KEY) {
    return (
      <Card className="mt-4 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Map Configuration Required</CardTitle>
          <CardDescription>The Google Maps API Key is missing.</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Needed</AlertTitle>
                <UILabelAlertDescription>
                    <p className="font-bold">For Local Development:</p>
                    <p className="mb-2">Create a <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in your project root and add the line: <code className="bg-muted px-1 py-0.5 rounded block mt-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code></p>
                    <p className="font-bold">For the Deployed Site:</p>
                    <p>Ensure the API key is correctly set as a secret in your Firebase Project and that the <code className="bg-muted px-1 py-0.5 rounded">apphosting.yaml</code> file is configured to use it. If the issue persists, check the "Troubleshooting" section in your README file.</p>
                </UILabelAlertDescription>
            </Alert>
            <div className="mt-4 p-4 border rounded-md bg-muted min-h-[400px] flex flex-col items-center justify-center text-center">
                <MapPinIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-foreground mb-1">Map Placeholder</p>
                <p className="text-muted-foreground">The interactive map would display online users here, but the API key is missing.</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="text-3xl font-headline">Network Map</CardTitle>
                <CardDescription>
                See who's online and nearby. Your view is based on user privacy settings. Click marker for profile.
                </CardDescription>
            </div>
            { (availableProfessions.length > 0 || allOnlineUsers.length > 0) && (
            <div className="w-full sm:w-auto sm:min-w-[200px]">
                <Label htmlFor="profession-filter" className="sr-only">Filter by Profession</Label>
                <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                <SelectTrigger id="profession-filter" className="w-full">
                    <SelectValue placeholder="All Professions" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_PROFESSIONS_FILTER_VALUE}>All Professions</SelectItem>
                    {availableProfessions.map(prof => (
                    <SelectItem key={prof} value={prof}>
                        {prof}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {!MAP_ID && API_KEY && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Map Configuration Incomplete</AlertTitle>
                <UILabelAlertDescription>
                The <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_ID</code> environment variable is not set.
                Advanced Markers (used for user avatars on the map) require a Map ID and may not function correctly without it.
                Please set this variable in your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file (for local development) or as a secret for deployment.
                </UILabelAlertDescription>
            </Alert>
        )}
        {isLoading ? (
          <div className="h-[600px] w-full rounded-md border flex flex-col items-center justify-center bg-muted">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading map and live user data...</p>
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-md overflow-hidden border">
            <APIProvider apiKey={API_KEY}>
              <Map
                ref={mapRef}
                defaultCenter={initialCenter}
                defaultZoom={initialZoom}
                mapId={MAP_ID}
                gestureHandling="auto"
                className="h-full w-full"
                mapTypeControl={false}
                streetViewControl={false}
                zoomControl={true}
                fullscreenControl={true}
                disableDefaultUI={false}
              >
                {visibleUsers.map(user => {
                  const fallbackName = user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase() : "U";
                  const avatarSrc = user.profilePictureUrl || `https://placehold.co/40x40.png?text=${encodeURIComponent(fallbackName)}`;

                  return user.location && user.location.lat != null && user.location.lng != null ? (
                    <AdvancedMarker
                        key={user.id}
                        position={{ lat: user.location.lat, lng: user.location.lng }}
                        title={`${user.fullName}${user.profession ? ` - ${user.profession}` : ''}`}
                        onClick={() => router.push(`/users/${user.id}`)}
                    >
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-10 w-10 border-2 border-primary shadow-md">
                                <AvatarImage src={avatarSrc} alt={user.fullName || 'User'} />
                                <AvatarFallback>{fallbackName}</AvatarFallback>
                            </Avatar>
                            {user.profession && (
                                <span
                                  className="mt-0.5 text-[10px] text-foreground font-medium bg-card/80 backdrop-blur-sm px-1 rounded shadow-sm whitespace-nowrap max-w-[100px] truncate"
                                  style={{pointerEvents: 'none'}}
                                >
                                    {user.profession}
                                </span>
                            )}
                        </div>
                    </AdvancedMarker>
                  ) : null
                })}
              </Map>
            </APIProvider>
          </div>
        )}
        {!isLoading && allOnlineUsers.length === 0 && API_KEY && (
             <p className="text-sm text-muted-foreground mt-4 text-center">
                No users currently online with location data to display on the map.
            </p>
        )}
        {!isLoading && allOnlineUsers.length > 0 && visibleUsers.length === 0 && API_KEY && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
                No users match your current filters or meet the visibility criteria for your view.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
