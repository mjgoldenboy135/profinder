
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // This maps the server-side variable (from apphosting.yaml) 
    // to the name the client-side code expects.
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.google_maps_api_key,
  },
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
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Added for Google User profile images
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
        'http://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
        'https://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
        'http://localhost:9002' // Added localhost for dev server
    ],
  }
};

export default nextConfig;

// import type {NextConfig} from 'next';

// const nextConfig: NextConfig = {
//   /* config options here */
//   env: {
//     // This maps the server-side variable (from apphosting.yaml) 
//     // to the name the client-side code expects.
//     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'placehold.co',
//         port: '',
//         pathname: '/**',
//       },
//       {
//         protocol: 'https',
//         hostname: 'firebasestorage.googleapis.com',
//         port: '',
//         pathname: '/v0/b/**',
//       },
//       {
//         protocol: 'https',
//         hostname: 'lh3.googleusercontent.com', // Added for Google User profile images
//         port: '',
//         pathname: '/**',
//       },
//     ],
//   },
//   experimental: {
//     allowedDevOrigins: [
//         'http://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
//         'https://9000-firebase-studio-1749131851806.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
//         'http://localhost:9002' // Added localhost for dev server
//     ],
//   }
// };

// export default nextConfig;
