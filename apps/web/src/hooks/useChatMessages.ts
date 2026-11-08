import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { OutgoingChatPayload } from '../components/chat/ChatInputBar.js';

export function useChatMessages(chatId: string, currentUserId: string, scrollToBottom: (b?: ScrollBehavior) => void) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0), typingTimerRef = useRef<any>(null), typingAutoClearTimerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chatId}/messages?limit=30`).then((res) => {
      if (!active) return;
      const list = res.data || [];
      setMessages(list); setHasMore(list.length >= 30);
      setTimeout(() => scrollToBottom('instant'), 30);
      ApiClient.post(`/chats/${chatId}/read`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [chatId]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    socket.emit('join-chat', chatId);
    const handleMessage = (msg: any) => {
      if (msg.chat_id !== chatId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setTypingUser(null);
      if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      setTimeout(() => scrollToBottom('smooth'), 30);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };
    const handleTyping = (d: { chatId: string; userId: string; username: string }) => {
      if (d.chatId !== chatId || d.userId === currentUserId) return;
      setTypingUser(d.username); scrollToBottom('smooth');
      if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      typingAutoClearTimerRef.current = setTimeout(() => setTypingUser(null), 4000);
    };
    const handleStopTyping = (d: { chatId: string; userId: string }) => { if (d.chatId === chatId && d.userId !== currentUserId) setTypingUser(null); };
    const handleDelete = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId)); queryClient.invalidateQueries({ queryKey: ['chats'] });
    };
    socket.on('new-message', handleMessage); socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping); socket.on('delete-message', handleDelete);
    return () => {
      socket.off('new-message', handleMessage); socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping); socket.off('delete-message', handleDelete);
      if (lastTypingSentRef.current > 0) socket.emit('typing-stop', { chatId });
    };
  }, [chatId, currentUserId, queryClient]);

  const sendOptimisticMessage = async (payload: OutgoingChatPayload, existingTempId?: string) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingSentRef.current = 0;
    SocketClient.getSocket().emit('typing-stop', { chatId });
    const tempId = existingTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrls = payload.files.map((f) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : ''));
    const optimisticMsg = {
      id: tempId, chat_id: chatId, sender_id: currentUserId,
      sender: { id: currentUserId, username: currentUser?.username || '', name: currentUser?.name || 'Tú', icon_url: currentUser?.icon_url || null },
      content: payload.content, reply_to_id: payload.replyToId, media_urls: previewUrls, gif_url: payload.gifUrl,
      reply_to: payload.replyTo ? { id: payload.replyTo.id, content: payload.replyTo.content, sender_username: payload.replyTo.sender?.username, sender_name: payload.replyTo.sender?.name } : null,
      created_at: new Date().toISOString(), deliveryState: 'sending', retryPayload: payload,
    };
    setMessages((prev) => existingTempId ? prev.map((m) => (m.id === tempId ? { ...m, deliveryState: 'sending' } : m)) : [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 20);
    try {
      const fd = new FormData();
      if (payload.files.length > 0) {
        fd.append('chat_id', chatId);
        if (payload.content) fd.append('content', payload.content);
        if (payload.replyToId) fd.append('reply_to_id', payload.replyToId);
        if (payload.gifUrl) fd.append('gif_url', payload.gifUrl);
        payload.files.forEach((f) => fd.append('images', f));
      }
      const res = payload.files.length > 0
        ? await ApiClient.post<any>('/chats/messages', fd)
        : await ApiClient.post<any>('/chats/messages', { chat_id: chatId, content: payload.content, reply_to_id: payload.replyToId, gif_url: payload.gifUrl });
      if (res?.data) {
        setMessages((prev) => prev.some((m) => m.id === res.data.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? res.data : m)));
      }
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, deliveryState: 'error' } : m)));
    }
  };

  return { messages, setMessages, isLoading, hasMore, setHasMore, loadingMore, setLoadingMore, typingUser, lastTypingSentRef, typingTimerRef, sendOptimisticMessage };
}
