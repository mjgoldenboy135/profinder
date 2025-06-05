"use client";

import type { Chat, User } from "@/lib/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string; // To determine the other participant
  isActive?: boolean;
}

export default function ChatListItem({ chat, currentUserId, isActive }: ChatListItemProps) {
  const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);

  if (!otherParticipant) {
    // This case should ideally not happen if chat data is consistent
    return (
      <div className="p-3 hover:bg-muted/50 transition-colors rounded-lg border border-destructive">
        <p className="text-sm text-destructive-foreground">Error: Participant not found</p>
      </div>
    );
  }
  
  const fallbackName = otherParticipant.fullName ? otherParticipant.fullName.split(" ").map(n => n[0]).join("") : "PN";

  return (
    <Link href={`/messages/${chat.id}`} className={cn(
      "block p-3 hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors rounded-lg",
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
            {chat.lastMessage?.timestamp && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
          {chat.lastMessage?.text && (
            <p className="text-sm text-muted-foreground truncate">
              {chat.lastMessage.senderId === currentUserId && "You: "}
              {chat.lastMessage.text}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
