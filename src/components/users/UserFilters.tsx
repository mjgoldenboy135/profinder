"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, FilterX } from "lucide-react";
import { placeholderUsers } from "@/lib/placeholder-data"; // To get unique professions, etc. for filters

interface UserFiltersProps {
  onFilterChange: (filters: any) => void; // Replace 'any' with a proper filter type
  initialFilters: any; // Replace 'any'
}

const uniqueProfessions = Array.from(new Set(placeholderUsers.map(u => u.profession).filter(Boolean)));
const experienceRanges = [
  { label: "Any Experience", value: "" },
  { label: "0-2 years", value: "0-2" },
  { label: "3-5 years", value: "3-5" },
  { label: "6-10 years", value: "6-10" },
  { label: "10+ years", value: "10+" },
];

export default function UserFilters({ onFilterChange, initialFilters }: UserFiltersProps) {
  // In a real app, filters would be managed with useState and useEffect
  // For this scaffold, we'll make them uncontrolled or controlled via props.

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onFilterChange({ ...initialFilters, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    onFilterChange({ ...initialFilters, [name]: value });
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    onFilterChange({ ...initialFilters, [name]: checked });
  };

  const clearFilters = () => {
    onFilterChange({
      searchTerm: "",
      profession: "",
      experience: "",
      location: "",
      onlineOnly: false,
    });
  };

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
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
          <Select name="profession" value={initialFilters.profession} onValueChange={(value) => handleSelectChange("profession", value)}>
            <SelectTrigger id="profession">
              <SelectValue placeholder="Any Profession" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Profession</SelectItem>
              {uniqueProfessions.map(prof => (
                <SelectItem key={prof} value={prof!}>{prof}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="experience">Years of Experience</Label>
          <Select name="experience" value={initialFilters.experience} onValueChange={(value) => handleSelectChange("experience", value)}>
            <SelectTrigger id="experience">
              <SelectValue placeholder="Any Experience" />
            </SelectTrigger>
            <SelectContent>
              {experienceRanges.map(range => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Location filter could be a text input for city/country or more advanced */}
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
