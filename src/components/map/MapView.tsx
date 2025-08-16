"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 15;

const createAvatarIcon = (src: string, fallback: string, profession?: string) => {
  const safeProfession = profession
    ? profession
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    : "";
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;">
        <img src="${src}" alt="${fallback}" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--primary, #3b82f6);box-shadow:0 0 4px rgba(0,0,0,0.3);" />
        ${safeProfession ? `<span style="margin-top:4px;background:white;padding:2px 4px;border-radius:4px;font-size:12px;line-height:1;">${safeProfession}</span>` : ""}
      </div>
    `,
    className: "", // clear default styles
    iconSize: [80, 60],
    iconAnchor: [40, 60],
  });
};

const MapController = ({
  targetUserId,
  targetLatParam,
  targetLngParam,
  allOnlineUsers,
}: {
  targetUserId: string | null;
  targetLatParam: string | null;
  targetLngParam: string | null;
  allOnlineUsers: User[];
}) => {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    hasCenteredRef.current = false;
  }, [targetUserId, targetLatParam, targetLngParam]);

  useEffect(() => {
    if (!map || hasCenteredRef.current) return;

    const targetUser = allOnlineUsers.find((u) => u.id === targetUserId);

    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], FOCUSED_ZOOM);
        hasCenteredRef.current = true;
      }
    } else if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
      map.setView([targetUser.location.lat, targetUser.location.lng], FOCUSED_ZOOM);
      hasCenteredRef.current = true;
    } else if (!targetUserId) {
      // gently pan to current center
      hasCenteredRef.current = true;
    }
  }, [map, targetUserId, targetLatParam, targetLngParam, allOnlineUsers]);

  return null;
};

export default function MapView() {
  const [allOnlineUsers, setAllOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);
  const { currentUser } = useAuthContext();

  const targetUserId = searchParams.get("userId");
  const targetLatParam = searchParams.get("lat");
  const targetLngParam = searchParams.get("lng");

  useEffect(() => {
    setIsLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("isOnline", "==", true));

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() } as User;
          if (userData.location && userData.location.lat != null && userData.location.lng != null) {
            fetchedUsers.push(userData);
          }
        });
        setAllOnlineUsers(fetchedUsers);
        setIsLoading(false);
      },
      (error) => {
        console.error("[MapView] Error fetching real-time online users:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const visibleUsers = useMemo(() => {
    const currentMapViewerId = currentUser?.uid;
    return allOnlineUsers.filter((user) => {
      const professionMatch =
        selectedProfession.trim() === "" ||
        (user.profession &&
          user.profession.toLowerCase().includes(selectedProfession.toLowerCase()));
      if (!professionMatch) return false;

      const visibility = user.locationVisibility || "public";
      if (visibility === "public") return true;
      if (visibility === "favorites")
        return !!currentMapViewerId && !!user.favoriteUserIds?.includes(currentMapViewerId);
      if (visibility === "none") return false;
      return true;
    });
  }, [allOnlineUsers, selectedProfession, currentUser]);

  useEffect(() => {
    if (allOnlineUsers.length > 0) {
      const professions = new Set(allOnlineUsers.map((user) => user.profession).filter(Boolean) as string[]);
      setAvailableProfessions(Array.from(professions).sort());
    } else {
      setAvailableProfessions([]);
    }
  }, [allOnlineUsers]);

  const initialCenter = useMemo(() => {
    const targetUser = allOnlineUsers.find((u) => u.id === targetUserId);
    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if (targetUser?.location?.lat != null && targetUser?.location?.lng != null) {
      return { lat: targetUser.location.lat, lng: targetUser.location.lng };
    }
    if (
      visibleUsers.length > 0 &&
      visibleUsers[0].location?.lat != null &&
      visibleUsers[0].location?.lng != null
    ) {
      return { lat: visibleUsers[0].location.lat, lng: visibleUsers[0].location.lng };
    }
    return DEFAULT_CENTER;
  }, [targetLatParam, targetLngParam, targetUserId, allOnlineUsers, visibleUsers]);

  const initialZoom = useMemo(() => {
    return targetLatParam && targetLngParam ? FOCUSED_ZOOM : DEFAULT_ZOOM;
  }, [targetLatParam, targetLngParam]);

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
          {availableProfessions.length > 0 || allOnlineUsers.length > 0 ? (
            <div className="w-full sm:w-auto sm:min-w-[200px] relative z-[1000]">
              <Label htmlFor="profession-filter" className="sr-only">
                Search by Profession
              </Label>
              <Input
                id="profession-filter"
                type="search"
                placeholder="Search profession"
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                list="profession-suggestions"
              />
              <datalist id="profession-suggestions">
                {availableProfessions.map((prof) => (
                  <option key={prof} value={prof} />
                ))}
              </datalist>
            </div>
          ) : null}
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
            <MapContainer
              center={[initialCenter.lat, initialCenter.lng]}
              zoom={initialZoom}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}&language=en`}
                attribution="&copy; <a href='https://www.maptiler.com/copyright/'>MapTiler</a> &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
              />

              {visibleUsers.map((user) => {
                if (!user.location || user.location.lat == null || user.location.lng == null) return null;
                const fallbackName = user.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U";
                const avatarSrc =
                  user.profilePictureUrl || `https://placehold.co/40x40.png?text=${encodeURIComponent(fallbackName)}`;
                const icon = createAvatarIcon(avatarSrc, fallbackName, user.profession);
                return (
                  <Marker
                    key={user.id}
                    position={[user.location.lat, user.location.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => router.push(`/users/${user.id}`),
                    }}
                  >
                    {user.profession && <Tooltip>{user.profession}</Tooltip>}
                  </Marker>
                );
              })}

              <MapController
                targetUserId={targetUserId}
                targetLatParam={targetLatParam}
                targetLngParam={targetLngParam}
                allOnlineUsers={allOnlineUsers}
              />
            </MapContainer>
          </div>
        )}
        {!isLoading && allOnlineUsers.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            No users currently online with location data to display on the map.
          </p>
        )}
        {!isLoading && allOnlineUsers.length > 0 && visibleUsers.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            No users match your current filters or meet the visibility criteria for your view.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

