
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Users, MessageCircle, UserCircle, LogOut } from 'lucide-react'; // Removed LogIn as it's not directly used on button, variant change handles it
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
  
  if (loading) {
    // You might want to render a loading state or a simplified header
    return (
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <AppLogo />
          <div>Loading...</div> {/* Or a Skeleton loader */}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 h-20 flex items-center justify-between">
        <AppLogo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            (link.authRequired && isAuthenticated) || !link.authRequired ? (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 sm:p-2 rounded-md transition-colors hover:bg-accent/50",
                  pathname === link.href || (link.href === '/messages' && pathname.startsWith('/messages/'))
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={link.label} // Add title for better UX on hover for collapsed labels
              >
                <link.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[10px] sm:text-xs font-medium">{link.label}</span>
              </Link>
            ) : null
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <Button variant="default" size="sm" onClick={handleLogout} className="px-2 sm:px-3"> {/* Changed variant to default */}
              <LogOut className="h-4 w-4 sm:mr-1" /> 
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <>
              <Button variant="default" size="sm" asChild className="px-2 sm:px-3"> {/* Changed variant to default */}
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild className="px-2 sm:px-3">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
