"use client";

import { use, useEffect, useState } from "react";
import ChatInterface from "@/components/messaging/ChatInterface";
import type { Chat, Message } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { getChatDetails, getChatMessages } from "@/services/chatService";

interface IndividualChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default function IndividualChatPage({ params }: IndividualChatPageProps) {
  const { chatId } = use(params);
  const { currentUser, loading: authLoading } = useAuthContext();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      if (authLoading || !currentUser) { setPageLoading(true); return; }
      if (!chatId) { setError("Chat ID is missing."); setPageLoading(false); return; }

      setPageLoading(true);
      setError(null);
      try {
        const fetchedChat = await getChatDetails(Number(chatId));
        if (fetchedChat && fetchedChat.participants_data?.some(p => p.id === currentUser.id)) {
          setChat(fetchedChat);
          const fetchedMessages = await getChatMessages(Number(chatId));
          setMessages(fetchedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        } else {
          setError("Chat not found or you do not have access.");
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load chat.");
      } finally {
        setPageLoading(false);
      }
    };
    fetchChatData();
  }, [chatId, currentUser, authLoading]);

  if (pageLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4"><Link href="/messages">Back to Messages</Link></Button>
      </div>
    );
  }

  if (!chat || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Chat Not Found</AlertTitle>
          <AlertDescription>The chat you are looking for does not exist or you do not have access.</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4"><Link href="/messages">Back to Messages</Link></Button>
      </div>
    );
  }

  return (
    <div className="py-0 md:py-8 h-full">
      <ChatInterface chat={chat} initialMessages={messages} currentUserId={currentUser.uid} />
    </div>
  );
}
