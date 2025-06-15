
"use client";

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useMemo, useCallback } from "react";
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
const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;
const MAP_ID = rawMapId && rawMapId.trim() !== "" ? rawMapId.trim() : undefined;

const ALL_PROFESSIONS_FILTER_VALUE = "__ALL_PROFESSIONS__";
const DEFAULT_ZOOM = 9;
const FOCUSED_ZOOM = 14;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

if (typeof window !== 'undefined') {
  console.log('[MapView] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY available:', !!API_KEY);
  console.log('[MapView] Raw NEXT_PUBLIC_GOOGLE_MAPS_ID from env:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID);
  console.log('[MapView] Evaluated MAP_ID for <Map> component:', MAP_ID);
}

export default function MapView() {
  const [allOnlineUsers, setAllOnlineUsers] = useState<User[]>([]); // Store all users fetched from Firestore
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>(ALL_PROFESSIONS_FILTER_VALUE);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);
  const { currentUser } = useAuthContext(); // Get current logged-in user

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
    console.log("[MapView] Setting up Firestore listener for online users.");
    const usersRef = collection(db, "users");
    // Query for users who are explicitly set to 'isOnline: true'
    const q = query(usersRef, where("isOnline", "==", true));

    const unsubscribe: Unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        // Further client-side check for valid location, though 'isOnline' implies they should have it
        if (userData.location && userData.location.lat != null && userData.location.lng != null) {
          fetchedUsers.push(userData);
        } else {
          console.log(`[MapView] User ${userData.id} isOnline but missing valid location data.`, userData.location);
        }
      });
      setAllOnlineUsers(fetchedUsers); // Store all fetched online users
      setIsLoading(false);
      console.log(`[MapView] Fetched real-time users (${fetchedUsers.length}):`, fetchedUsers.map(u => ({id: u.id, name: u.fullName, loc: u.location, prof: u.profession, visibility: u.locationVisibility, favs: u.favoriteUserIds}) ));
    }, (error) => {
      console.error("[MapView] Error fetching real-time online users:", error);
      setIsLoading(false);
    });

    return () => {
      console.log("[MapView] Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, []);

  const visibleUsers = useMemo(() => {
    const currentMapViewerId = currentUser?.uid;
    return allOnlineUsers.filter(user => {
      // Basic profession filter
      const professionMatch = selectedProfession === ALL_PROFESSIONS_FILTER_VALUE || user.profession === selectedProfession;
      if (!professionMatch) return false;

      // Location visibility filter
      const visibility = user.locationVisibility || 'public'; // Default to public if undefined

      if (visibility === 'public') {
        return true; // Visible to everyone
      }
      if (visibility === 'favorites') {
        // Visible if the current map viewer is in this user's favoriteUserIds list
        return !!currentMapViewerId && !!user.favoriteUserIds?.includes(currentMapViewerId);
      }
      if (visibility === 'none') {
        return false; // Not visible on map
      }
      return true; // Default to visible if visibility is an unexpected value (should not happen with enum)
    });
  }, [allOnlineUsers, selectedProfession, currentUser]);


  useEffect(() => {
    // Update available professions based on *allOnlineUsers* to show all potential filter options
    // even if current visibility settings hide some of them.
    if (allOnlineUsers.length > 0) {
      const professions = new Set(
        allOnlineUsers.map(user => user.profession).filter(Boolean) as string[]
      );
      setAvailableProfessions(Array.from(professions).sort());
    } else {
      setAvailableProfessions([]);
    }
  }, [allOnlineUsers]);


  const programmaticCenter = useMemo(() => {
    console.log('[MapView useMemo programmaticCenter] Calculating. targetLatParam:', targetLatParam, 'targetLngParam:', targetLngParam, 'targetUserId:', targetUserId);
    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('[MapView useMemo programmaticCenter] Using lat/lng from params:', { lat, lng });
        return { lat, lng };
      }
    }
    if (targetUserId) {
      // Use allOnlineUsers to find target, as visibleUsers might not include them due to privacy
      const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
      if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
        console.log('[MapView useMemo programmaticCenter] Using targetUser location:', { lat: targetUser.location.lat, lng: targetUser.location.lng });
        return { lat: targetUser.location.lat, lng: targetUser.location.lng };
      }
    }
    // If focusing on a profession, center on the first *visible* user of that profession
    if (selectedProfession !== ALL_PROFESSIONS_FILTER_VALUE && visibleUsers.length > 0 && visibleUsers[0].location?.lat != null && visibleUsers[0].location?.lng != null) {
      console.log('[MapView useMemo programmaticCenter] Using first visibleUser (profession selected) location.');
      return { lat: visibleUsers[0].location.lat, lng: visibleUsers[0].location.lng };
    }
    // Fallback: center on the first *visible* user, or global default
    if (visibleUsers.length > 0 && visibleUsers[0].location?.lat != null && visibleUsers[0].location?.lng != null) {
      console.log('[MapView useMemo programmaticCenter] Using first visibleUser location (default/no filter).');
      return { lat: visibleUsers[0].location.lat, lng: visibleUsers[0].location.lng };
    }
    console.log('[MapView useMemo programmaticCenter] Using DEFAULT_CENTER.');
    return DEFAULT_CENTER;
  }, [targetLatParam, targetLngParam, targetUserId, allOnlineUsers, visibleUsers, selectedProfession]);

  const programmaticZoom = useMemo(() => {
    console.log('[MapView useMemo programmaticZoom] targetLatParam:', targetLatParam, 'targetLngParam:', targetLngParam, 'targetUserId:', targetUserId);
    if (targetLatParam && targetLngParam) {
        console.log('[MapView useMemo programmaticZoom] Setting FOCUSED_ZOOM due to lat/lng params.');
        return FOCUSED_ZOOM;
    }
    if (targetUserId) {
      const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
      if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
        console.log('[MapView useMemo programmaticZoom] Setting FOCUSED_ZOOM due to targetUserId.');
        return FOCUSED_ZOOM;
      }
    }
    console.log('[MapView useMemo programmaticZoom] Setting DEFAULT_ZOOM.');
    return DEFAULT_ZOOM;
  }, [targetLatParam, targetLngParam, targetUserId, allOnlineUsers]);

  const [currentCenter, setCurrentCenter] = useState(programmaticCenter);
  const [currentZoom, setCurrentZoom] = useState(programmaticZoom);

  useEffect(() => {
    console.log("[MapView useEffect] Programmatic center/zoom dependencies changed. ProgrammaticCenter:", programmaticCenter, "ProgrammaticZoom:", programmaticZoom);
    if (programmaticCenter.lat !== currentCenter.lat || programmaticCenter.lng !== currentCenter.lng) {
        console.log("[MapView useEffect] New Programmatic Center triggers state update. New:", programmaticCenter, "Current:", currentCenter);
        setCurrentCenter(programmaticCenter);
    }
    if (programmaticZoom !== currentZoom) {
        console.log("[MapView useEffect] New Programmatic Zoom triggers state update. New:", programmaticZoom, "Current:", currentZoom);
        setCurrentZoom(programmaticZoom);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [programmaticCenter, programmaticZoom]); 


  const handleCenterChanged = useCallback((ev: CustomEvent<{center: google.maps.LatLngLiteral}>) => {
      if (ev.detail && ev.detail.center) {
        const newCenter = ev.detail.center;
        console.log("[MapView handleCenterChanged] User changed center to:", newCenter);
        setCurrentCenter(newCenter);
      }
  }, []);

  const handleZoomChanged = useCallback((ev: CustomEvent<{zoom: number; center?: google.maps.LatLngLiteral }>) => {
      if (ev.detail && typeof ev.detail.zoom === 'number') {
          const newZoom = ev.detail.zoom;
          console.log("[MapView handleZoomChanged] User changed zoom to:", newZoom);
          setCurrentZoom(newZoom);
          if (ev.detail.center) { 
            setCurrentCenter(ev.detail.center);
          }
      }
  }, []);

  console.log(`[MapView] Rendering Map with controlled zoom: ${currentZoom}, controlled center: lat: ${currentCenter.lat}, lng: ${currentCenter.lng}`);

  if (!API_KEY) {
    return (
      <Card className="mt-4 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Map View Unavailable</CardTitle>
          <CardDescription>Google Maps API Key is not configured. Please set <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file and restart your server.</CardDescription>
        </CardHeader>
        <CardContent>
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
                Please set this variable in your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file and restart your server.
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
                center={currentCenter}
                zoom={currentZoom}
                onCenterChanged={handleCenterChanged}
                onZoomChanged={handleZoomChanged}
                mapId={MAP_ID}
                gestureHandling="auto" 
                className="h-full w-full"
                mapTypeControl={false}
                streetViewControl={false}
                zoomControl={true}
                fullscreenControl={true}
                disableDefaultUI={false} 
              >
                {visibleUsers.map(user => { // Iterate over visibleUsers
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
        {!isLoading && allOnlineUsers.length === 0 && API_KEY && ( // Check allOnlineUsers for "no one online" message
             <p className="text-sm text-muted-foreground mt-4 text-center">
                No users currently online with location data to display on the map.
            </p>
        )}
        {!isLoading && allOnlineUsers.length > 0 && visibleUsers.length === 0 && API_KEY && ( // Check visibleUsers for "no one matches filter/privacy"
            <p className="text-sm text-muted-foreground mt-4 text-center">
                No users match your current filters or meet the visibility criteria for your view.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
    

    

    

