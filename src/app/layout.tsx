
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider
import { ThemeProvider, themeInitScript } from '@/contexts/ThemeContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Profinder',
  description: 'A professional social networking platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ThemeProvider>
          <AuthProvider> {/* Wrap with AuthProvider */}
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
