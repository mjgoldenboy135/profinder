"use client";

// import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
// Note: @vis.gl/react-google-maps and an API key would be needed for a real map.
// This is a placeholder component.

import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "../ui/button";
import { placeholderUsers } from "@/lib/placeholder-data"; // For demo
import { useState, useEffect } from "react";


// const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
// const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || ""; // Optional custom map ID

export default function MapView() {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    // Simulate fetching online users with location data
    setOnlineUsers(placeholderUsers.filter(u => u.isOnline && u.location));
  }, []);

  // Default center if no users or API key
  const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco
  const mapCenter = onlineUsers.length > 0 && onlineUsers[0].location ? onlineUsers[0].location : defaultCenter;

  // if (!API_KEY) {
  //   return (
  //     <Card className="mt-4">
  //       <CardHeader>
  //         <CardTitle>Map View Unavailable</CardTitle>
  //         <CardDescription>Google Maps API Key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</CardDescription>
  //       </CardHeader>
  //       <CardContent>
  //         <p>Map functionality is disabled. The map would display online users here.</p>
  //          <div className="mt-4 p-4 border rounded-md bg-muted min-h-[400px] flex items-center justify-center">
  //           <MapPin className="h-16 w-16 text-muted-foreground" />
  //           <p className="ml-4 text-muted-foreground">Map Placeholder: API Key Required</p>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Network Map</CardTitle>
        <CardDescription>See who's online and nearby. Click on a marker to view their profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] w-full rounded-md overflow-hidden border bg-muted flex items-center justify-center">
          {/* Placeholder for @vis.gl/react-google-maps integration */}
          {/* <APIProvider apiKey={API_KEY}>
            <Map defaultCenter={mapCenter} defaultZoom={9} mapId={MAP_ID} gestureHandling="greedy" className="h-full w-full">
              {onlineUsers.map(user => (
                user.location && (
                  <AdvancedMarker
                    key={user.id}
                    position={user.location}
                    title={user.fullName}
                    // onClick={() => router.push(`/users/${user.id}`)} - Requires router from next/navigation
                  >
                    <div className="p-2 bg-background rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2">
                      <Link href={`/users/${user.id}`}>
                        <Avatar className="h-10 w-10 border-2 border-primary cursor-pointer">
                          <AvatarImage src={user.profilePictureUrl || `https://placehold.co/40x40.png?text=${user.fullName[0]}`} alt={user.fullName} />
                          <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                    </div>
                  </AdvancedMarker>
                )
              ))}
            </Map>
          </APIProvider> */}
          <div className="text-center text-muted-foreground">
            <MapPin className="h-24 w-24 mx-auto mb-4" />
            <p className="text-lg font-semibold">Map Integration Placeholder</p>
            <p className="text-sm">
              The interactive map showing online users would be displayed here.
            </p>
            <p className="text-xs mt-2">(Requires Google Maps API setup)</p>
            {onlineUsers.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Demo: Online Users (List View)</h4>
                <ul className="text-left max-w-sm mx-auto space-y-2">
                {onlineUsers.slice(0,3).map(user => (
                  <li key={user.id} className="p-2 border rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={user.profilePictureUrl || `https://placehold.co/32x32.png?text=${user.fullName[0]}`} alt={user.fullName} />
                        <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <span>{user.fullName} ({user.location?.address || 'Unknown location'})</span>
                    </div>
                    <Button variant="link" size="sm" asChild><Link href={`/users/${user.id}`}>View</Link></Button>
                  </li>
                ))}
                {onlineUsers.length > 3 && <li className="text-center text-sm">...and {onlineUsers.length - 3} more.</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
