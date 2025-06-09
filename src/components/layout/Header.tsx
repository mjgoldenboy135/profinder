
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Users, MessageCircle, UserCircle, LogOut, Menu, Star } from 'lucide-react'; // Added Star
import { useAuthContext } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';

const mainHeaderNavLinks = [
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setIsSidebarOpen(false); // Close sidebar on logout
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
  
  if (loading) {
    return (
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <AppLogo />
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-0 sm:mr-2 text-primary hover:bg-accent/50">
                <Menu className="h-7 w-7 sm:h-8 sm:w-8" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 flex flex-col bg-card">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <AppLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-grow p-4 space-y-2">
                {isAuthenticated && (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/profile"
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === "/profile" ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                      >
                        <UserCircle className="h-5 w-5" />
                        Profile
                      </Link>
                    </SheetClose>
                     <SheetClose asChild>
                      <Link
                        href="/favorites"
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === "/favorites" ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                      >
                        <Star className="h-5 w-5" />
                        Favorites
                      </Link>
                    </SheetClose>
                    <Separator className="my-3"/>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </Button>
                  </>
                )}
                {!isAuthenticated && (
                  <>
                     <SheetClose asChild>
                      <Link
                        href="/login"
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === "/login" ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                      >
                        Login
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/signup"
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === "/signup" ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                      >
                        Sign Up
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>
              <SheetFooter className="p-4 border-t mt-auto">
                 <p className="text-xs text-muted-foreground text-center">Proximity Network</p>
              </SheetFooter>
            </SheetContent>
          </Sheet>
           <div className="hidden sm:block"> {/* AppLogo visible on sm+ screens next to menu */}
             <AppLogo />
           </div>
        </div>

        {/* Main navigation for larger screens */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {mainHeaderNavLinks.map((link) => (
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

        {/* Auth buttons for larger screens */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
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
