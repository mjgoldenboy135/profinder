
import Link from 'next/link';
import { Users } from 'lucide-react'; // Or consider: Search, Compass, Network icons

export default function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
      <Users className="h-8 w-8" /> 
      <span className="text-2xl font-headline font-semibold">Profinder</span>
    </Link>
  );
}
