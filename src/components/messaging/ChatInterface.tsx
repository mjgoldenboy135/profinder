"use client";

import type { Message, User, Chat } from "@/lib/types";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, UserCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { placeholderMessages, getCurrentUser } from "@/lib/placeholder-data";

interface ChatInterfaceProps {
  chat: Chat; // Contains participants info
  initialMessages: Message[];
  currentUserId: string;
}

export default function ChatInterface({ chat, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Simulate receiving messages for demo
  useEffect(() => {
    if (otherParticipant && messages.length > 0 && messages.length < 5) { // Limit simulation
      const timer = setTimeout(() => {
        const isTypingMessage: Message = {
          id: `typing-${Date.now()}`,
          chatId: chat.id,
          senderId: otherParticipant.id,
          receiverId: currentUserId,
          text: `${otherParticipant.fullName} is typing...`,
          timestamp: Date.now(),
          status: 'delivered', 
        };
        // setMessages(prev => [...prev, isTypingMessage]);

        // Actual reply after "typing"
        // setTimeout(() => {
        //   setMessages(prev => prev.filter(m => !m.id.startsWith('typing-'))); // Remove typing indicator
          const replyMessage: Message = {
            id: `reply-${Date.now()}`,
            chatId: chat.id,
            senderId: otherParticipant.id,
            receiverId: currentUserId,
            text: `Thanks for your message! This is an automated reply from ${otherParticipant.fullName}.`,
            timestamp: Date.now(),
            status: 'delivered',
          };
        //   setMessages(prev => [...prev, replyMessage]);
        // }, 1500 + Math.random() * 1000);

      }, 2000 + Math.random() * 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, chat.id, currentUserId, otherParticipant]);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    const messageToSend: Message = {
      id: `msg-${Date.now()}`,
      chatId: chat.id,
      senderId: currentUserId,
      receiverId: otherParticipant?.id || '', // Should always have other participant
      text: newMessage,
      timestamp: Date.now(),
      status: 'sent',
    };
    setMessages([...messages, messageToSend]);
    setNewMessage("");

    // Simulate other user reading and replying
    // This logic would be handled by backend and websockets in a real app
    setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === messageToSend.id ? {...m, status: 'delivered'} : m));
    }, 500);
     setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === messageToSend.id ? {...m, status: 'read'} : m));
    }, 1500);
  };

  if (!otherParticipant) {
    return <p>Loading chat...</p>; // Or some error state
  }
  
  const otherParticipantFallback = otherParticipant.fullName.split(" ").map(n => n[0]).join("");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-card border rounded-lg shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center p-3 border-b bg-muted/50">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden" asChild>
          <Link href="/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={otherParticipant.profilePictureUrl || `https://placehold.co/40x40.png?text=${otherParticipantFallback}`} alt={otherParticipant.fullName} />
          <AvatarFallback>{otherParticipantFallback}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h3 className="font-semibold font-headline">{otherParticipant.fullName}</h3>
          <p className="text-xs text-muted-foreground">
            {otherParticipant.isOnline ? "Online" : "Offline"} 
            {/* Add "Typing..." indicator here if needed */}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end gap-2 max-w-[75%]",
              msg.senderId === currentUserId ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {msg.senderId !== currentUserId && (
              <Avatar className="h-8 w-8 self-start border">
                 <AvatarImage src={otherParticipant.profilePictureUrl || `https://placehold.co/32x32.png?text=${otherParticipantFallback}`} alt={otherParticipant.fullName} />
                 <AvatarFallback>{otherParticipantFallback[0]}</AvatarFallback>
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
                {format(new Date(msg.timestamp), "p")}
                {msg.senderId === currentUserId && msg.status && (
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

      {/* Message Input */}
      <div className="border-t p-3 bg-muted/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-background focus-visible:ring-1 focus-visible:ring-primary"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
