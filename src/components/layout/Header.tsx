
'use client'; // Needed for potential auth state logic and Link usage

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Users, MessageCircle, UserCircle, LogOut, LogIn } from 'lucide-react'; // Removed Lightbulb
import { useState, useEffect } from 'react'; // For managing auth state (mocked)

// Mock auth state. In a real app, this would come from a context or auth library.
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    // Simulate checking auth status on mount
    // setIsAuthenticated(localStorage.getItem('isAuthenticated') === 'true');
    // For now, let's toggle it based on a simple client-side state
    // This is not secure and for demo purposes only
  }, []);
  
  // Mock login/logout functions for demo
  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return { isAuthenticated, login, logout };
}


const navLinks = [
  { href: '/map', label: 'Map', icon: MapPin, authRequired: true },
  { href: '/users', label: 'Users', icon: Users, authRequired: true },
  { href: '/messages', label: 'Messages', icon: MessageCircle, authRequired: true },
  // { href: '/suggestions', label: 'Suggestions', icon: Lightbulb, authRequired: true }, // Removed
  { href: '/profile', label: 'Profile', icon: UserCircle, authRequired: true },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, login, logout } = useAuth(); // Using mocked auth

  // This is a simple toggle for demo purposes. Remove for real auth.
  const handleAuthToggle = () => {
    if (isAuthenticated) logout();
    else login();
  };

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
            <Button variant="outline" size="sm" onClick={logout}>
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
          {/* Simple auth toggle for demo - remove in production */}
          <Button variant="secondary" size="sm" onClick={handleAuthToggle} className="ml-4">
            Toggle Auth (Dev)
          </Button>
        </div>
      </div>
    </header>
  );
}
