
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
      {/* 
        Wrapper div for the main image, using explicit dimensions.
        The Image component inside will use 'fill' and 'object-cover'.
      */}
      <div 
        className="relative mb-8 rounded-lg shadow-lg"
        style={{ width: '300px', height: '200px', overflow: 'hidden' }}
      >
        <Image
          src="/home_image.jpg" // Updated path to look in public/home_image.jpg
          alt="Proximity Network - Professional Networking"
          fill 
          style={{ objectFit: 'cover' }} 
        />
      </div>
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

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Discover Nearby</CardTitle>
            <CardDescription>Find professionals in your vicinity using our interactive map.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/300x150.png" alt="Map Icon" width={300} height={150} className="rounded" data-ai-hint="interactive map" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Connect & Chat</CardTitle>
            <CardDescription>Engage in meaningful conversations with in-app messaging.</CardDescription>
          </CardHeader>
           <CardContent>
            <Image src="https://placehold.co/300x150.png" alt="Chat Icon" width={300} height={150} className="rounded" data-ai-hint="messaging app" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
