"use client";

import ChatListItem from "@/components/messaging/ChatListItem";
import type { Chat } from "@/lib/types";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";
import { getUserChats, findOrCreateChat, deleteChat } from "@/services/chatService";
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

export default function MessagesView() {
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChats = async () => {
    if (!currentUser) return;
    try {
      const fetched = await getUserChats();
      setChats(fetched);
    } catch (err) {
      console.error("Error fetching chats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !currentUser) {
      if (!authLoading) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchChats();
    pollRef.current = setInterval(fetchChats, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading]);

  useEffect(() => {
    const pathSegments = currentPathname.split('/');
    const chatIdFromPath = pathSegments.length > 2 && pathSegments[1] === 'messages' && pathSegments[2]
      ? pathSegments[2] : undefined;
    setActiveChatId(chatIdFromPath);

    const handleNavigation = async () => {
      if (!currentUser || isLoading) return;
      const chatWithId = searchParams.get("chatWith");
      if (!chatWithId) return;

      const existingChat = chats.find(c => c.participants_data?.some(p => String(p.id) === chatWithId));
      if (existingChat) {
        if (String(existingChat.id) !== chatIdFromPath) router.replace(`/messages/${existingChat.id}`);
      } else {
        setIsLoading(true);
        try {
          const chat = await findOrCreateChat(Number(chatWithId));
          router.replace(`/messages/${chat.id}`);
        } catch {
          toast({ title: "Error", description: "Could not create new chat.", variant: "destructive" });
          router.replace('/messages');
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!isLoading && !authLoading) handleNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentPathname, currentUser, chats, isLoading, authLoading]);

  const handleInitiateDelete = (chatId: string) => {
    setChatToDeleteId(chatId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDeleteId) return;
    setIsDeletingChat(true);
    try {
      await deleteChat(Number(chatToDeleteId));
      setChats(prev => prev.filter(c => String(c.id) !== chatToDeleteId));
      toast({ title: "Chat Deleted", description: "The conversation has been removed." });
      if (activeChatId === chatToDeleteId) {
        router.replace('/messages');
        setActiveChatId(undefined);
      }
    } catch (error) {
      toast({ title: "Error Deleting Chat", description: (error as Error).message || "Could not delete the conversation.", variant: "destructive" });
    } finally {
      setIsDeletingChat(false);
      setIsDeleteDialogOpen(false);
      setChatToDeleteId(null);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!currentUser) return false;
    const other = chat.participants_data?.find(p => String(p.id) !== currentUser.uid);
    return other?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
        <Button asChild><Link href="/users">Start New Chat</Link></Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl font-headline">Your Conversations</CardTitle>
          <div className="mt-2 relative">
            <Input placeholder="Search chats..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
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
                    isActive={String(chat.id) === activeChatId}
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
                {searchTerm ? "Try a different search term." : <>Start a conversation from the <Link href="/users" className="text-primary hover:underline">users page</Link>.</>}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingChat}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeletingChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {isDeletingChat ? "Deleting..." : "Delete Chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
