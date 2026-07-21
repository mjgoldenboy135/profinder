"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) in production so repeat loads are
 * served from cache — the app opens fast even on slow networks and works as an
 * installable PWA / Android TWA. Disabled in dev to avoid caching HMR assets.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
