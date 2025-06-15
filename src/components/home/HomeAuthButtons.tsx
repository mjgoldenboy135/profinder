
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function HomeAuthButtons() {
  const { currentUser } = useAuthContext();

  return (
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
  );
}
