import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { useChatsListModel } from './useChatModel.js';
import { syncChatListQueryOnMessage } from './chatHookHelpers.js';

export function useChatsList(userId?: string, selectedChatId?: string | null, isViewActive = true) {
  const queryClient = useQueryClient();
  const lastMissingRef = useRef<string | null>(null);
  const wasViewActiveRef = useRef(isViewActive);
  const isViewActiveRef = useRef(isViewActive);
  isViewActiveRef.current = isViewActive;
  const [typingChats, setTypingChats] = useState<Record<string, string>>({});
  const typingTimersRef = useRef<Record<string, any>>({});
  const modelChats = useChatsListModel();

  const { data: chatsData, isLoading, refetch } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chats'],
    queryFn: async () => {
      const fetchedAt = Date.now();
      const res = await ApiClient.get<{ success: boolean; data: any[] }>('/chats');
      if (res?.data) chatIdentityMap.ingestChats(res.data, fetchedAt);
      return res;
    },
    placeholderData: () => {
      const cached = chatIdentityMap.getChats();
      return cached.length > 0 ? { success: true, data: cached } : undefined;
    },
    staleTime: 30_000, enabled: Boolean(userId), refetchInterval: isViewActive ? 10000 : false,
  });

  useEffect(() => {
    const prev = wasViewActiveRef.current;
    wasViewActiveRef.current = isViewActive;
    if (!prev && isViewActive && userId) {
      void refetch();
    }
  }, [isViewActive, userId, refetch]);

  const chats = modelChats.length > 0 ? modelChats : (chatsData?.data || []);

  useEffect(() => {
    if (!selectedChatId) { lastMissingRef.current = null; return; }
    const exists = chats.some((c) => c.id?.toLowerCase() === selectedChatId.toLowerCase());
    if (exists) lastMissingRef.current = null;
    else if (!isLoading && lastMissingRef.current !== selectedChatId) {
      lastMissingRef.current = selectedChatId;
      queryClient.refetchQueries({ queryKey: ['chats'] });
    }
  }, [selectedChatId, isLoading, chats, queryClient]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    const clearChatTyping = (cid: string) => {
      if (typingTimersRef.current[cid]) clearTimeout(typingTimersRef.current[cid]);
      setTypingChats((prev) => { if (!prev[cid]) return prev; const { [cid]: _, ...rest } = prev; return rest; });
    };

    const handleNewChatMessage = (msg: any) => {
      const msgChatId = msg.chat_id?.toLowerCase();
      if (msgChatId) clearChatTyping(msgChatId);
      const isActive = isViewActiveRef.current && selectedChatId?.toLowerCase() === msgChatId;
      let found = Boolean(msg.chat_id && chatIdentityMap.getChat(msg.chat_id));
      if (msg.chat_id) {
        chatIdentityMap.upsertMessage(msg.chat_id, msg);
        chatIdentityMap.patchChat(msg.chat_id, (c) => ({
          ...c, unread_count: isActive ? 0 : (c.unread_count || 0) + (msg.sender_id !== userId ? 1 : 0),
        }));
      }
      if (syncChatListQueryOnMessage(queryClient, msg, userId, isViewActiveRef.current ? selectedChatId : null)) found = true;
      if (!found) queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };

    const handleTyping = (d: { chatId: string; userId: string; username: string }) => {
      if (!d?.chatId || d.userId === userId) return;
      const cid = d.chatId.toLowerCase();
      setTypingChats((prev) => ({ ...prev, [cid]: d.username }));
      if (typingTimersRef.current[cid]) clearTimeout(typingTimersRef.current[cid]);
      typingTimersRef.current[cid] = setTimeout(() => clearChatTyping(cid), 4000);
    };
    const handleStopTyping = (d: { chatId: string; userId: string }) => {
      if (d?.chatId && d.userId !== userId) clearChatTyping(d.chatId.toLowerCase());
    };

    socket.on('new_chat_message', handleNewChatMessage); socket.on('user-typing', handleTyping); socket.on('user-stop-typing', handleStopTyping);
    return () => {
      socket.off('new_chat_message', handleNewChatMessage); socket.off('user-typing', handleTyping); socket.off('user-stop-typing', handleStopTyping);
      Object.values(typingTimersRef.current).forEach(clearTimeout);
    };
  }, [queryClient, selectedChatId, userId]);

  const markChatOpened = (chatId: string) => {
    chatIdentityMap.patchChat(chatId, (c) => ({ ...c, unread_count: 0 }));
    queryClient.setQueryData(['chats'], (old: any) =>
      old?.data ? { ...old, data: old.data.map((c: any) => c.id?.toLowerCase() === chatId.toLowerCase() ? { ...c, unread_count: 0 } : c) } : old
    );
  };

  return { chats, isLoading: isLoading && chats.length === 0, markChatOpened, typingChats };
}
