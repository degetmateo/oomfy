import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { SocketClient } from '../../services/socket.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PixelAvatar } from '../common/PixelAvatar.js';

interface Props {
  chat: any;
  currentUserId: string;
  onBack?: () => void;
}

export const ChatThread: React.FC<Props> = ({ chat, currentUserId, onBack }) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const otherParticipant = chat.participants?.find((p: any) => p.user_id !== currentUserId) || {
    name: 'Usuario de oomfy',
    username: 'oomfy_user',
    icon_url: null,
  };

  const { data: messagesData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chat-messages', chat.id],
    queryFn: () => ApiClient.get(`/chats/${chat.id}/messages`),
    enabled: Boolean(chat.id),
    refetchInterval: 5000,
  });

  const messages = messagesData?.data || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    socket.emit('join-chat', chat.id);

    const handleMessage = (msg: any) => {
      if (msg.chat_id === chat.id) {
        queryClient.setQueryData(['chat-messages', chat.id], (old: any) => {
          if (!old?.data) return { success: true, data: [msg] };
          if (old.data.some((m: any) => m.id === msg.id)) return old;
          return { ...old, data: [...old.data, msg] };
        });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      }
    };

    socket.on('new-message', handleMessage);
    return () => {
      socket.off('new-message', handleMessage);
    };
  }, [chat.id, queryClient]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      await ApiClient.post('/chats/messages', { chat_id: chat.id, content: text });
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chat.id] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err) {
      useDialogStore.getState().alert((err as Error).message, 'Error al enviar');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg font-mono min-w-0">
      <div className="p-3 border-b border-dark-border bg-dark-card/40 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 text-dark-muted hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <PixelAvatar src={otherParticipant.icon_url} username={otherParticipant.username} sizeClass="w-8 h-8" />
        <div className="truncate text-xs">
          <p className="font-bold text-white truncate">{otherParticipant.name}</p>
          <p className="text-dark-muted text-[10px] truncate">@{otherParticipant.username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[300px]">
        {isLoading ? (
          <div className="m-auto text-center text-xs text-dark-muted">Cargando mensajes...</div>
        ) : messages.length > 0 ? (
          messages.map((m: any) => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <div
                  className={`p-2.5 text-xs font-sans leading-relaxed border ${
                    isMe
                      ? 'bg-brand-500/15 border-brand-500/40 text-white'
                      : 'bg-dark-card border-dark-border text-dark-text'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
                <span className="text-[10px] text-dark-muted mt-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        ) : (
          <div className="m-auto text-center text-xs text-dark-muted">
            <p>No hay mensajes en esta conversación.</p>
            <p className="mt-1 text-white">¡Envía un saludo!</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-dark-border bg-dark-bg flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

