
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MessagesView from "@/components/messaging/MessagesView";

function MessagesLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Loading conversations...</p>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoadingFallback />}>
      <MessagesView />
    </Suspense>
  );
}
