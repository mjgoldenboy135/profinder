
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
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if the button is inside the Link
    e.stopPropagation(); // Stop event bubbling
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
