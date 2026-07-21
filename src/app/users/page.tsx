"use client";

import { useState, useEffect, useMemo } from "react";
import UserListItem from "@/components/users/UserListItem";
import UserFilters from "@/components/users/UserFilters";
import type { UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllUsers } from "@/services/userService";

interface Filters {
  searchTerm: string;
  profession: string;
  availability: string;
  location: string;
  onlineOnly: boolean;
}

export default function UserListPage() {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuthContext();

  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    profession: "",
    availability: "",
    location: "",
    onlineOnly: false,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const users = await getAllUsers();
        const filtered = currentUser ? users.filter(u => u.id !== currentUser.id) : users;
        setAllUsers(filtered);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      if (!user) return false;
      const searchTermMatch = !filters.searchTerm ||
        user.full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        user.profession?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        user.bio?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const professionMatch = !filters.profession || user.profession === filters.profession;
      const availabilityMatch = !filters.availability || user.availability === filters.availability;
      const locationMatch = !filters.location ||
        user.address?.toLowerCase().includes(filters.location.toLowerCase());
      const onlineMatch = !filters.onlineOnly || !!user.is_online;
      return searchTermMatch && professionMatch && availabilityMatch && locationMatch && onlineMatch;
    });
  }, [allUsers, filters]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading professionals...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold font-headline mb-2 text-primary">Discover Professionals</h1>
      <p className="text-lg text-muted-foreground mb-8">Find and connect with other users on Proximity Network.</p>
      <UserFilters onFilterChange={setFilters} initialFilters={filters} users={allUsers} />
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            user && user.id ? <UserListItem key={user.id} user={user} /> : null
          ))}
        </div>
      ) : (
        <Alert className="mt-8">
          <UsersIcon className="h-4 w-4" />
          <AlertTitle>No Users Found</AlertTitle>
          <AlertDescription>No users match your current filter criteria. Try adjusting your filters.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
