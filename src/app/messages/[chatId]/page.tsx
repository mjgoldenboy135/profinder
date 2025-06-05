
"use client";

import { useEffect, useState, use } from "react";
import ChatInterface from "@/components/messaging/ChatInterface";
import { placeholderChats, placeholderMessages, getCurrentUser, placeholderUsers } from "@/lib/placeholder-data";
import type { Chat, Message, User } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface IndividualChatPageProps {
  params: {
    chatId: string;
  };
}

export default function IndividualChatPage({ params: paramsProp }: IndividualChatPageProps) {
  const params = use(paramsProp);
  const { chatId } = params;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchedUser = getCurrentUser();
    setCurrentUser(fetchedUser);

    const rawFoundChat = placeholderChats.find(c => c.id === chatId && c.participantIds.includes(fetchedUser.id));

    if (rawFoundChat) {
      let populatedChat = { ...rawFoundChat };
      // Populate participants if not already present or empty
      if (!populatedChat.participants || populatedChat.participants.length === 0) {
        const participantDetails = populatedChat.participantIds
          .map(id => placeholderUsers.find(u => u.id === id))
          .filter(Boolean) as User[];
        populatedChat.participants = participantDetails.map(p => ({
          id: p.id,
          fullName: p.fullName,
          profilePictureUrl: p.profilePictureUrl,
        }));
      }
      setChat(populatedChat);

      const chatMessages = placeholderMessages.filter(m => m.chatId === chatId).sort((a,b) => a.timestamp - b.timestamp);
      setMessages(chatMessages);
    } else {
      setChat(null); 
      setMessages([]); 
    }
    setLoading(false);
  }, [chatId]);

  if (loading) {
    return <p className="text-center py-10">Loading chat...</p>;
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
  
  return (
    <div className="py-0 md:py-8 h-full"> {/* Adjust padding for different screen sizes */}
      <ChatInterface chat={chat} initialMessages={messages} currentUserId={currentUser.id} />
    </div>
  );
}
