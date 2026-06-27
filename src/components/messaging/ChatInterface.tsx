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
import { sendMessage, subscribeToChat } from "@/services/chatService";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  chat: Chat;
  initialMessages: Message[];
  currentUserId: string;
}

export default function ChatInterface({ chat, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    [...initialMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  );
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const otherParticipant = chat.participants_data?.find(p => String(p.id) !== currentUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chat.id) return;
    const unsubscribe = subscribeToChat(
      chat.id,
      (msg) => {
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      }
    );
    return unsubscribe;
  }, [chat.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherParticipant) return;

    setIsSending(true);
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      chat_id: chat.id,
      sender_id: Number(currentUserId),
      receiver_id: otherParticipant.id,
      text: newMessage,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    const textToSend = newMessage;
    setNewMessage("");

    try {
      const sent = await sendMessage(chat.id, textToSend);
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m));
    } catch {
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!otherParticipant) {
    return <div className="p-4 text-center">Loading participant details...</div>;
  }

  const participantFullName = otherParticipant.full_name?.trim();
  const fallbackName = participantFullName
    ? participantFullName.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";
  const avatarSrc = otherParticipant.profile_picture_url || `https://placehold.co/40x40.png?text=${encodeURIComponent(fallbackName)}`;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-card border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center p-3 border-b bg-muted/50">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden" asChild>
          <Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Link href={`/users/${otherParticipant.id}`} passHref>
          <Avatar className="h-10 w-10 border cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={avatarSrc} alt={participantFullName || "User"} />
            <AvatarFallback>{fallbackName}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="ml-3">
          <Link href={`/users/${otherParticipant.id}`} className="hover:underline">
            <h3 className="font-semibold font-headline">{participantFullName || "Unknown User"}</h3>
          </Link>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end gap-2 max-w-[75%]",
              msg.sender_id === Number(currentUserId) ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {msg.sender_id !== Number(currentUserId) && (
              <Avatar className="h-8 w-8 self-start border">
                <AvatarImage src={avatarSrc} alt={participantFullName || "User"} />
                <AvatarFallback>{fallbackName[0] || "?"}</AvatarFallback>
              </Avatar>
            )}
            <div className={cn(
              "p-3 rounded-xl shadow",
              msg.sender_id === Number(currentUserId)
                ? "bg-primary text-primary-foreground rounded-br-none"
                : "bg-muted text-foreground rounded-bl-none"
            )}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={cn(
                "text-xs mt-1",
                msg.sender_id === Number(currentUserId) ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70 text-left"
              )}>
                {msg.created_at ? format(new Date(msg.created_at), "p") : "Sending..."}
                {msg.sender_id === Number(currentUserId) && msg.status && msg.id > 0 && (
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
