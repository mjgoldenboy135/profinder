"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { getOnlineUsersWithLocation } from "@/services/userService";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

// Leaflet needs to recompute its size when the map container resizes (e.g.
// entering/leaving fullscreen), otherwise tiles render in the wrong place.
function ResizeHandler({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 15;

const PROFESSION_COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#16a085',
  '#2980b9', '#8e44ad', '#c0392b', '#d35400', '#1abc9c',
  '#3498db', '#9b59b6', '#2c3e50', '#e91e63', '#ff5722',
];

function getProfessionColor(profession?: string): string {
  if (!profession) return '#64748b';
  let hash = 0;
  for (let i = 0; i < profession.length; i++) {
    hash = profession.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROFESSION_COLORS[Math.abs(hash) % PROFESSION_COLORS.length];
}

const createAvatarIcon = (fullName: string, profession?: string, profilePicUrl?: string) => {
  const color = getProfessionColor(profession);
  const firstLetter = (fullName?.[0] || '?').toUpperCase();
  const safeProfession = profession
    ? profession.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";

  const circleStyle = `width:42px;height:42px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  const avatarHtml = profilePicUrl
    ? `<img src="${profilePicUrl}" style="${circleStyle}object-fit:cover;" onerror="this.outerHTML='<div style=&quot;${circleStyle}background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:700;&quot;>${firstLetter}</div>'" />`
    : `<div style="${circleStyle}background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:700;">${firstLetter}</div>`;

  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;">
        ${avatarHtml}
        ${safeProfession ? `<span style="margin-top:4px;background:${color};color:white;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,0.25);">${safeProfession}</span>` : ""}
      </div>
    `,
    className: "",
    iconSize: [90, 68],
    iconAnchor: [45, 68],
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
  allOnlineUsers: UserProfile[];
}) => {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    hasCenteredRef.current = false;
  }, [targetUserId, targetLatParam, targetLngParam]);

  useEffect(() => {
    if (!map || hasCenteredRef.current) return;

    const targetUser = allOnlineUsers.find((u) => String(u.id) === targetUserId);

    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], FOCUSED_ZOOM);
        hasCenteredRef.current = true;
      }
    } else if (targetUser?.lat != null && targetUser?.lng != null) {
      map.setView([targetUser.lat, targetUser.lng], FOCUSED_ZOOM);
      hasCenteredRef.current = true;
    } else if (!targetUserId) {
      hasCenteredRef.current = true;
    }
  }, [map, targetUserId, targetLatParam, targetLngParam, allOnlineUsers]);

  return null;
};

export default function MapView() {
  const [allOnlineUsers, setAllOnlineUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { currentUser } = useAuthContext();

  const targetUserId = searchParams.get("userId");
  const targetLatParam = searchParams.get("lat");
  const targetLngParam = searchParams.get("lng");

  // Exit fullscreen with the Escape key.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const users = await getOnlineUsersWithLocation();
        setAllOnlineUsers(users);
      } catch (error) {
        console.error("[MapView] Error fetching online users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    // Poll every 30 seconds for updated user locations
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleUsers = useMemo(() => {
    return allOnlineUsers.filter((user) => {
      const professionMatch =
        selectedProfession.trim() === "" ||
        (user.profession &&
          user.profession.toLowerCase().includes(selectedProfession.toLowerCase()));
      if (!professionMatch) return false;

      const visibility = user.location_visibility || "public";
      if (visibility === "public") return true;
      if (visibility === "none") return false;
      // For "favorites" visibility - show if current user is in their favorites
      // This would require server-side filtering; for now show all favorites-visible users
      if (visibility === "favorites") return true;
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
    const targetUser = allOnlineUsers.find((u) => String(u.id) === targetUserId);
    if (targetLatParam && targetLngParam) {
      const lat = parseFloat(targetLatParam);
      const lng = parseFloat(targetLngParam);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if (targetUser?.lat != null && targetUser?.lng != null) {
      return { lat: targetUser.lat, lng: targetUser.lng };
    }
    if (
      visibleUsers.length > 0 &&
      visibleUsers[0].lat != null &&
      visibleUsers[0].lng != null
    ) {
      return { lat: visibleUsers[0].lat, lng: visibleUsers[0].lng };
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
              See who&apos;s online and nearby. Your view is based on user privacy settings. Click marker for profile.
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
          <div
            className={cn(
              "relative w-full overflow-hidden border",
              isFullscreen
                ? "fixed inset-0 z-[2000] h-screen w-screen rounded-none"
                : "h-[600px] rounded-md"
            )}
          >
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => setIsFullscreen((f) => !f)}
              className="absolute top-2 right-2 z-[1001] shadow-md"
              aria-label={isFullscreen ? "Exit fullscreen" : "View map fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "View map fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
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
              <ResizeHandler trigger={isFullscreen} />

              {visibleUsers.map((user) => {
                if (user.lat == null || user.lng == null) return null;
                const icon = createAvatarIcon(
                  user.full_name || '',
                  user.profession,
                  user.profile_picture_url || undefined
                );
                return (
                  <Marker
                    key={user.id}
                    position={[user.lat, user.lng]}
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
