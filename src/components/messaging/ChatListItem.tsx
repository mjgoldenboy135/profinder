
"use client";

import type { Chat, ChatParticipantData } from "@/lib/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNowStrict } from 'date-fns'; // Using strict for shorter format
import { cn } from "@/lib/utils";
import type { Timestamp } from "firebase/firestore";

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string;
  isActive?: boolean;
}

export default function ChatListItem({ chat, currentUserId, isActive }: ChatListItemProps) {
  const otherParticipant: ChatParticipantData | undefined = chat.participantsData?.find(p => p.id !== currentUserId);

  if (!otherParticipant) {
    return (
      <div className="p-3 hover:bg-muted/50 transition-colors rounded-lg border border-destructive">
        <p className="text-sm text-destructive-foreground">Error: Participant data missing</p>
      </div>
    );
  }

  const fallbackName = otherParticipant.fullName ? otherParticipant.fullName.split(" ").map(n => n[0]).join("").toUpperCase() : "??";
  
  let lastMessageTimeDisplay = "";
  if (chat.lastMessageTimestamp) {
    const timestamp = chat.lastMessageTimestamp;
    const date = typeof timestamp === 'number' ? new Date(timestamp) : (timestamp as Timestamp)?.toDate();
    if (date) {
      lastMessageTimeDisplay = formatDistanceToNowStrict(date, { addSuffix: false });
      // Make it shorter e.g., 5m, 2h, 3d
      lastMessageTimeDisplay = lastMessageTimeDisplay
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y')
        .replace(' seconds', 's')
        .replace(' second', 's')
        .replace('about ', '')
        .replace('almost ', '')
        .replace('less than a minute', 'now')
        .replace(' ', ''); // remove space for "1 m" -> "1m"
    }
  }


  return (
    <Link href={`/messages/${chat.id}`} className={cn(
      "block p-3 hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors", // Removed rounded-lg to let parent control it
      isActive ? "bg-muted dark:bg-muted/50" : ""
    )}>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={otherParticipant.profilePictureUrl || `https://placehold.co/48x48.png?text=${fallbackName}`} alt={otherParticipant.fullName} />
          <AvatarFallback className="text-lg">{fallbackName}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold truncate font-headline">{otherParticipant.fullName}</h3>
            {lastMessageTimeDisplay && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {lastMessageTimeDisplay}
              </p>
            )}
          </div>
          {chat.lastMessageText && (
            <p className="text-sm text-muted-foreground truncate">
              {chat.lastMessageSenderId === currentUserId && "You: "}
              {chat.lastMessageText}
            </p>
          )}
          {!chat.lastMessageText && (
             <p className="text-sm text-muted-foreground italic">No messages yet</p>
          )}
        </div>
      </div>
    </Link>
  );
}
