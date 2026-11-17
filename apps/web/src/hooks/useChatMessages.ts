import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { OutgoingChatPayload } from '../components/chat/ChatInputBar.js';

export function useChatMessages(chatId: string, currentUserId: string, scrollToBottom: (b?: ScrollBehavior, force?: boolean) => void) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<any[]>([]), [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0), typingTimerRef = useRef<any>(null), typingAutoClearTimerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    const markRead = () => ApiClient.post(`/chats/${chatId}/read`).then(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] }); queryClient.invalidateQueries({ queryKey: ['chats'] });
    }).catch(() => {});
    const fetchAndMark = (initial = false) => {
      if (initial) setIsLoading(true);
      return ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chatId}/messages?limit=30`).then((res) => {
        if (!active) return;
        const list = res.data || [];
        setMessages(list); setHasMore(list.length >= 30);
        if (initial) setTimeout(() => scrollToBottom('instant', true), 30);
        void markRead();
      }).finally(() => { if (initial && active) setIsLoading(false); });
    };
    void fetchAndMark(true);
    const socket = SocketClient.getSocket(), joinAndSync = () => { socket.emit('join-chat', chatId); void fetchAndMark(false); };
    socket.emit('join-chat', chatId);
    const handleMessage = (msg: any) => {
      if (msg.chat_id?.toLowerCase() !== chatId.toLowerCase()) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      setTypingUser(null); if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      const isMine = msg.sender_id === currentUserId;
      setTimeout(() => scrollToBottom('smooth', isMine), 30);
      if (!isMine) void markRead(); else queryClient.invalidateQueries({ queryKey: ['chats'] });
    };
    const handleTyping = (d: { chatId: string; userId: string; username: string }) => {
      if (d.chatId?.toLowerCase() !== chatId.toLowerCase() || d.userId === currentUserId) return;
      setTypingUser(d.username);
      if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      typingAutoClearTimerRef.current = setTimeout(() => setTypingUser(null), 4000);
    };
    const handleStopTyping = (d: { chatId: string; userId: string }) => { if (d.chatId?.toLowerCase() === chatId.toLowerCase() && d.userId !== currentUserId) setTypingUser(null); };
    const handleDelete = ({ messageId }: { messageId: string }) => { setMessages((p) => p.filter((m) => m.id !== messageId)); queryClient.invalidateQueries({ queryKey: ['chats'] }); };
    const onSync = () => { if (document.visibilityState === 'visible') void fetchAndMark(false); };
    ['new-message', 'new_chat_message'].forEach((ev) => socket.on(ev, handleMessage));
    socket.on('connect', joinAndSync); socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping); socket.on('delete-message', handleDelete);
    document.addEventListener('visibilitychange', onSync); window.addEventListener('focus', onSync);
    return () => {
      active = false;
      ['new-message', 'new_chat_message'].forEach((ev) => socket.off(ev, handleMessage));
      socket.off('connect', joinAndSync); socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping); socket.off('delete-message', handleDelete);
      document.removeEventListener('visibilitychange', onSync); window.removeEventListener('focus', onSync);
      if (lastTypingSentRef.current > 0) socket.emit('typing-stop', { chatId });
    };
  }, [chatId, currentUserId, queryClient]);

  const sendOptimisticMessage = async (payload: OutgoingChatPayload, existingTempId?: string) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingSentRef.current = 0; SocketClient.getSocket().emit('typing-stop', { chatId });
    const tempId = existingTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrls = payload.files.map((f) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : ''));
    const replyMeta = payload.replyTo ? { id: payload.replyTo.id, content: payload.replyTo.content, sender_username: payload.replyTo.sender?.username, sender_name: payload.replyTo.sender?.name } : null;
    const optimisticMsg = {
      id: tempId, chat_id: chatId, sender_id: currentUserId, content: payload.content, reply_to_id: payload.replyToId,
      sender: { id: currentUserId, username: currentUser?.username || '', name: currentUser?.name || 'Tú', icon_url: currentUser?.icon_url || null },
      media_urls: previewUrls, gif_url: payload.gifUrl, created_at: new Date().toISOString(), deliveryState: 'sending', retryPayload: payload, reply_to: replyMeta,
    };
    setMessages((prev) => existingTempId ? prev.map((m) => (m.id === tempId ? { ...m, deliveryState: 'sending' } : m)) : [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth', true), 20);
    try {
      const body = payload.files.length > 0 ? (() => {
        const fd = new FormData(); fd.append('chat_id', chatId);
        if (payload.content) fd.append('content', payload.content);
        if (payload.replyToId) fd.append('reply_to_id', payload.replyToId);
        if (payload.gifUrl) fd.append('gif_url', payload.gifUrl);
        payload.files.forEach((f) => fd.append('images', f));
        return fd;
      })() : { chat_id: chatId, content: payload.content, reply_to_id: payload.replyToId, gif_url: payload.gifUrl };
      const res = await ApiClient.post<any>('/chats/messages', body);
      if (res?.data) setMessages((prev) => prev.some((m) => m.id === res.data.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? res.data : m)));
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch { setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, deliveryState: 'error' } : m))); }
  };

  return { messages, setMessages, isLoading, hasMore, setHasMore, loadingMore, setLoadingMore, typingUser, lastTypingSentRef, typingTimerRef, sendOptimisticMessage };
}
