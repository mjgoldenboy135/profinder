"use client";

import { useState, useEffect, useMemo } from "react";
import UserListItem from "@/components/users/UserListItem";
import UserFilters from "@/components/users/UserFilters";
import { placeholderUsers } from "@/lib/placeholder-data";
import type { User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users as UsersIcon } from "lucide-react";

// Define a type for filters for better type safety
interface Filters {
  searchTerm: string;
  profession: string;
  experience: string; // e.g., "0-2", "3-5"
  location: string;
  onlineOnly: boolean;
}

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    profession: "",
    experience: "",
    location: "",
    onlineOnly: false,
  });

  useEffect(() => {
    // Simulate fetching users - in a real app, this would be an API call
    setUsers(placeholderUsers);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchTermMatch = filters.searchTerm.toLowerCase() === "" ||
        user.fullName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (user.profession && user.profession.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (user.bio && user.bio.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const professionMatch = filters.profession === "" || user.profession === filters.profession;
      
      const locationMatch = filters.location === "" || 
        (user.location?.address && user.location.address.toLowerCase().includes(filters.location.toLowerCase()));

      const onlineMatch = !filters.onlineOnly || user.isOnline;

      const experienceMatch = filters.experience === "" || (user.yearsOfExperience !== undefined && (
        (filters.experience === "0-2" && user.yearsOfExperience >= 0 && user.yearsOfExperience <= 2) ||
        (filters.experience === "3-5" && user.yearsOfExperience >= 3 && user.yearsOfExperience <= 5) ||
        (filters.experience === "6-10" && user.yearsOfExperience >= 6 && user.yearsOfExperience <= 10) ||
        (filters.experience === "10+" && user.yearsOfExperience > 10)
      ));

      return searchTermMatch && professionMatch && locationMatch && onlineMatch && experienceMatch;
    });
  }, [users, filters]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold font-headline mb-2 text-primary">Discover Professionals</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Find and connect with other users on Proximity Network.
      </p>
      
      <UserFilters onFilterChange={handleFilterChange} initialFilters={filters} />

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <UserListItem key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <Alert className="mt-8">
          <UsersIcon className="h-4 w-4" />
          <AlertTitle>No Users Found</AlertTitle>
          <AlertDescription>
            No users match your current filter criteria. Try adjusting your filters or check back later.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
