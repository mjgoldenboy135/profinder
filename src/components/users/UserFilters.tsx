
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, FilterX } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { AVAILABILITY_OPTIONS } from "@/lib/types";
import { useMemo } from "react";

interface UserFiltersProps {
  onFilterChange: (filters: any) => void; // Replace 'any' with a proper filter type
  initialFilters: any; // Replace 'any'
  users: UserProfile[];
}

const ANY_PROFESSION_VALUE = "__ANY_PROFESSION__";
const ANY_AVAILABILITY_VALUE = "__ANY_AVAILABILITY__";


export default function UserFilters({ onFilterChange, initialFilters, users }: UserFiltersProps) {
  
  const uniqueProfessions = useMemo(() => {
    if (!users || users.length === 0) return [];
    // Filter out undefined/null professions and then get unique values
    return Array.from(new Set(users.map(u => u.profession).filter((p): p is string => Boolean(p))));
  }, [users]);

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
        <div className="lg:col-span-2">
          <Label htmlFor="searchTerm">Search by Name/Keyword</Label>
          <div className="relative">
            <Input
              id="searchTerm"
              name="searchTerm"
              placeholder="e.g., John Doe, Developer"
              value={initialFilters.searchTerm}
              onChange={handleInputChange}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
