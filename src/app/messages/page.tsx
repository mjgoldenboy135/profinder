
"use client";

import ChatListItem from "@/components/messaging/ChatListItem";
import { placeholderChats, getCurrentUser, placeholderUsers } from "@/lib/placeholder-data";
import type { Chat, User } from "@/lib/types";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";


  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUserId(user.id);
    const userChats = placeholderChats.filter(chat => chat.participantIds.includes(user.id));
    setChats(userChats);

    const chatWithId = searchParams.get("chatWith");
    const navigatedChatId = searchParams.get("navigatedChatId");

    if (chatWithId && user.id && !navigatedChatId) {
      const existingChat = placeholderChats.find(
        (c) =>
          c.participantIds.includes(user.id) &&
          c.participantIds.includes(chatWithId)
      );

      if (existingChat) {
        router.replace(`/messages/${existingChat.id}?navigatedChatId=${existingChat.id}`);
      } else {
        const currentUserDetails = placeholderUsers.find(u => u.id === user.id);
        const otherUserDetails = placeholderUsers.find(u => u.id === chatWithId);

        if (currentUserDetails && otherUserDetails) {
          const newChatId = `new-${user.id}-${chatWithId}-${Date.now()}`;
          const newChat: Chat = {
            id: newChatId,
            participantIds: [user.id, chatWithId],
            participants: [
              { id: currentUserDetails.id, fullName: currentUserDetails.fullName, profilePictureUrl: currentUserDetails.profilePictureUrl },
              { id: otherUserDetails.id, fullName: otherUserDetails.fullName, profilePictureUrl: otherUserDetails.profilePictureUrl }
            ],
            lastMessage: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          if (!placeholderChats.find(c => c.id === newChatId)) {
            placeholderChats.unshift(newChat);
          }
          setChats(prevChats => [newChat, ...prevChats.filter(c => c.id !== newChatId)]);
          router.replace(`/messages/${newChatId}?navigatedChatId=${newChatId}`);
        } else {
          const directChatIdParam = searchParams.get("chatId");
           if (directChatIdParam) {
            setActiveChatId(directChatIdParam);
          }
        }
      }
    } else {
      // Handle direct navigation to /messages/[chatId] or general /messages page
      const directChatId = searchParams.get("chatId") || (pathname.startsWith('/messages/') && pathname.split('/')[2] ? pathname.split('/')[2] : undefined);
      if (directChatId && placeholderChats.some(c => c.id === directChatId && c.participantIds.includes(user.id))) {
        setActiveChatId(directChatId);
      } else if (userChats.length > 0 && !directChatId && !chatWithId) {
        // Optionally select the first chat if no specific chat is targeted
        // setActiveChatId(userChats[0].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentUserId, router, pathname]);


  // Effect to set active chat based on current URL (e.g. /messages/chat123)
  // This is useful if the user navigates directly to a chat URL
  useEffect(() => {
    if (pathname.startsWith('/messages/')) {
      const pathSegments = pathname.split('/');
      if (pathSegments.length > 2 && pathSegments[2]) {
        const chatIdFromPath = pathSegments[2];
        if (currentUserId && placeholderChats.find(c => c.id === chatIdFromPath && c.participantIds.includes(currentUserId))) {
           setActiveChatId(chatIdFromPath);
        }
      }
    }
  }, [pathname, currentUserId]);


  const filteredChats = chats.filter(chat => {
    const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);
    return otherParticipant?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));


  if (!currentUserId) return <p>Loading...</p>;

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
                    <ScrollArea className="h-[calc(100vh-20rem)]">
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
