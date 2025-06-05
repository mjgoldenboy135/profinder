
"use client";

import ChatListItem from "@/components/messaging/ChatListItem";
import { placeholderChats, getCurrentUser } from "@/lib/placeholder-data";
import type { Chat } from "@/lib/types";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation"; // Added import
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MessagesPage() { // Removed searchParams prop
  const searchParams = useSearchParams(); // Use the hook
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(searchParams.get("chatId") || undefined); // Get chatId using the hook


  useEffect(() => {
    const user = getCurrentUser(); // Simulate fetching current user
    setCurrentUserId(user.id);
    // Simulate fetching chats
    // Filter chats to only include those where currentUserId is a participant
    const userChats = placeholderChats.filter(chat => chat.participantIds.includes(user.id));
    setChats(userChats);

    const chatIdFromParams = searchParams.get("chatId"); // Get chatId from hook
    if (chatIdFromParams) {
        setActiveChatId(chatIdFromParams);
    } else if (userChats.length > 0) {
        // setActiveChatId(userChats[0].id); // Optionally select the first chat
    }

  }, [searchParams]); // Added searchParams to dependency array

  const filteredChats = chats.filter(chat => {
    const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);
    return otherParticipant?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));


  if (!currentUserId) return <p>Loading...</p>; // Or a skeleton loader

  return (
    <div className="py-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold font-headline text-primary">Messages</h1>
            <Button asChild>
                <Link href="/users">Start New Chat</Link>
            </Button>
        </div>
        
        <Card className="shadow-xl">
            <CardHeader className="border-b">
                 <CardTitle className="text-2xl font-headline">Your Conversations</CardTitle>
                 <div className="mt-2 relative">
                    <Input 
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredChats.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
                        <div className="divide-y">
                        {filteredChats.map(chat => (
                            <ChatListItem 
                                key={chat.id} 
                                chat={chat} 
                                currentUserId={currentUserId} 
                                isActive={chat.id === activeChatId}
                            />
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="p-6 text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3" />
                        <p className="font-semibold">No chats yet.</p>
                        <p className="text-sm">Start a conversation with someone from the <Link href="/users" className="text-primary hover:underline">users page</Link>.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
