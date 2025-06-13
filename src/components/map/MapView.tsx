
"use client";

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { MapPin as MapPinIcon, Loader2, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription as UILabelAlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>(ALL_PROFESSIONS_FILTER_VALUE);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);

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
    const q = query(usersRef, where("isOnline", "==", true));

    const unsubscribe: Unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        if (userData.location && userData.location.lat != null && userData.location.lng != null) {
          fetchedUsers.push(userData);
        } else {
          console.log(`[MapView] User ${userData.id} is online but missing valid location data.`, userData.location);
        }
      });
      setOnlineUsers(fetchedUsers);
      setIsLoading(false);
      console.log(`[MapView] Fetched real-time users (${fetchedUsers.length}):`, fetchedUsers.map(u => ({id: u.id, name: u.fullName, loc: u.location, prof: u.profession}) ));
    }, (error) => {
      console.error("[MapView] Error fetching real-time online users:", error);
      setIsLoading(false);
    });

    return () => {
      console.log("[MapView] Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (onlineUsers.length > 0) {
      const professions = new Set(
        onlineUsers.map(user => user.profession).filter(Boolean) as string[]
      );
      setAvailableProfessions(Array.from(professions).sort());
    } else {
      setAvailableProfessions([]);
    }
  }, [onlineUsers]);

  const filteredUsers = useMemo(() => {
    console.log('[MapView useMemo filteredUsers] Filtering users. Selected profession:', selectedProfession, 'Online users count:', onlineUsers.length);
    return onlineUsers.filter(user => {
        if (selectedProfession === ALL_PROFESSIONS_FILTER_VALUE) {
            return true;
        }
        return user.profession === selectedProfession;
    });
  }, [onlineUsers, selectedProfession]);

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
      const targetUser = onlineUsers.find(u => u.id === targetUserId);
      if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
        console.log('[MapView useMemo programmaticCenter] Using targetUser location:', { lat: targetUser.location.lat, lng: targetUser.location.lng });
        return { lat: targetUser.location.lat, lng: targetUser.location.lng };
      }
    }
    if (selectedProfession !== ALL_PROFESSIONS_FILTER_VALUE && filteredUsers.length > 0 && filteredUsers[0].location?.lat != null && filteredUsers[0].location?.lng != null) {
      console.log('[MapView useMemo programmaticCenter] Using first filteredUser (profession selected) location.');
      return { lat: filteredUsers[0].location.lat, lng: filteredUsers[0].location.lng };
    }
    if (onlineUsers.length > 0 && onlineUsers[0].location?.lat != null && onlineUsers[0].location?.lng != null) {
      console.log('[MapView useMemo programmaticCenter] Using first onlineUser location (default/no filter).');
      return { lat: onlineUsers[0].location.lat, lng: onlineUsers[0].location.lng };
    }
    console.log('[MapView useMemo programmaticCenter] Using DEFAULT_CENTER.');
    return DEFAULT_CENTER;
  }, [targetLatParam, targetLngParam, targetUserId, onlineUsers, selectedProfession, filteredUsers]);

  const programmaticZoom = useMemo(() => {
    console.log('[MapView useMemo programmaticZoom] targetLatParam:', targetLatParam, 'targetLngParam:', targetLngParam, 'targetUserId:', targetUserId);
    if (targetLatParam && targetLngParam) {
        console.log('[MapView useMemo programmaticZoom] Setting FOCUSED_ZOOM due to lat/lng params.');
        return FOCUSED_ZOOM;
    }
    if (targetUserId) {
      const targetUser = onlineUsers.find(u => u.id === targetUserId);
      if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
        console.log('[MapView useMemo programmaticZoom] Setting FOCUSED_ZOOM due to targetUserId.');
        return FOCUSED_ZOOM;
      }
    }
    console.log('[MapView useMemo programmaticZoom] Setting DEFAULT_ZOOM.');
    return DEFAULT_ZOOM;
  }, [targetLatParam, targetLngParam, targetUserId, onlineUsers]);

  const [currentCenter, setCurrentCenter] = useState(programmaticCenter);
  const [currentZoom, setCurrentZoom] = useState(programmaticZoom);

  useEffect(() => {
    console.log("[MapView useEffect] Programmatic center/zoom dependencies changed. Updating map state if necessary.");
    // Update currentCenter only if programmaticCenter has actually changed
    if (programmaticCenter.lat !== currentCenter.lat || programmaticCenter.lng !== currentCenter.lng) {
        console.log("[MapView useEffect] New Programmatic Center:", programmaticCenter, "Current Center:", currentCenter);
        setCurrentCenter(programmaticCenter);
    }
    // Update currentZoom only if programmaticZoom has actually changed
    if (programmaticZoom !== currentZoom) {
        console.log("[MapView useEffect] New Programmatic Zoom:", programmaticZoom, "Current Zoom:", currentZoom);
        setCurrentZoom(programmaticZoom);
    }
  }, [programmaticCenter, programmaticZoom]); // currentCenter and currentZoom removed from deps to avoid loops

  const handleCenterChanged = (ev: CustomEvent<{center: google.maps.LatLngLiteral}>) => {
      if (ev.detail && ev.detail.center) {
        console.log("[MapView handleCenterChanged] User changed center to:", ev.detail.center);
        setCurrentCenter(ev.detail.center);
      }
  };

  const handleZoomChanged = (ev: CustomEvent<{zoom: number; center?: google.maps.LatLngLiteral }>) => {
      if (ev.detail && typeof ev.detail.zoom === 'number') {
          console.log("[MapView handleZoomChanged] User changed zoom to:", ev.detail.zoom);
          setCurrentZoom(ev.detail.zoom);
          // Optionally, update center if provided by zoom event, though onCenterChanged should also fire
          // if (ev.detail.center) {
          //   setCurrentCenter(ev.detail.center);
          // }
      }
  };

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
                See who's online and nearby. Use the filter to view by profession. Click on a marker to view profile.
                </CardDescription>
            </div>
            { (availableProfessions.length > 0 || onlineUsers.length > 0) && (
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
                {filteredUsers.map(user => (
                  user.location && user.location.lat != null && user.location.lng != null ? (
                    <AdvancedMarker
                        key={user.id}
                        position={{ lat: user.location.lat, lng: user.location.lng }}
                        title={user.fullName}
                        onClick={() => router.push(`/users/${user.id}`)}
                    >
                        <div className="p-1 bg-background rounded-full shadow-lg transform transition-transform hover:scale-110 cursor-pointer">
                            <Avatar className="h-10 w-10 border-2 border-primary">
                            <AvatarImage src={user.profilePictureUrl || `https://placehold.co/40x40.png?text=${user.fullName?.[0]}`} alt={user.fullName} />
                            <AvatarFallback>{user.fullName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                        </div>
                    </AdvancedMarker>
                  ) : null
                ))}
              </Map>
            </APIProvider>
          </div>
        )}
        {!isLoading && onlineUsers.length === 0 && API_KEY && (
             <p className="text-sm text-muted-foreground mt-4 text-center">
                No users currently online with location data to display on the map.
            </p>
        )}
        {!isLoading && onlineUsers.length > 0 && filteredUsers.length === 0 && selectedProfession !== ALL_PROFESSIONS_FILTER_VALUE && API_KEY && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
                No users found for the selected profession: "{selectedProfession}". Try "All Professions".
            </p>
        )}
      </CardContent>
    </Card>
  );
}
