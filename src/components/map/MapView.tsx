
"use client";

import { APIProvider, Map, AdvancedMarker, useMap, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
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
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || "";
const ALL_PROFESSIONS_FILTER_VALUE = "__ANY_PROFESSION__";
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 15;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco

// Add console logs for debugging on the deployed site
if (typeof window !== 'undefined') {
  console.log('[MapView] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY available on client:', !!API_KEY);
  // Do not log the raw ID unless necessary for deep debugging.
  // Instead, confirm it's being evaluated.
  const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || "";
  console.log(`[MapView] Raw NEXT_PUBLIC_GOOGLE_MAPS_ID from env: ${rawMapId.substring(0,10)}...`);
  console.log(`[MapView] Evaluated MAP_ID for <Map> component: ${MAP_ID.substring(0,10)}...`);
}

const MapController = ({ targetUserId, targetLatParam, targetLngParam, allOnlineUsers }: {
  targetUserId: string | null;
  targetLatParam: string | null;
  targetLngParam: string | null;
  allOnlineUsers: User[];
}) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
        // Trigger a resize event to ensure the map fits its container, especially on first load or refresh.
        // The timeout gives the browser a moment to finalize layout calculations.
        setTimeout(() => {
            google.maps.event.trigger(map, 'resize');
        
            const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
            if (targetLatParam && targetLngParam) {
                const lat = parseFloat(targetLatParam);
                const lng = parseFloat(targetLngParam);
                if (!isNaN(lat) && !isNaN(lng)) {
                    map.panTo({ lat, lng });
                    map.setZoom(FOCUSED_ZOOM);
                }
            } else if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
                map.panTo({ lat: targetUser.location.lat, lng: targetUser.location.lng });
                map.setZoom(FOCUSED_ZOOM);
            } else {
                // If no target user, we can gently pan to the map's current center to ensure it's correct.
                map.panTo(map.getCenter()!);
            }
        }, 100); // 100ms delay can be adjusted if needed
    }
  }, [map, targetUserId, targetLatParam, targetLngParam, allOnlineUsers]);

  return null;
}

export default function MapView() {
  const [allOnlineUsers, setAllOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>(ALL_PROFESSIONS_FILTER_VALUE);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);
  const { currentUser } = useAuthContext();

  const targetUserId = searchParams.get('userId');
  const targetLatParam = searchParams.get('lat');
  const targetLngParam = searchParams.get('lng');

  useEffect(() => {
    if (!API_KEY) {
      console.warn("[MapView] Google Maps API Key is missing. Map functionality will be disabled.");
      setIsLoading(false);
      return;
    }
    if (!MAP_ID) {
      console.warn("[MapView] Google Maps Map ID is missing. Advanced Markers may not function.");
      // We don't stop loading, but the UI will show an error message.
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
  

  const renderErrorCard = (title: string, description: string, children: React.ReactNode) => (
      <Card className="mt-4 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Needed</AlertTitle>
                <UILabelAlertDescription>
                    {children}
                </UILabelAlertDescription>
            </Alert>
            <div className="mt-4 p-4 border rounded-md bg-muted min-h-[400px] flex flex-col items-center justify-center text-center">
                <MapPinIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-foreground mb-1">Map Placeholder</p>
                <p className="text-muted-foreground">The interactive map is disabled until the configuration is fixed.</p>
            </div>
        </CardContent>
      </Card>
  );

  if (!API_KEY) {
    return renderErrorCard(
        "Map Configuration Required",
        "The Google Maps API Key is missing.",
        <>
            <p className="font-bold">For Local Development:</p>
            <p className="mb-2">Create a <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in your project root and add the line: <code className="bg-muted px-1 py-0.5 rounded block mt-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code></p>
            <p className="font-bold">For the Deployed Site:</p>
            <p>Ensure the <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> secret is correctly set in your Firebase App Hosting backend configuration.</p>
        </>
    );
  }

  if (!MAP_ID) {
    return renderErrorCard(
        "Map Configuration Required",
        "The Google Maps Map ID is missing. User avatars cannot be shown without it.",
        <>
            <p className="font-bold">For Local Development:</p>
            <p className="mb-2">In your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file, add the line: <code className="bg-muted px-1 py-0.5 rounded block mt-1">NEXT_PUBLIC_GOOGLE_MAPS_ID=YOUR_MAP_ID_HERE</code></p>
            <p className="font-bold">For the Deployed Site:</p>
            <p>Ensure the <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_ID</code> secret is correctly set in your Firebase App Hosting backend configuration. This is a separate secret from the API Key.</p>
        </>
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
        {isLoading ? (
          <div className="h-[600px] w-full rounded-md border flex flex-col items-center justify-center bg-muted">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading map and live user data...</p>
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-md overflow-hidden border">
            <APIProvider apiKey={API_KEY}>
              <Map
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
                 <MapController 
                    targetUserId={targetUserId}
                    targetLatParam={targetLatParam}
                    targetLngParam={targetLngParam}
                    allOnlineUsers={allOnlineUsers}
                 />
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
