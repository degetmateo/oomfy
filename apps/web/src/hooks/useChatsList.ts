import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';

export function useChatsList(userId?: string, selectedChatId?: string | null) {
  const queryClient = useQueryClient();
  const lastMissingRef = useRef<string | null>(null);

  const { data: chatsData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chats'],
    queryFn: () => ApiClient.get('/chats'),
    enabled: Boolean(userId),
    refetchInterval: 10000,
  });

  const chats = chatsData?.data || [];

  useEffect(() => {
    if (!selectedChatId) { lastMissingRef.current = null; return; }
    const exists = chats.some((c) => c.id?.toLowerCase() === selectedChatId.toLowerCase());
    if (exists) { lastMissingRef.current = null; return; }
    if (!isLoading && lastMissingRef.current !== selectedChatId) {
      lastMissingRef.current = selectedChatId;
      queryClient.refetchQueries({ queryKey: ['chats'] });
    }
  }, [selectedChatId, isLoading, chats, queryClient]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    const handleNewChatMessage = (msg: any) => {
      let found = false;
      queryClient.setQueryData(['chats'], (oldData: any) => {
        if (!oldData?.data) return oldData;
        const list = [...oldData.data];
        const msgChatId = msg.chat_id?.toLowerCase();
        const index = list.findIndex((c: any) => c.id?.toLowerCase() === msgChatId);
        if (index === -1) return oldData;
        found = true;
        const snippet = msg.content || (msg.gif_url ? 'GIF' : msg.media_urls?.length ? 'Imagen' : 'Mensaje');
        const isActive = selectedChatId?.toLowerCase() === msgChatId;
        const target = {
          ...list[index],
          last_message: { id: msg.id, content: snippet, sender_id: msg.sender_id, created_at: msg.created_at },
          unread_count: isActive ? 0 : (list[index].unread_count || 0) + (msg.sender_id !== userId ? 1 : 0),
          updated_at: msg.created_at,
        };
        list.splice(index, 1);
        list.unshift(target);
        return { ...oldData, data: list };
      });
      if (!found) queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };

    socket.on('new_chat_message', handleNewChatMessage);
    return () => { socket.off('new_chat_message', handleNewChatMessage); };
  }, [queryClient, selectedChatId, userId]);

  const markChatOpened = (chatId: string) => {
    queryClient.setQueryData(['chats'], (oldData: any) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((c: any) => (c.id?.toLowerCase() === chatId.toLowerCase() ? { ...c, unread_count: 0 } : c)),
      };
    });
  };

  return { chats, isLoading, markChatOpened };
}
