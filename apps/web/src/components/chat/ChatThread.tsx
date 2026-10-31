import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { SocketClient } from '../../services/socket.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ChatMessageItem } from './ChatMessageItem.js';

interface Props {
  chat: any;
  currentUserId: string;
}

export const ChatThread: React.FC<Props> = ({ chat, currentUserId }) => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chat.id}/messages?limit=30`)
      .then((res) => {
        if (!active) return;
        const list = res.data || [];
        setMessages(list);
        setHasMore(list.length >= 30);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [chat.id]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    socket.emit('join-chat', chat.id);

    const handleMessage = (msg: any) => {
      if (msg.chat_id === chat.id) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      }
    };

    socket.on('new-message', handleMessage);
    return () => {
      socket.off('new-message', handleMessage);
    };
  }, [chat.id, queryClient]);

  const loadOlderMessages = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const olderId = messages[0].id;
      const res = await ApiClient.get<{ success: boolean; data: any[] }>(
        `/chats/${chat.id}/messages?limit=30&older_id=${olderId}`
      );
      const older = res.data || [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length >= 30);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const res = await ApiClient.post<any>('/chats/messages', { chat_id: chat.id, content: text });
      setContent('');
      if (res.data) {
        setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err) {
      useDialogStore.getState().alert((err as Error).message, 'Error al enviar');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        {isLoading ? (
          <div className="m-auto text-center text-xs text-dark-muted font-mono">Cargando mensajes...</div>
        ) : messages.length > 0 ? (
          <div className="mt-auto flex flex-col gap-3">
            {hasMore && (
              <div className="text-center py-1">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="text-[11px] text-brand-400 hover:text-brand-300 font-mono underline"
                >
                  {loadingMore ? 'Cargando anteriores...' : 'Cargar mensajes anteriores'}
                </button>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessageItem key={m.id} message={m} isMe={m.sender_id === currentUserId} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="m-auto text-center text-xs text-dark-muted font-mono">
            <p>No hay mensajes en esta conversación.</p>
            <p className="mt-1 text-white">¡Envía un saludo!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-dark-border bg-dark-bg flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans placeholder:font-sans"
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center font-mono"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
