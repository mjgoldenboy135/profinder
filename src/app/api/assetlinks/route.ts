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

export function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME || "com.profinderhome.app";
  const fingerprints = (process.env.TWA_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

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
