
"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Define a loading component to show while the map is loading
function MapLoadingFallback() {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Network Map</CardTitle>
        <CardDescription>
          See who's online and nearby. Your view is based on user privacy settings. Click marker for profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] w-full rounded-md border flex flex-col items-center justify-center bg-muted">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading map and live user data...</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Dynamically import the MapView component with server-side rendering (SSR) disabled.
// This is the key change to fix the build error.
const MapViewWithNoSSR = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});


export default function MapPage() {
  return (
    <div className="py-8">
      <MapViewWithNoSSR />
    </div>
  );
}
