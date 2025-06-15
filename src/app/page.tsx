
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import HomeAuthButtons from "@/components/home/HomeAuthButtons"; // Import the new client component

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center py-8">
      <div className="w-full mx-auto mb-12">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg shadow-xl">
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
      
      <HomeAuthButtons /> {/* Use the client component for buttons */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full mt-16">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Discover Nearby</CardTitle>
            <CardDescription>Find professionals in your vicinity using our interactive map.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image 
                src="/discover_image.png" 
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
            <CardTitle className="font-headline">Connect &amp; Chat</CardTitle>
            <CardDescription>Engage in meaningful conversations with in-app messaging.</CardDescription>
          </CardHeader>
           <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image 
                src="/chat_image.png" 
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
