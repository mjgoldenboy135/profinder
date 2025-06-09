
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center py-8">
      <div className="w-full max-w-4xl mx-auto mb-12">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg shadow-xl">
          <Image
            src="/home_image.jpg"
            alt="Profinder - Professional Networking"
            fill
            style={{ objectFit: 'contain' }}
            data-ai-hint="professional network"
            priority
          />
        </div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-headline font-bold mb-4 text-primary leading-tight">
        Welcome to Profinder
      </h1>
      <p className="text-lg sm:text-xl text-foreground mb-8 max-w-xl mx-auto">
        Connect with professionals near you, discover new opportunities, and expand your network.
        Share your journey, find collaborators, and grow together.
      </p>
      <div className="space-x-4 mb-16">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Discover Nearby</CardTitle>
            <CardDescription>Find professionals in your vicinity using our interactive map.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image 
                src="/map_feature.jpg" 
                alt="Interactive map feature" 
                fill
                style={{ objectFit: 'contain' }} 
                className="rounded" 
                data-ai-hint="interactive map" 
              />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Connect & Chat</CardTitle>
            <CardDescription>Engage in meaningful conversations with in-app messaging.</CardDescription>
          </CardHeader>
           <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image 
                src="/chat_feature.jpg" 
                alt="In-app messaging feature" 
                fill
                style={{ objectFit: 'contain' }} 
                className="rounded" 
                data-ai-hint="messaging app" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
