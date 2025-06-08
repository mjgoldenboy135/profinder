
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Users, MessageCircle, UserCircle, LogOut } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from 'react';

const navLinks = [
  { href: '/map', label: 'Map', icon: MapPin, authRequired: true },
  { href: '/users', label: 'Users', icon: Users, authRequired: true },
  { href: '/messages', label: 'Messages', icon: MessageCircle, authRequired: true },
  { href: '/profile', label: 'Profile', icon: UserCircle, authRequired: true },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading } = useAuthContext();
  const { toast } = useToast();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const headerHeightThreshold = 80; // Corresponds to h-20

  useEffect(() => {
    if (typeof window !== 'undefined') {
      lastScrollYRef.current = window.scrollY;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const localLastScrollY = lastScrollYRef.current;

      if (currentScrollY < 20) { // Always show if very close to top
        setIsVisible(true);
      } else if (currentScrollY > localLastScrollY && currentScrollY > headerHeightThreshold) { // Scrolling down
        setIsVisible(false);
      } else if (currentScrollY < localLastScrollY) { // Scrolling up
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Initial loading state for the header content, not affecting the scroll behavior logic itself
  if (loading) {
    return (
      <header className={cn(
        "bg-card border-b sticky top-0 z-50 transition-transform duration-300 ease-in-out",
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <AppLogo />
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn(
        "bg-card border-b sticky top-0 z-50 transition-transform duration-300 ease-in-out",
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}>
      <div className="container mx-auto px-2 sm:px-4 h-20 flex items-center justify-between">
        <AppLogo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            (link.authRequired && isAuthenticated) || !link.authRequired ? (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 sm:p-2 rounded-md transition-colors",
                  pathname === link.href || (link.href === '/messages' && pathname.startsWith('/messages/'))
                    ? "text-primary" 
                    : "text-foreground hover:text-primary/90"
                )}
                title={link.label}
              >
                <link.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[10px] sm:text-xs font-medium">{link.label}</span>
              </Link>
            ) : null
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <Button variant="default" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-1" /> 
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <>
              <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="px-2 sm:px-3"> 
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
