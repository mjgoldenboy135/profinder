
"use client";

import ChatListItem from "@/components/messaging/ChatListItem";
import type { Chat, User } from "@/lib/types";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";
import { getUserChats, findOrCreateChat, deleteChat } from "@/services/chatService";
import { getUserProfile } from "@/services/userService"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Timestamp } from "firebase/firestore";

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = usePathname();
  const { currentUser, loading: authLoading } = useAuthContext();
  const { toast } = useToast();

  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDeleteId, setChatToDeleteId] = useState<string | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);


  useEffect(() => {
    const initializeChatsAndNavigation = async () => {
      if (authLoading || !currentUser) {
        setIsLoading(true);
        return;
      }
      setIsLoading(true);

      try {
        console.log("[MessagesPage] Attempting to fetch user chats for:", currentUser.uid);
        const rawUserChats = await getUserChats(currentUser.uid);
        console.log("[MessagesPage] Fetched raw user chats:", rawUserChats.length);

        // De-duplicate chats client-side
        const uniqueChatsMap = new Map<string, Chat>();
        
        const getComparableTimestamp = (ts: any): number => {
          if (!ts) return 0;
          // Handle Firestore Timestamp objects specifically
          if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
          // Handle cases where ts might already be a number (milliseconds)
          if (typeof ts === 'number') return ts;
          // Fallback for Date objects or ISO strings
          const date = new Date(ts);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };

        rawUserChats.forEach(chat => {
          const otherParticipantId = chat.participantIds.find(id => id !== currentUser.uid);
          if (otherParticipantId) {
            const existingChatForParticipant = uniqueChatsMap.get(otherParticipantId);
            const currentChatTimestamp = getComparableTimestamp(chat.updatedAt);

            if (!existingChatForParticipant) {
              uniqueChatsMap.set(otherParticipantId, chat);
            } else {
              const existingChatTimestamp = getComparableTimestamp(existingChatForParticipant.updatedAt);
              if (currentChatTimestamp > existingChatTimestamp) {
                uniqueChatsMap.set(otherParticipantId, chat);
              }
            }
          }
        });
        const deDupedUserChats = Array.from(uniqueChatsMap.values());
        console.log("[MessagesPage] De-duplicated user chats:", deDupedUserChats.length);
        setChats(deDupedUserChats);


        const chatWithId = searchParams.get("chatWith");
        const pathSegments = currentPathname.split('/');
        const chatIdFromPath = pathSegments.length > 2 && pathSegments[1] === 'messages' && pathSegments[2] ? pathSegments[2] : undefined;
        
        console.log("[MessagesPage] Initial navigation check: chatWithId:", chatWithId, "chatIdFromPath:", chatIdFromPath);

        if (chatWithId) {
          console.log("[MessagesPage] 'chatWith' param found:", chatWithId);
          const existingChatWithTargetUser = deDupedUserChats.find( // Use deDupedUserChats
            (c) => c.participantIds.includes(currentUser.uid) && c.participantIds.includes(chatWithId)
          );

          if (existingChatWithTargetUser && existingChatWithTargetUser.id === chatIdFromPath) {
            console.log("[MessagesPage] Already on the correct chat page:", existingChatWithTargetUser.id);
            setActiveChatId(existingChatWithTargetUser.id);
          } else if (existingChatWithTargetUser) {
            console.log("[MessagesPage] Navigating to existing chat:", existingChatWithTargetUser.id);
            router.replace(`/messages/${existingChatWithTargetUser.id}`); 
            setActiveChatId(existingChatWithTargetUser.id);
          } else {
            console.log("[MessagesPage] No existing chat, attempting to find or create for:", chatWithId);
            const newChatId = await findOrCreateChat(currentUser.uid, chatWithId);
            console.log("[MessagesPage] findOrCreateChat returned ID:", newChatId, "navigating to it.");
            router.replace(`/messages/${newChatId}`);
            setActiveChatId(newChatId);
            const updatedUserChats = await getUserChats(currentUser.uid); // Re-fetch to get new chat
             // Re-apply de-duplication after re-fetch
            const reFetchedUniqueChatsMap = new Map<string, Chat>();
            updatedUserChats.forEach(chat => {
                const otherParticipantId = chat.participantIds.find(id => id !== currentUser.uid);
                if (otherParticipantId) {
                    const existing = reFetchedUniqueChatsMap.get(otherParticipantId);
                    const currentTS = getComparableTimestamp(chat.updatedAt);
                    if (!existing || currentTS > getComparableTimestamp(existing.updatedAt)) {
                        reFetchedUniqueChatsMap.set(otherParticipantId, chat);
                    }
                }
            });
            setChats(Array.from(reFetchedUniqueChatsMap.values()));
          }
        } else if (chatIdFromPath) {
           console.log("[MessagesPage] Navigated directly to chat page:", chatIdFromPath);
           setActiveChatId(chatIdFromPath);
        } else {
           console.log("[MessagesPage] No specific chat targeted in URL.");
        }

      } catch (error) {
        console.error("[MessagesPage] Error initializing chats or navigation:", error);
        toast({
          title: "Error Loading Chats",
          description: (error as Error).message || "Could not load your conversations.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        console.log("[MessagesPage] Initialization complete. isLoading: false");
      }
    };

    initializeChatsAndNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, searchParams, currentPathname]); // router removed to prevent loops on replace

  const handleInitiateDelete = (chatId: string) => {
    setChatToDeleteId(chatId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDeleteId) return;
    setIsDeletingChat(true);
    try {
      await deleteChat(chatToDeleteId);
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatToDeleteId));
      toast({
        title: "Chat Deleted",
        description: "The conversation has been removed.",
      });
      if (activeChatId === chatToDeleteId) {
        router.replace('/messages');
        setActiveChatId(undefined);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      let description = (error as Error).message || "Could not delete the conversation.";
      if ((error as Error).message && ((error as Error).message.toLowerCase().includes("permission") || (error as Error).message.toLowerCase().includes("permissions"))) {
        description = "Could not delete the chat due to permission issues. Please check your Firestore security rules to ensure participants can delete chats and their messages.";
      }
      toast({
        title: "Error Deleting Chat",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsDeletingChat(false);
      setIsDeleteDialogOpen(false);
      setChatToDeleteId(null);
    }
  };


  const filteredChats = chats.filter(chat => {
    if (!currentUser) return false;
    const otherParticipant = chat.participantsData?.find(p => p.id !== currentUser.uid);
    // Ensure otherParticipant and fullName exist before calling toLowerCase
    return otherParticipant?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    // Ensure lastMessageTimestamp is handled correctly if it's a Firestore Timestamp or number
    const getSortableTimestamp = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis(); // Firestore Timestamp
        if (typeof ts === 'number') return ts; // Milliseconds
        return new Date(ts).getTime() || 0; // Fallback for Date objects or ISO strings
    };
    const timeA = getSortableTimestamp(a.lastMessageTimestamp);
    const timeB = getSortableTimestamp(b.lastMessageTimestamp);
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
                                onInitiateDelete={handleInitiateDelete}
                            />
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="p-6 text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3" />
                        <p className="font-semibold">{searchTerm ? "No chats match your search." : "No chats yet."}</p>
                        <p className="text-sm">
                            {searchTerm 
                                ? "Try a different search term." 
                                : <>Start a conversation with someone from the <Link href="/users" className="text-primary hover:underline">users page</Link>.</>
                            }
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center">
                        <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
                        Confirm Deletion
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this chat? All messages in this conversation will be permanently removed. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingChat}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleConfirmDelete} 
                        disabled={isDeletingChat}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeletingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" /> }
                        {isDeletingChat ? "Deleting..." : "Delete Chat"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
