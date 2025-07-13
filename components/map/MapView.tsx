
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
import { useAuthContext } from '@/contexts/AuthContext';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;
const MAP_ID = rawMapId && rawMapId.trim() !== "" ? rawMapId.trim() : undefined;

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

    const [currentCenter, setCurrentCenter] = useState(DEFAULT_CENTER);
    const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

    const targetUserId = searchParams.get('userId');
    const targetLatParam = searchParams.get('lat');
    const targetLngParam = searchParams.get('lng');

    const mapRef = useRef<google.maps.Map | null>(null);


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


    useEffect(() => {
        const map = mapRef.current;
        if (!map) return; 

        if (targetLatParam && targetLngParam) {
            const lat = parseFloat(targetLatParam);
            const lng = parseFloat(targetLngParam);
            if (!isNaN(lat) && !isNaN(lng)) {
                map.setCenter({ lat, lng });
                map.setZoom(FOCUSED_ZOOM);
                return;
            }
        }
        if (targetUserId) {
            const targetUser = allOnlineUsers.find(u => u.id === targetUserId);
            if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
                map.setCenter(targetUser.location);
                map.setZoom(FOCUSED_ZOOM);
                return;
            }
        }

        if (visibleUsers.length > 1) {
            const bounds = new window.google.maps.LatLngBounds();
            visibleUsers.forEach(user => {
                if (user.location?.lat != null && user.location?.lng != null) {
                    bounds.extend(user.location);
                }
            });
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, 100);
            }
        } else if (visibleUsers.length === 1) {
            const user = visibleUsers[0];
            if (user.location?.lat != null && user.location?.lng != null) {
                map.setCenter(user.location);
                map.setZoom(FOCUSED_ZOOM);
            }
        } else {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(DEFAULT_ZOOM);
        }
    }, [visibleUsers, allOnlineUsers, targetUserId, targetLatParam, targetLngParam]);


    const handleCenterChanged = useCallback((ev: CustomEvent<{ center: google.maps.LatLngLiteral }>) => {
        if (ev.detail && ev.detail.center) {
            setCurrentCenter(ev.detail.center);
        }
    }, []);

    const handleZoomChanged = useCallback((ev: CustomEvent<{ zoom: number; center?: google.maps.LatLngLiteral }>) => {
        if (ev.detail && typeof ev.detail.zoom === 'number') {
            setCurrentZoom(ev.detail.zoom);
            if (ev.detail.center) {
                setCurrentCenter(ev.detail.center);
            }
        }
    }, []);


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
                            <p>Ensure the API key is correctly set in your <code className="bg-muted px-1 py-0.5 rounded">apphosting.yaml</code> file and that the change has been successfully deployed. Check your GitHub repository and Firebase Console deployment status.</p>
                        </UILabelAlertDescription>
                    </Alert>
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
                    {(availableProfessions.length > 0 || allOnlineUsers.length > 0) && (
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
                          onLoad={(map) => { mapRef.current = map; }}
                          center={currentCenter}
                          zoom={currentZoom}
                          onCenterChanged={handleCenterChanged}
                          onZoomChanged={handleZoomChanged}
                          mapId={MAP_ID}
                          gestureHandling="greedy"
                          style={{ width: '100%', height: '100%' }}   // ✅ use style instead of className
                          zoomControl={true}
                          fullscreenControl={true}
                          mapTypeControl={false}
                          streetViewControl={false}
                          disableDefaultUI={false}
                        />
{/*                             <Map
                                onLoad={map => { mapRef.current = map; }}
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
                            > */}
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
                                                        style={{ pointerEvents: 'none' }}
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
