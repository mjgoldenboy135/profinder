
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Users, MessageCircle, UserCircle, LogOut, LogIn } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext'; // Import the AuthContext
import { auth } from '@/lib/firebase'; // Import Firebase auth
import { signOut } from 'firebase/auth'; // Import Firebase signOut
import { useToast } from "@/hooks/use-toast"; // Import useToast

const navLinks = [
  { href: '/map', label: 'Map', icon: MapPin, authRequired: true },
  { href: '/users', label: 'Users', icon: Users, authRequired: true },
  { href: '/messages', label: 'Messages', icon: MessageCircle, authRequired: true },
  { href: '/profile', label: 'Profile', icon: UserCircle, authRequired: true },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter(); // For navigation after logout
  const { currentUser, loading } = useAuthContext(); // Use the AuthContext
  const { toast } = useToast();

  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Remove the mock auth toggle button as we now have real auth.
  // const handleAuthToggle = () => { ... };

  if (loading) {
    // You might want to render a loading state or a simplified header
    return (
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <AppLogo />
          <div>Loading...</div> {/* Or a Skeleton loader */}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <AppLogo />
        <nav className="flex items-center gap-4">
          {navLinks.map((link) => (
            (link.authRequired && isAuthenticated) || !link.authRequired ? (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            ) : null
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
          {/* Removed the "Toggle Auth (Dev)" button */}
        </div>
      </div>
    </header>
  );
}
