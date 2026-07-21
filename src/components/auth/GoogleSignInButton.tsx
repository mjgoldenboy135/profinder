"use client";

import { useEffect, useRef } from "react";
import { apiFetch, setTokens } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Initialize Google Identity Services once per page load; keep a pointer to the
// current credential handler so calling initialize() again isn't needed (which
// would trigger GIS "initialize() called multiple times" warnings).
let gsiInitialized = false;
let currentHandler: ((response: { credential?: string }) => void) | null = null;

interface Props {
  redirectTo?: string;
}

// Renders Google's official "Sign in with Google" button. Hidden entirely when
// NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured, so the feature is opt-in.
export default function GoogleSignInButton({ redirectTo = "/map" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { refreshUserProfile } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  // Keep the latest handler available to the single GIS callback without
  // re-initializing GIS on every render.
  const handlerRef = useRef<(response: { credential?: string }) => void>();
  handlerRef.current = async (response) => {
    if (!response?.credential) return;
    try {
      const res = await apiFetch("/auth/google/", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Google sign-in failed.");
      }
      const data = await res.json();
      setTokens(data.access, data.refresh);
      await refreshUserProfile();
      toast({ title: "Signed in with Google", description: "Welcome to Profinder!" });
      router.push(redirectTo);
    } catch (e: any) {
      toast({
        title: "Google Sign-In Failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;
    currentHandler = (r) => handlerRef.current?.(r);

    const init = () => {
      const google = (window as any).google;
      if (cancelled || !google || !containerRef.current) return;
      if (!gsiInitialized) {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r: { credential?: string }) => currentHandler?.(r),
        });
        gsiInitialized = true;
      }
      containerRef.current.innerHTML = "";
      google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
      });
    };

    const SCRIPT_ID = "google-gsi-client";
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).google) init();
      else existing.addEventListener("load", init, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = SCRIPT_ID;
      script.onload = init;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
    // Run once per mount; the handler stays current via handlerRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
