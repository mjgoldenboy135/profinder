
"use client";

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore"; 
import { MapPin as MapPinIcon, Loader2, AlertTriangle } from "lucide-react"; 
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription as UILabelAlertDescription } from "@/components/ui/alert"; // Renamed AlertDescription to avoid conflict

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;
const MAP_ID = rawMapId && rawMapId.trim() !== "" ? rawMapId.trim() : undefined;

if (typeof window !== 'undefined') {
  console.log('[MapView] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY available:', !!API_KEY);
  console.log('[MapView] Raw NEXT_PUBLIC_GOOGLE_MAPS_ID from env:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID);
  console.log('[MapView] Evaluated MAP_ID for <Map> component:', MAP_ID);
}


export default function MapView() {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();

  useEffect(() => {
    if (!API_KEY) {
      console.warn("[MapView] Google Maps API Key is missing. Map functionality will be disabled.");
      setIsLoading(false);
      return;
    }
    if (!MAP_ID) {
        console.warn("[MapView] Google Maps ID (NEXT_PUBLIC_GOOGLE_MAPS_ID) is missing. Advanced Markers (user avatars) may not function correctly.");
        // setIsLoading(false); // Still load users, map will show warning
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
      console.log(`[MapView] Fetched real-time users (${fetchedUsers.length}):`, fetchedUsers.map(u => ({id: u.id, name: u.fullName, loc: u.location}) ));
    }, (error) => {
      console.error("[MapView] Error fetching real-time online users:", error);
      setIsLoading(false);
    });

    return () => {
      console.log("[MapView] Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, []); 

  const defaultCenter = { lat: 37.7749, lng: -122.4194 }; 
  const mapCenter = onlineUsers.length > 0 && onlineUsers[0].location 
                    ? { lat: onlineUsers[0].location.lat, lng: onlineUsers[0].location.lng } 
                    : defaultCenter;

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
        <CardTitle className="text-3xl font-headline">Network Map</CardTitle>
        <CardDescription>
          See who's online and nearby. Click on an avatar to view their profile.
          {!MAP_ID && API_KEY && (
            <span className="block text-destructive text-xs mt-1">Note: Map ID is missing, user avatars (Advanced Markers) may not display correctly.</span>
          )}
        </CardDescription>
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
                center={mapCenter} 
                defaultZoom={9} 
                mapId={MAP_ID} 
                gestureHandling="greedy" 
                className="h-full w-full"
                mapTypeControl={false}
                streetViewControl={false}
              >
                {onlineUsers.map(user => (
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
            <p className="text-sm text-muted-foreground mt-4 text-center">No users currently online with location data to display on the map.</p>
        )}
      </CardContent>
    </Card>
  );
}
