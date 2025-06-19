
"use client";

import type { Message, Chat } from "@/lib/types";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { sendMessage } from "@/services/chatService";
import { useToast } from "@/hooks/use-toast";
import type { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

interface ChatInterfaceProps {
  chat: Chat;
  initialMessages: Message[];
  currentUserId: string;
}

const processMessageTimestamps = (msg: Message): Message => {
  let timestamp = msg.timestamp;
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    timestamp = (timestamp as Timestamp).toMillis();
  }
  return { ...msg, timestamp };
};

// Helper function to determine a valid image source or fallback to a placeholder
const getValidImageSrc = (rawUrl: string | undefined | null, placeholder: string, context: string): string => {
  console.log(`[${context}] getValidImageSrc called with rawUrl:`, rawUrl, "placeholder:", placeholder);
  if (rawUrl && typeof rawUrl === 'string') {
    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl !== "" && trimmedUrl.toLowerCase() !== 'null' && trimmedUrl.toLowerCase() !== 'undefined') {
      try {
        if (trimmedUrl.startsWith("http:") || trimmedUrl.startsWith("https:") || trimmedUrl.startsWith("data:")) {
          console.log(`[${context}] Using potentially valid profilePictureUrl: "${trimmedUrl}"`);
          return trimmedUrl;
        } else {
          console.warn(`[${context}] Invalid protocol or scheme for profilePictureUrl: "${trimmedUrl}", falling back to placeholder.`);
        }
      } catch (e) {
        console.warn(`[${context}] Invalid profilePictureUrl structure: "${trimmedUrl}", (Error: ${(e as Error).message}), falling back to placeholder.`);
      }
    } else {
       console.warn(`[${context}] profilePictureUrl is effectively empty (was "${rawUrl}"), falling back to placeholder.`);
    }
  } else {
    console.warn(`[${context}] profilePictureUrl is null, undefined, empty string, or not a string. Value:`, rawUrl, `Falling back to placeholder.`);
  }
  console.log(`[${context}] Falling back to placeholder: "${placeholder}"`);
  return placeholder;
};


export default function ChatInterface({ chat, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages.map(processMessageTimestamps).sort((a,b) => (a.timestamp as number) - (b.timestamp as number)));
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const otherParticipant = chat.participantsData?.find(p => p.id !== currentUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chat.id) return;
    const messagesRef = collection(db, "chats", chat.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({ id: doc.id, chatId: chat.id, ...doc.data() } as Message));
        setMessages(newMessages.map(processMessageTimestamps).sort((a,b) => (a.timestamp as number) - (b.timestamp as number)));
      },
      (error) => {
        console.error("Error listening to messages:", error);
        toast({ title: "Error", description: "Could not load new messages in real-time.", variant: "destructive" });
      }
    );
    return () => unsubscribe();
  }, [chat.id, toast]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !otherParticipant) return;

    setIsSending(true);
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempMessageId,
      chatId: chat.id,
      senderId: currentUserId,
      receiverId: otherParticipant.id,
      text: newMessage,
      timestamp: Date.now(),
      status: 'sent',
    };
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);

    const messageTextToSend = newMessage;
    setNewMessage("");

    try {
      const sentMessageId = await sendMessage(chat.id, {
        senderId: currentUserId,
        receiverId: otherParticipant.id,
        text: messageTextToSend,
      });
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === tempMessageId ? { ...msg, id: sentMessageId, status: 'delivered' } : msg
        )
      );

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Send Error",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessageId));
      setNewMessage(messageTextToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!otherParticipant) {
    console.warn("[ChatInterface] otherParticipant is undefined. Chat data:", chat);
    return <div className="p-4 text-center">Loading participant details... If this persists, there might be an issue with chat data.</div>;
  }

  const participantFullName = otherParticipant.fullName?.trim();
  const fallbackName = participantFullName && participantFullName !== ""
    ? participantFullName.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";
  
  const headerPlaceholderUrl = `https://placehold.co/40x40.png?text=${encodeURIComponent(fallbackName)}`;
  const messagePlaceholderUrl = `https://placehold.co/32x32.png?text=${encodeURIComponent(fallbackName[0] || '?')}`;

  const headerImageSrc = getValidImageSrc(otherParticipant.profilePictureUrl, headerPlaceholderUrl, `ChatInterface-HeaderAvatar-Participant-${otherParticipant.id}`);
  const messageAvatarSrc = getValidImageSrc(otherParticipant.profilePictureUrl, messagePlaceholderUrl, `ChatInterface-MessageAvatar-Participant-${otherParticipant.id}`);
  
  console.log(`[ChatInterface DEBUG Participant ${otherParticipant.id}] Raw URL: '${otherParticipant.profilePictureUrl}', Processed Message SRC: '${messageAvatarSrc}', Processed Header SRC: '${headerImageSrc}'`);


  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-card border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center p-3 border-b bg-muted/50">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden" asChild>
          <Link href="/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Link href={`/users/${otherParticipant.id}`} passHref>
          <Avatar className="h-10 w-10 border cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={headerImageSrc} alt={participantFullName || "User"} />
            <AvatarFallback>{fallbackName}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="ml-3">
          <Link href={`/users/${otherParticipant.id}`} className="hover:underline">
            <h3 className="font-semibold font-headline">{participantFullName || "Unknown User"}</h3>
          </Link>
          {/* <p className="text-xs text-muted-foreground">
            {otherParticipant.isOnline ? "Online" : "Offline"}
          </p> */}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end gap-2 max-w-[75%]",
              msg.senderId === currentUserId ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {msg.senderId !== currentUserId && (
              <Avatar className="h-8 w-8 self-start border">
                 <AvatarImage src={messageAvatarSrc} alt={participantFullName || "User"} />
                 <AvatarFallback>{fallbackName[0] || "?"}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "p-3 rounded-xl shadow",
                msg.senderId === currentUserId
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={cn(
                  "text-xs mt-1",
                  msg.senderId === currentUserId ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70 text-left"
              )}>
                {msg.timestamp ? format(new Date(msg.timestamp as number), "p") : "Sending..."}
                {msg.senderId === currentUserId && msg.status && msg.id && !msg.id.startsWith('temp-') && (
                  <span className="ml-1">
                    {msg.status === 'sent' && '✓'}
                    {msg.status === 'delivered' && '✓✓'}
                    {msg.status === 'read' && <span className="text-accent">✓✓</span>}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="border-t p-3 bg-muted/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-background focus-visible:ring-1 focus-visible:ring-primary"
            autoComplete="off"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
    
