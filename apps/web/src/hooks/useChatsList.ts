import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';

export function useChatsList(userId?: string, selectedChatId?: string | null) {
  const queryClient = useQueryClient();

  const { data: chatsData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chats'],
    queryFn: () => ApiClient.get('/chats'),
    enabled: Boolean(userId),
    refetchInterval: 10000,
  });

  const chats = chatsData?.data || [];

  useEffect(() => {
    if (selectedChatId && !isLoading && !chats.some((c) => c.id?.toLowerCase() === selectedChatId.toLowerCase())) {
      queryClient.refetchQueries({ queryKey: ['chats'] });
    }
  }, [selectedChatId, isLoading, chats, queryClient]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    const handleNewChatMessage = (msg: any) => {
      queryClient.setQueryData(['chats'], (oldData: any) => {
        if (!oldData?.data) return oldData;
        const list = [...oldData.data];
        const index = list.findIndex((c: any) => c.id === msg.chat_id);
        const snippet = msg.content || (msg.gif_url ? 'GIF' : msg.media_urls?.length ? 'Imagen' : 'Mensaje');
        const newLastMessage = { id: msg.id, content: snippet, sender_id: msg.sender_id, created_at: msg.created_at };
        if (index !== -1) {
          const isActive = selectedChatId?.toLowerCase() === msg.chat_id?.toLowerCase();
          const target = {
            ...list[index],
            last_message: newLastMessage,
            unread_count: isActive ? 0 : (list[index].unread_count || 0) + (msg.sender_id !== userId ? 1 : 0),
            updated_at: msg.created_at,
          };
          list.splice(index, 1);
          list.unshift(target);
          return { ...oldData, data: list };
        }
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        return oldData;
      });
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

