
"use client";

import { useState, useEffect, useMemo } from "react";
import UserListItem from "@/components/users/UserListItem";
import UserFilters from "@/components/users/UserFilters";
import type { User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useAuthContext } from "@/contexts/AuthContext";

// Define a type for filters for better type safety
interface Filters {
  searchTerm: string;
  profession: string;
  // experience: string; // Removed experience
  location: string;
  onlineOnly: boolean;
}

export default function UserListPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuthContext();

  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    profession: "",
    // experience: "", // Removed experience
    location: "",
    onlineOnly: false,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const usersCollectionRef = collection(db, "users");
        // Consider adding orderBy if you want a consistent default sort
        // const q = query(usersCollectionRef, orderBy("fullName"));
        const querySnapshot = await getDocs(usersCollectionRef);
        let fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
        });

        if (currentUser) {
          fetchedUsers = fetchedUsers.filter(user => user.id !== currentUser.uid);
        }

        setAllUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users from Firestore:", error);
        // Optionally, set an error state here to display to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]); // Re-fetch if currentUser changes

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      if (!user) return false;

      const searchTermMatch = filters.searchTerm.toLowerCase() === "" ||
        (user.fullName && user.fullName.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (user.profession && user.profession.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (user.bio && user.bio.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const professionMatch = filters.profession === "" || (user.profession && user.profession === filters.profession);
      
      const locationMatch = filters.location === "" || 
        (user.location?.address && user.location.address.toLowerCase().includes(filters.location.toLowerCase()));

      const onlineMatch = !filters.onlineOnly || !!user.isOnline;

      // const experienceMatch = filters.experience === "" || (user.yearsOfExperience !== undefined && (
      //   (filters.experience === "0-2" && user.yearsOfExperience >= 0 && user.yearsOfExperience <= 2) ||
      //   (filters.experience === "3-5" && user.yearsOfExperience >= 3 && user.yearsOfExperience <= 5) ||
      //   (filters.experience === "6-10" && user.yearsOfExperience >= 6 && user.yearsOfExperience <= 10) ||
      //   (filters.experience === "10+" && user.yearsOfExperience > 10)
      // ));
      // Removed experienceMatch from return

      return searchTermMatch && professionMatch && locationMatch && onlineMatch;
    });
  }, [allUsers, filters]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

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
      <p className="text-lg text-muted-foreground mb-8">
        Find and connect with other users on Proximity Network.
      </p>
      
      <UserFilters 
        onFilterChange={handleFilterChange} 
        initialFilters={filters} 
        users={allUsers} // Pass the fetched users to UserFilters
      />

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
          <AlertDescription>
            No users match your current filter criteria or no other users are available. Try adjusting your filters or check back later.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
