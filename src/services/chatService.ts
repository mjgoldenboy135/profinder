import { apiFetch, WS_BASE_URL, getAccessToken } from '@/lib/api';
import { Chat, Message } from '@/lib/types';

export async function getUserChats(): Promise<Chat[]> {
  const res = await apiFetch('/chats/');
  if (!res.ok) return [];
  return res.json();
}

export async function getChatDetails(chatId: number): Promise<Chat | null> {
  const res = await apiFetch(`/chats/${chatId}/`);
  if (!res.ok) return null;
  return res.json();
}

export async function getChatMessages(chatId: number): Promise<Message[]> {
  const res = await apiFetch(`/chats/${chatId}/messages/`);
  if (!res.ok) return [];
  return res.json();
}

export async function sendMessage(chatId: number, text: string): Promise<Message> {
  const res = await apiFetch(`/chats/${chatId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function findOrCreateChat(otherUserId: number): Promise<Chat> {
  const res = await apiFetch('/chats/', {
    method: 'POST',
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  if (!res.ok) throw new Error('Failed to create chat');
  return res.json();
}

export async function deleteChat(chatId: number): Promise<void> {
  await apiFetch(`/chats/${chatId}/`, { method: 'DELETE' });
}

export function subscribeToChat(
  chatId: number,
  onMessage: (message: Message) => void,
  onError?: (error: Event) => void
): () => void {
  const token = getAccessToken();
  const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${chatId}/?token=${token}`);

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as Message;
      onMessage(message);
    } catch {}
  };

  if (onError) ws.onerror = onError;

  return () => ws.close();
}
