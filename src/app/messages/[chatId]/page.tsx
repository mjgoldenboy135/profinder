"use client";

import ChatInterface from "@/components/messaging/ChatInterface";
import { placeholderChats, placeholderMessages, getCurrentUser } from "@/lib/placeholder-data";
import type { Chat, Message, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface IndividualChatPageProps {
  params: {
    chatId: string;
  };
}

export default function IndividualChatPage({ params }: IndividualChatPageProps) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchedUser = getCurrentUser();
    setCurrentUser(fetchedUser);

    const foundChat = placeholderChats.find(c => c.id === params.chatId && c.participantIds.includes(fetchedUser.id));
    if (foundChat) {
      setChat(foundChat);
      // Filter messages for this specific chat
      const chatMessages = placeholderMessages.filter(m => m.chatId === params.chatId).sort((a,b) => a.timestamp - b.timestamp);
      setMessages(chatMessages);
    }
    setLoading(false);
  }, [params.chatId]);

  if (loading) {
    return <p className="text-center py-10">Loading chat...</p>; // Or a skeleton loader
  }

  if (!chat || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Chat Not Found</AlertTitle>
          <AlertDescription>
            The chat you are looking for does not exist or you do not have access.
          </AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
            <Link href="/messages">Back to Messages</Link>
        </Button>
      </div>
    );
  }
  
  // Ensure participants are populated for ChatInterface
  // This would typically be handled by the backend or a more sophisticated data fetching layer
  if (chat && !chat.participants) {
      const participantDetails = chat.participantIds.map(id => placeholderUsers.find(u => u.id === id)).filter(Boolean) as User[];
      chat.participants = participantDetails.map(p => ({ id: p.id, fullName: p.fullName, profilePictureUrl: p.profilePictureUrl }));
  }


  return (
    <div className="py-0 md:py-8 h-full"> {/* Adjust padding for different screen sizes */}
      <ChatInterface chat={chat} initialMessages={messages} currentUserId={currentUser.id} />
    </div>
  );
}
