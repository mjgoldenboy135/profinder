import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
        port: '',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        port: '',
        pathname: '/media/**',
      },
    ],
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
