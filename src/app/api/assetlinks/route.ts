import { NextResponse } from "next/server";

// Digital Asset Links, served at /.well-known/assetlinks.json (via a rewrite in
// next.config). This is what lets the Android TWA verify it owns this domain and
// run full-screen without the Chrome address bar.
//
// Configure via environment variables (no code change / redeploy of logic):
//   TWA_PACKAGE_NAME          e.g. com.profinderhome.app  (default below)
//   TWA_SHA256_FINGERPRINTS   comma-separated SHA-256 cert fingerprints.
//     After uploading to Play Console, copy the fingerprint from
//     "App integrity" → "App signing key certificate" (and optionally your
//     upload key) and set it here. Until it's set, the app still works but shows
//     the URL bar because verification can't complete.

export const dynamic = "force-dynamic";

// The app's own upload-key SHA-256 fingerprint (public info, safe to commit).
// This is what the sideloaded / CI-built APK is signed with, so listing it here
// lets the installed TWA verify the domain and run full-screen (no URL bar).
// Add Google's Play App Signing fingerprint via TWA_SHA256_FINGERPRINTS once the
// app is on the Play Store (both can be listed).
const DEFAULT_FINGERPRINTS = [
  "1E:DD:8E:36:D2:71:ED:8B:25:E5:F0:3D:7D:1D:E1:77:FE:34:B4:3D:CE:77:C0:B6:A8:4F:9C:64:1C:06:68:0E",
];

export function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME || "com.profinderhome.app";
  const envFingerprints = (process.env.TWA_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const fingerprints = Array.from(new Set([...DEFAULT_FINGERPRINTS, ...envFingerprints]));

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
