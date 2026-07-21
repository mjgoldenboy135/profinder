import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // react-leaflet re-initializes the map container under StrictMode's dev
  // double-mount ("Map container is already initialized"). Production never
  // double-mounts, so this only affects dev; disable it to keep the map stable.
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.onrender.com',
        port: '',
        pathname: '/media/**',
      },
    ],
  },
  async headers() {
    // Allow the Google Identity Services popup to postMessage back to the app
    // (otherwise Chrome logs "Cross-Origin-Opener-Policy would block ...").
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
  async rewrites() {
    // Serve the Android TWA Digital Asset Links file at the well-known path.
    return [
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
    ];
  },
  experimental: {
    allowedDevOrigins: [
        'http://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
        'https://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
        'http://localhost:9002'
    ],
  }
};

export default nextConfig;
