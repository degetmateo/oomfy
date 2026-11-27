import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { OutgoingChatPayload } from '../components/chat/ChatInputBar.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { useChatMessagesModel } from './useChatModel.js';
import { buildChatSendBody, buildOptimisticChatMsg } from './chatHookHelpers.js';
import { useViewActive } from '../contexts/ViewActivityContext.js';

export function useChatMessages(chatId: string, currentUserId: string, scrollToBottom: (b?: ScrollBehavior, force?: boolean) => void) {
  const queryClient = useQueryClient();
  const isViewActive = useViewActive();
  const isViewActiveRef = useRef(isViewActive);
  isViewActiveRef.current = isViewActive;

  const currentUser = useAuthStore((s) => s.user);
  const messages = useChatMessagesModel(chatId);
  const [isLoading, setIsLoading] = useState(() => !chatIdentityMap.getMessages(chatId)?.length);
  const [hasMore, setHasMore] = useState(() => chatIdentityMap.hasMore(chatId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0), typingTimerRef = useRef<any>(null), typingAutoClearTimerRef = useRef<any>(null);

  const setMessages = useCallback((updater: any[] | ((prev: any[]) => any[])) => {
    const prev = chatIdentityMap.getMessages(chatId) || [];
    chatIdentityMap.ingestMessages(chatId, typeof updater === 'function' ? updater(prev) : updater, 'replace', Date.now(), false);
  }, [chatId]);

  const markRead = useCallback(() => ApiClient.post(`/chats/${chatId}/read`).then(() => {
    chatIdentityMap.patchChat(chatId, (c) => ({ ...c, unread_count: 0 }));
    queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    queryClient.invalidateQueries({ queryKey: ['chats'] });
  }).catch(() => {}), [chatId, queryClient]);

  useEffect(() => {
    if (!chatId) return;
    if (isViewActive) {
      SocketClient.setActiveChat(chatId);
      void markRead();
    } else if (SocketClient.getActiveChatId()?.toLowerCase() === chatId.toLowerCase()) {
      SocketClient.setActiveChat(null);
    }
  }, [isViewActive, chatId, markRead]);

  useEffect(() => {
    let active = true;
    setIsLoading(!chatIdentityMap.getMessages(chatId)?.length); setHasMore(chatIdentityMap.hasMore(chatId));
    const fetchAndMark = (initial = false, force = false) => {
      if (!force && !chatIdentityMap.isMessagesStale(chatId, 60_000) && chatIdentityMap.getMessages(chatId) !== undefined) {
        setIsLoading(false);
        return isViewActiveRef.current ? void markRead() : undefined;
      }
      if (initial && !chatIdentityMap.getMessages(chatId)?.length) setIsLoading(true);
      const startedAt = Date.now();
      return ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chatId}/messages?limit=30`).then((res) => {
        if (!active) return;
        const list = res.data || [], hasMoreFlag = list.length >= 30;
        const existing = chatIdentityMap.getMessages(chatId) || [];
        const pending = existing.filter((m) => m.deliveryState || new Date(m.created_at).getTime() > startedAt);
        const mode = !initial && existing.length > list.length ? 'append' : 'replace';
        chatIdentityMap.ingestMessages(chatId, list, mode, startedAt, true, mode === 'replace' ? hasMoreFlag : undefined);
        pending.forEach((m) => chatIdentityMap.upsertMessage(chatId, m));
        if (mode === 'replace') setHasMore(hasMoreFlag);
        if (isViewActiveRef.current) void markRead();
      }).finally(() => { if (initial && active) setIsLoading(false); });
    };
    void fetchAndMark(true, false);
    const socket = SocketClient.getSocket(), joinAndSync = () => { socket.emit('join-chat', chatId); void fetchAndMark(false, true); };
    SocketClient.trackChatRoom(chatId);
    if (isViewActiveRef.current) SocketClient.setActiveChat(chatId);
    socket.emit('join-chat', chatId);
    const handleMessage = (msg: any) => {
      if (msg.chat_id?.toLowerCase() !== chatId.toLowerCase()) return;
      chatIdentityMap.upsertMessage(chatId, msg); setTypingUser(null);
      if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      const isMine = msg.sender_id === currentUserId;
      if (isViewActiveRef.current) {
        setTimeout(() => scrollToBottom('smooth', isMine), 30);
        if (!isMine) void markRead(); else queryClient.invalidateQueries({ queryKey: ['chats'] });
      } else if (!isMine) {
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
    };
    const handleTyping = (d: { chatId: string; userId: string; username: string }) => {
      if (d.chatId?.toLowerCase() !== chatId.toLowerCase() || d.userId === currentUserId) return;
      setTypingUser(d.username);
      if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      typingAutoClearTimerRef.current = setTimeout(() => setTypingUser(null), 4000);
    };
    const handleStopTyping = (d: { chatId: string; userId: string }) => { if (d.chatId?.toLowerCase() === chatId.toLowerCase() && d.userId !== currentUserId) setTypingUser(null); };
    const handleDelete = ({ messageId }: { messageId: string }) => { chatIdentityMap.removeMessage(chatId, messageId); queryClient.invalidateQueries({ queryKey: ['chats'] }); };
    const onFallbackSync = () => { if (isViewActiveRef.current && document.visibilityState === 'visible' && !SocketClient.isConnected()) void fetchAndMark(false, true); };
    const onClientSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ chatId?: string }>).detail;
      if (isViewActiveRef.current && detail?.chatId === chatId.toLowerCase()) { void markRead(); scrollToBottom('smooth', false); }
    };
    ['new-message', 'new_chat_message'].forEach((ev) => socket.on(ev, handleMessage));
    socket.on('connect', joinAndSync); socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping); socket.on('delete-message', handleDelete);
    document.addEventListener('visibilitychange', onFallbackSync); window.addEventListener('focus', onFallbackSync);
    window.addEventListener('oomfy:client-sync', onClientSyncEvent);
    return () => {
      active = false;
      if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
      if (typingAutoClearTimerRef.current) { clearTimeout(typingAutoClearTimerRef.current); typingAutoClearTimerRef.current = null; }
      if (SocketClient.getActiveChatId()?.toLowerCase() === chatId.toLowerCase()) SocketClient.setActiveChat(null);
      ['new-message', 'new_chat_message'].forEach((ev) => socket.off(ev, handleMessage));
      socket.off('connect', joinAndSync); socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping); socket.off('delete-message', handleDelete);
      document.removeEventListener('visibilitychange', onFallbackSync); window.removeEventListener('focus', onFallbackSync);
      window.removeEventListener('oomfy:client-sync', onClientSyncEvent);
      if (lastTypingSentRef.current > 0) socket.emit('typing-stop', { chatId });
    };
  }, [chatId, currentUserId, queryClient, markRead]);

  const sendOptimisticMessage = async (payload: OutgoingChatPayload, existingTempId?: string) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingSentRef.current = 0; SocketClient.getSocket().emit('typing-stop', { chatId });
    const tempId = existingTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = buildOptimisticChatMsg(tempId, chatId, currentUserId, currentUser, payload);
    chatIdentityMap.upsertMessage(chatId, optimisticMsg, existingTempId);
    setTimeout(() => scrollToBottom('smooth', true), 20);
    try {
      const res = await ApiClient.post<any>('/chats/messages', buildChatSendBody(chatId, payload));
      if (res?.data) chatIdentityMap.upsertMessage(chatId, res.data, tempId);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch { chatIdentityMap.upsertMessage(chatId, { ...optimisticMsg, deliveryState: 'error' }, tempId); }
  };

  return { messages, setMessages, isLoading, hasMore, setHasMore, loadingMore, setLoadingMore, typingUser, lastTypingSentRef, typingTimerRef, sendOptimisticMessage };
}
