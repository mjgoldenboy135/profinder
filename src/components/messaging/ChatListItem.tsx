
"use client";

import type { Chat, ChatParticipantData } from "@/lib/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNowStrict } from 'date-fns'; 
import { cn } from "@/lib/utils";
import type { Timestamp } from "firebase/firestore";
import { Trash2 } from "lucide-react";

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string;
  isActive?: boolean;
  onInitiateDelete: (chatId: string) => void;
}

export default function ChatListItem({ chat, currentUserId, isActive, onInitiateDelete }: ChatListItemProps) {
  const otherParticipant: ChatParticipantData | undefined = chat.participantsData?.find(p => p.id !== currentUserId);

  if (!otherParticipant) {
    // This case should ideally not happen if chat data is consistent.
    console.warn("ChatListItem: Other participant data is missing for chat ID:", chat.id);
    return (
      <div className="p-3 hover:bg-muted/50 transition-colors rounded-lg border border-destructive">
        <p className="text-sm text-destructive-foreground">Error: Participant data missing or incomplete.</p>
        <p className="text-xs text-muted-foreground">Chat ID: {chat.id}</p>
      </div>
    );
  }

  const participantFullName = otherParticipant.fullName?.trim();
  const fallbackName = participantFullName && participantFullName !== ""
    ? participantFullName.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";
  
  const actualProfilePictureUrl = otherParticipant.profilePictureUrl && otherParticipant.profilePictureUrl.trim() !== ""
    ? otherParticipant.profilePictureUrl.trim()
    : null;

  const placeholderImageUrl = `https://placehold.co/48x48.png?text=${fallbackName}`;

  let lastMessageTimeDisplay = "";
  if (chat.lastMessageTimestamp) {
    const timestampSource = chat.lastMessageTimestamp;
    let date: Date | null = null;

    if (typeof timestampSource === 'number') {
      date = new Date(timestampSource);
    } else if (timestampSource && typeof (timestampSource as Timestamp).toDate === 'function') {
      date = (timestampSource as Timestamp).toDate();
    } else if (timestampSource instanceof Date) {
      date = timestampSource;
    }
    
    if (date instanceof Date && !isNaN(date.valueOf())) {
      lastMessageTimeDisplay = formatDistanceToNowStrict(date, { addSuffix: false });
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
        .replace(' ', ''); 
    } else if (timestampSource) {
      // console.warn("ChatListItem: Invalid lastMessageTimestamp for chat ID:", chat.id, timestampSource);
      lastMessageTimeDisplay = ""; // Keep it empty or set to a default like "Invalid date"
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    onInitiateDelete(chat.id);
  };

  return (
    <div className={cn(
      "relative group p-3 hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors", 
      isActive ? "bg-muted dark:bg-muted/50" : ""
    )}>
      <Link href={`/messages/${chat.id}`} className="block">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={actualProfilePictureUrl || placeholderImageUrl} alt={participantFullName || "User"} />
            <AvatarFallback className="text-lg">{fallbackName}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold truncate font-headline">{participantFullName || "Unknown User"}</h3>
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
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={handleDeleteClick}
        aria-label="Delete chat"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
