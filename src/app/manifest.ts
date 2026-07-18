import type { MetadataRoute } from 'next';

// Web App Manifest served at /manifest.webmanifest. This makes the site an
// installable PWA and is the source Bubblewrap reads to build the Android TWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Profinder',
    short_name: 'Profinder',
    description: 'Discover and connect with professionals near you.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0ea5e9',
    categories: ['social', 'business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
