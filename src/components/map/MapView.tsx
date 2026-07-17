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

import { MapContainer, TileLayer, Marker, Tooltip, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { professionLabel } from "@/lib/types";

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

const MAP_VIEW_STORAGE_KEY = "profinder_map_view";

type SavedView = { lat: number; lng: number; zoom: number };

export function loadSavedView(): SavedView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v.lat === "number" && typeof v.lng === "number" && typeof v.zoom === "number") {
      return v as SavedView;
    }
  } catch {}
  return null;
}

// Remembers the user's pan/zoom so a page refresh brings the map back to
// where they left it instead of the default view.
function ViewPersistence() {
  const map = useMap();
  useEffect(() => {
    const save = () => {
      try {
        const c = map.getCenter();
        sessionStorage.setItem(
          MAP_VIEW_STORAGE_KEY,
          JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })
        );
      } catch {}
    };
    map.on("moveend", save);
    map.on("zoomend", save);
    return () => {
      map.off("moveend", save);
      map.off("zoomend", save);
    };
  }, [map]);
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

// Escape any user-supplied string before it goes into the marker's innerHTML,
// so a name/profession like `"><img onerror=...>` can never inject markup.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const createAvatarIcon = (fullName: string, profession?: string, profilePicUrl?: string) => {
  const color = getProfessionColor(profession);
  const firstLetter = esc((fullName?.[0] || '?').toUpperCase());
  const safeProfession = profession ? esc(profession) : "";
  // Only allow our own picture URLs; ignore anything that isn't a plain http(s) URL.
  const safePicUrl =
    profilePicUrl && /^https?:\/\//i.test(profilePicUrl) ? esc(profilePicUrl) : "";

  const circleStyle = `width:42px;height:42px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  const avatarHtml = safePicUrl
    ? `<img src="${safePicUrl}" style="${circleStyle}object-fit:cover;" onerror="this.outerHTML='<div style=&quot;${circleStyle}background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:700;&quot;>${firstLetter}</div>'" />`
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
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
    let hasLoaded = false;
    const fetchUsers = async () => {
      // Only show the loading screen on the very first fetch. Later polls must
      // update markers silently — flipping isLoading unmounts the MapContainer
      // and resets the user's pan/zoom to the default view.
      if (!hasLoaded) setIsLoading(true);
      try {
        const users = await getOnlineUsersWithLocation();
        setAllOnlineUsers(users);
      } catch (error) {
        console.error("[MapView] Error fetching online users:", error);
      } finally {
        hasLoaded = true;
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

  // Suggestions rendered on the page (not the browser's datalist / keyboard
  // strip): case-insensitive match on the typed text, capped for readability.
  const professionSuggestions = useMemo(() => {
    const q = selectedProfession.trim().toLowerCase();
    const matches = q
      ? availableProfessions.filter((p) => p.toLowerCase().includes(q))
      : availableProfessions;
    // Hide the list if the only match is exactly what's already typed.
    if (matches.length === 1 && matches[0].toLowerCase() === q) return [];
    return matches.slice(0, 8);
  }, [availableProfessions, selectedProfession]);

  // Close the suggestion dropdown when clicking/tapping outside the search box.
  useEffect(() => {
    if (!showSuggestions) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [showSuggestions]);

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
    // No explicit target: restore where the user last left the map.
    const saved = loadSavedView();
    if (saved) return { lat: saved.lat, lng: saved.lng };
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
    if (targetLatParam && targetLngParam) return FOCUSED_ZOOM;
    const saved = loadSavedView();
    if (saved) return saved.zoom;
    return DEFAULT_ZOOM;
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
            <div ref={searchBoxRef} className="w-full sm:w-auto sm:min-w-[220px] relative z-[1000]">
              <Label htmlFor="profession-filter" className="sr-only">
                Search by Profession
              </Label>
              <Input
                id="profession-filter"
                type="text"
                inputMode="text"
                placeholder="Search profession"
                value={selectedProfession}
                onChange={(e) => {
                  setSelectedProfession(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={showSuggestions && professionSuggestions.length > 0}
                aria-controls="profession-suggestions"
                aria-autocomplete="list"
              />
              {showSuggestions && professionSuggestions.length > 0 && (
                <ul
                  id="profession-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg z-[1001]"
                >
                  {professionSuggestions.map((prof) => (
                    <li key={prof} role="option" aria-selected={prof === selectedProfession}>
                      <button
                        type="button"
                        // onMouseDown fires before the input blurs, so the click
                        // isn't lost to the outside-click handler.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedProfession(prof);
                          setShowSuggestions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {prof}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
              // Zoom control is placed at the bottom-left instead of the default
              // top-left so it sits at the bottom of the map.
              zoomControl={false}
              // Show a single world: no horizontal wrapping/copies when zoomed out.
              minZoom={2}
              maxBounds={[[-85, -180], [85, 180]]}
              maxBoundsViscosity={1.0}
              worldCopyJump={false}
            >
              <ZoomControl position="bottomleft" />
              <TileLayer
                url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}&language=en`}
                attribution="&copy; <a href='https://www.maptiler.com/copyright/'>MapTiler</a> &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                noWrap
              />
              <ResizeHandler trigger={isFullscreen} />
              <ViewPersistence />

              {visibleUsers.map((user) => {
                if (user.lat == null || user.lng == null) return null;
                // "Doctor at KGM Medical College" when a company is set, else
                // just the profession.
                const roleLabel = professionLabel(user.profession, user.company);
                const icon = createAvatarIcon(
                  user.full_name || '',
                  roleLabel,
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
                    {roleLabel && <Tooltip>{roleLabel}</Tooltip>}
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
