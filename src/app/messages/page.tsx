
"use client";

import ChatListItem from "@/components/messaging/ChatListItem";
import type { Chat, User } from "@/lib/types";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";
import { getUserChats, findOrCreateChat } from "@/services/chatService";
import { getUserProfile } from "@/services/userService"; // To get user details for new chat

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = usePathname();
  const { currentUser, loading: authLoading } = useAuthContext();

  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const initializeChatsAndNavigation = async () => {
      if (authLoading || !currentUser) {
        setIsLoading(true);
        return;
      }
      setIsLoading(true);

      try {
        const userChats = await getUserChats(currentUser.uid);
        setChats(userChats);

        const chatWithId = searchParams.get("chatWith");
        const pathSegments = currentPathname.split('/');
        const chatIdFromPath = pathSegments.length > 2 && pathSegments[1] === 'messages' && pathSegments[2] ? pathSegments[2] : undefined;

        if (chatWithId) { // Priority: If 'chatWith' is present, find/create and navigate
          // Check if we are already on the target chat page to avoid loop
          const existingChat = userChats.find(
            (c) => c.participantIds.includes(currentUser.uid) && c.participantIds.includes(chatWithId)
          );

          if (existingChat && existingChat.id === chatIdFromPath) {
            setActiveChatId(existingChat.id); // Already on the correct page
          } else if (existingChat) {
            router.replace(`/messages/${existingChat.id}`); // Navigate to existing chat
            setActiveChatId(existingChat.id);
          } else {
            const newChatId = await findOrCreateChat(currentUser.uid, chatWithId);
            const updatedChats = await getUserChats(currentUser.uid); // Refetch or update locally
            setChats(updatedChats);
            router.replace(`/messages/${newChatId}`); // Navigate to new chat
            setActiveChatId(newChatId);
          }
        } else if (chatIdFromPath) { // If directly on a chat page
          setActiveChatId(chatIdFromPath);
        } else if (userChats.length > 0 && !chatIdFromPath && !chatWithId) {
          // Optional: navigate to the first chat if no specific chat is requested
          // router.replace(`/messages/${userChats[0].id}`);
          // setActiveChatId(userChats[0].id);
        }
      } catch (error) {
        console.error("[MessagesPage] Error initializing chats or navigation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatsAndNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, searchParams, currentPathname, router]);


  const filteredChats = chats.filter(chat => {
    if (!currentUser) return false;
    const otherParticipant = chat.participantsData?.find(p => p.id !== currentUser.uid);
    return otherParticipant?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const timeA = a.lastMessageTimestamp?.toMillis ? a.lastMessageTimestamp.toMillis() : (typeof a.lastMessageTimestamp === 'number' ? a.lastMessageTimestamp : 0);
    const timeB = b.lastMessageTimestamp?.toMillis ? b.lastMessageTimestamp.toMillis() : (typeof b.lastMessageTimestamp === 'number' ? b.lastMessageTimestamp : 0);
    return timeB - timeA;
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="flex flex-col items-center justify-center py-12">
        <p>Please log in to view your messages.</p>
        <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
      </div>
    );
  }


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
                                currentUserId={currentUser.uid}
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
