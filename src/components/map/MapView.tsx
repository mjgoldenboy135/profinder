
"use client";

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { getOnlineUsersWithLocation } from "@/services/userService";
import { MapPin as MapPinIcon, Loader2 } from "lucide-react"; // Added Loader2
import { useRouter } from 'next/navigation';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;
const MAP_ID = rawMapId && rawMapId.trim() !== "" ? rawMapId.trim() : undefined;


export default function MapView() {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const users = await getOnlineUsersWithLocation();
        setOnlineUsers(users);
      } catch (error) {
        console.error("Error fetching online users with location:", error);
        // Optionally set an error state or show a toast
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco
  // Prioritize user's location if available, otherwise first online user, then default
  // This part would be better if current user's location was passed or fetched
  const mapCenter = onlineUsers.length > 0 && onlineUsers[0].location ? onlineUsers[0].location : defaultCenter;

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
        <CardDescription>See who's online and nearby. Click on an avatar to view their profile.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[600px] w-full rounded-md border flex flex-col items-center justify-center bg-muted">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading map and users...</p>
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-md overflow-hidden border">
            <APIProvider apiKey={API_KEY}>
              <Map 
                defaultCenter={mapCenter} 
                defaultZoom={9} 
                mapId={MAP_ID} // Use the MAP_ID from env, or undefined for default map
                gestureHandling="greedy" 
                className="h-full w-full"
                mapTypeControl={false}
                streetViewControl={false}
              >
                {onlineUsers.map(user => (
                  user.location && user.location.lat !== undefined && user.location.lng !== undefined && ( // Ensure lat/lng are present
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
                  )
                ))}
              </Map>
            </APIProvider>
          </div>
        )}
        {!isLoading && onlineUsers.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">No users currently online with location data to display on the map.</p>
        )}
      </CardContent>
    </Card>
  );
}

