import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';

export function useChatsList(userId?: string, selectedChatId?: string | null) {
  const queryClient = useQueryClient();
  const lastMissingRef = useRef<string | null>(null);
  const [typingChats, setTypingChats] = useState<Record<string, string>>({});
  const typingTimersRef = useRef<Record<string, any>>({});

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
    if (exists) { lastMissingRef.current = null; }
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
      let found = false;
      queryClient.setQueryData(['chats'], (oldData: any) => {
        if (!oldData?.data) return oldData;
        const list = [...oldData.data];
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

    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping);
    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping);
      Object.values(typingTimersRef.current).forEach(clearTimeout);
    };
  }, [queryClient, selectedChatId, userId]);

  const markChatOpened = (chatId: string) => {
    queryClient.setQueryData(['chats'], (old: any) =>
      old?.data ? { ...old, data: old.data.map((c: any) => c.id?.toLowerCase() === chatId.toLowerCase() ? { ...c, unread_count: 0 } : c) } : old
    );
  };

  return { chats, isLoading, markChatOpened, typingChats };
}
