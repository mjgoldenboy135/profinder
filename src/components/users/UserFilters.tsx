
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, FilterX } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { AVAILABILITY_OPTIONS, professionLabel } from "@/lib/types";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserFiltersProps {
  onFilterChange: (filters: any) => void; // Replace 'any' with a proper filter type
  initialFilters: any; // Replace 'any'
  users: UserProfile[];
}

const ANY_PROFESSION_VALUE = "__ANY_PROFESSION__";
const ANY_AVAILABILITY_VALUE = "__ANY_AVAILABILITY__";


export default function UserFilters({ onFilterChange, initialFilters, users }: UserFiltersProps) {
  const router = useRouter();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const uniqueProfessions = useMemo(() => {
    if (!users || users.length === 0) return [];
    // Filter out undefined/null professions and then get unique values
    return Array.from(new Set(users.map(u => u.profession).filter((p): p is string => Boolean(p))));
  }, [users]);

  // People matching the typed text (name / profession / company), rendered as
  // an on-page suggestion dropdown like the map search. Capped for readability.
  const suggestions = useMemo(() => {
    const q = (initialFilters.searchTerm || "").trim().toLowerCase();
    if (!q) return [];
    return (users || [])
      .filter((u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.profession?.toLowerCase().includes(q) ||
        u.company?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [users, initialFilters.searchTerm]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onFilterChange({ ...initialFilters, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    let processedValue = value;
    if (name === "profession" && value === ANY_PROFESSION_VALUE) {
      processedValue = "";
    }
    if (name === "availability" && value === ANY_AVAILABILITY_VALUE) {
      processedValue = "";
    }
    onFilterChange({ ...initialFilters, [name]: processedValue });
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    onFilterChange({ ...initialFilters, [name]: checked });
  };

  const clearFilters = () => {
    onFilterChange({
      searchTerm: "",
      profession: "",
      availability: "",
      location: "",
      onlineOnly: false,
    });
  };

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <div className="lg:col-span-2" ref={searchBoxRef}>
          <Label htmlFor="searchTerm">Search by Name/Keyword</Label>
          <div className="relative">
            <Input
              id="searchTerm"
              name="searchTerm"
              placeholder="e.g., John Doe, Developer"
              value={initialFilters.searchTerm}
              onChange={(e) => { handleInputChange(e); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg z-50"
              >
                {suggestions.map((u) => {
                  const role = professionLabel(u.profession, u.company);
                  return (
                    <li key={u.id} role="option">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowSuggestions(false);
                          router.push(`/users/${u.id}`);
                        }}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="text-sm font-medium">{u.full_name}</span>
                        {role && <span className="text-xs text-muted-foreground">{role}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="profession">Profession</Label>
          <Select 
            name="profession" 
            value={initialFilters.profession || ANY_PROFESSION_VALUE} 
            onValueChange={(value) => handleSelectChange("profession", value)}
          >
            <SelectTrigger id="profession">
              <SelectValue placeholder="Any Profession" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_PROFESSION_VALUE}>Any Profession</SelectItem>
              {uniqueProfessions.map(prof => (
                prof && <SelectItem key={prof} value={prof}>{prof}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="availability">Availability</Label>
          <Select
            name="availability"
            value={initialFilters.availability || ANY_AVAILABILITY_VALUE}
            onValueChange={(value) => handleSelectChange("availability", value)}
          >
            <SelectTrigger id="availability">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_AVAILABILITY_VALUE}>Anyone</SelectItem>
              {AVAILABILITY_OPTIONS.filter(o => o.value !== 'none').map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="e.g., San Francisco, London"
            value={initialFilters.location}
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="onlineOnly"
            checked={initialFilters.onlineOnly}
            onCheckedChange={(checked) => handleSwitchChange("onlineOnly", checked)}
          />
          <Label htmlFor="onlineOnly" className="cursor-pointer">Show Online Users Only</Label>
        </div>
        <Button variant="ghost" onClick={clearFilters} className="text-sm">
          <FilterX className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}
