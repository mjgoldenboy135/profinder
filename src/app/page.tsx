
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";

export default function HomePage() {
  const { currentUser } = useAuthContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <Image
        src="/images/home_image.jpg" 
        alt="Proximity Network - Professional Networking"
        width={300}
        height={200}
        priority={true}
        className="mb-8 rounded-lg shadow-lg"
      />
      <h1 className="text-5xl font-headline font-bold mb-6 text-primary">
        Welcome to Proximity Network
      </h1>
      <p className="text-xl text-foreground mb-8 max-w-2xl">
        Connect with professionals near you, discover new opportunities, and expand your network.
        Share your journey, find collaborators, and grow together.
      </p>
      <div className="space-x-4">
        {!currentUser ? (
          <>
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">
                Login
              </Link>
            </Button>
          </>
        ) : (
           <Button size="lg" asChild>
            <Link href="/map">
              Explore Network Map <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Discover Nearby</CardTitle>
            <CardDescription>Find professionals in your vicinity using our interactive map.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/300x150.png" alt="Map Icon" width={300} height={150} className="rounded" data-ai-hint="interactive map discovery" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Build Your Profile</CardTitle>
            <CardDescription>Showcase your skills, experience, and education.</CardDescription>
          </CardHeader>
           <CardContent>
            <Image src="https://placehold.co/300x150.png" alt="Profile Icon" width={300} height={150} className="rounded" data-ai-hint="professional profile branding" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Connect & Chat</CardTitle>
            <CardDescription>Engage in meaningful conversations with in-app messaging.</CardDescription>
          </CardHeader>
           <CardContent>
            <Image src="https://placehold.co/300x150.png" alt="Chat Icon" width={300} height={150} className="rounded" data-ai-hint="communication messaging app" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
