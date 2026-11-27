import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { useAllChatsTypingModel, useChatsListModel } from './useChatModel.js';
import { syncChatListQueryOnMessage } from './chatHookHelpers.js';

export function useChatsList(userId?: string, selectedChatId?: string | null, isViewActive = true) {
  const queryClient = useQueryClient();
  const lastMissingRef = useRef<string | null>(null);
  const wasViewActiveRef = useRef(isViewActive);
  const isViewActiveRef = useRef(isViewActive);
  isViewActiveRef.current = isViewActive;
  const selectedChatIdRef = useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;
  const typingChats = useAllChatsTypingModel();
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

    const handleNewChatMessage = (msg: any) => {
      if (!msg?.chat_id || !msg?.id) return;
      const msgChatId = msg.chat_id.toLowerCase();
      const currentSelected = selectedChatIdRef.current;
      const isActive = isViewActiveRef.current && currentSelected?.toLowerCase() === msgChatId;
      const existedInModel = chatIdentityMap.receiveRealtimeMessage(msg, userId, isActive);
      const syncedQuery = syncChatListQueryOnMessage(queryClient, msg, userId, isViewActiveRef.current ? currentSelected : null);
      if (!existedInModel && !syncedQuery) queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };

    const handleTyping = (d: { chatId: string; userId: string; username: string }) => {
      if (!d?.chatId || !d.username || d.userId === userId) return;
      chatIdentityMap.setTyping(d.chatId, d.username);
    };
    const handleStopTyping = (d: { chatId: string; userId: string }) => {
      if (d?.chatId && d.userId !== userId) chatIdentityMap.clearTyping(d.chatId);
    };

    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping);
    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping);
    };
  }, [queryClient, userId]);

  const markChatOpened = useCallback((chatId: string) => {
    if ((chatIdentityMap.getChat(chatId)?.unread_count ?? 0) > 0) {
      chatIdentityMap.patchChat(chatId, (c) => ({ ...c, unread_count: 0 }));
    }
    queryClient.setQueryData(['chats'], (old: any) => {
      if (!old?.data) return old;
      const target = old.data.find((c: any) => c.id?.toLowerCase() === chatId.toLowerCase());
      if (!target || !target.unread_count) return old;
      return {
        ...old,
        data: old.data.map((c: any) => (c.id?.toLowerCase() === chatId.toLowerCase() ? { ...c, unread_count: 0 } : c)),
      };
    });
  }, [queryClient]);

  return { chats, isLoading: isLoading && chats.length === 0, markChatOpened, typingChats };
}
