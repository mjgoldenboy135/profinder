
"use client";

import { use, useEffect, useState } from "react"; // Import 'use' from React
import ChatInterface from "@/components/messaging/ChatInterface";
import type { Chat, Message, User as AppUser } from "@/lib/types"; // Renamed User to AppUser to avoid conflict
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { getChatDetails, getChatMessages } from "@/services/chatService";
import type { Timestamp } from "firebase/firestore";

interface IndividualChatPageProps {
  params: {
    chatId: string;
  };
}

// Helper to convert Firestore Timestamps in messages
const processMessageTimestamps = (msg: Message): Message => {
  let timestamp = msg.timestamp;
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    timestamp = (timestamp as Timestamp).toMillis();
  }
  return { ...msg, timestamp };
};


export default function IndividualChatPage({ params }: IndividualChatPageProps) {
  // Unwrap the params object using React.use() as suggested by the Next.js warning
  const resolvedParams = use(params);
  const { chatId } = resolvedParams;

  const { currentUser, loading: authLoading } = useAuthContext();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      if (authLoading || !currentUser) {
        setPageLoading(true);
        return;
      }
      if (!chatId) {
        setError("Chat ID is missing.");
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      setError(null);
      try {
        const fetchedChat = await getChatDetails(chatId);
        if (fetchedChat && fetchedChat.participantIds.includes(currentUser.uid)) {
          // Serialize timestamps if they are Firestore Timestamps
          const serializableChat = { ...fetchedChat };
          if (serializableChat.createdAt && typeof serializableChat.createdAt === 'object' && 'toMillis' in serializableChat.createdAt) {
            serializableChat.createdAt = (serializableChat.createdAt as Timestamp).toMillis();
          }
          if (serializableChat.updatedAt && typeof serializableChat.updatedAt === 'object' && 'toMillis' in serializableChat.updatedAt) {
            serializableChat.updatedAt = (serializableChat.updatedAt as Timestamp).toMillis();
          }
          if (serializableChat.lastMessageTimestamp && typeof serializableChat.lastMessageTimestamp === 'object' && 'toMillis' in serializableChat.lastMessageTimestamp) {
            serializableChat.lastMessageTimestamp = (serializableChat.lastMessageTimestamp as Timestamp).toMillis();
          }
          setChat(serializableChat as Chat);

          const { messages: fetchedMessages, clearedAt: clearedAtTs } = await getChatMessages(chatId, currentUser.uid);
          setMessages(
            fetchedMessages
              .map(processMessageTimestamps)
              .sort((a, b) => (a.timestamp as number) - (b.timestamp as number))
          );
          if (clearedAtTs) {
            const millis = typeof (clearedAtTs as any).toMillis === 'function'
              ? (clearedAtTs as Timestamp).toMillis()
              : (clearedAtTs as unknown as number);
            setClearedAt(millis);
          } else {
            setClearedAt(null);
          }
        } else {
          setError("Chat not found or you do not have access.");
          setChat(null);
        }
      } catch (err: any) {
        console.error("Error fetching chat data:", err);
        setError(err.message || "Failed to load chat.");
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
        <Button variant="link" asChild className="mt-4">
            <Link href="/messages">Back to Messages</Link>
        </Button>
      </div>
    );
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
    <div className="py-0 md:py-8 h-full">
      <ChatInterface
        chat={chat}
        initialMessages={messages}
        currentUserId={currentUser.uid}
        clearedAt={clearedAt ?? undefined}
      />
    </div>
  );
}
