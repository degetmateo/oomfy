import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { SocketClient } from '../../services/socket.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ChatMessageItem } from './ChatMessageItem.js';
import { ChatInputBar } from './ChatInputBar.js';
import { ReportModal } from '../modals/ReportModal.js';
import { ImageViewerModal } from '../common/ImageViewerModal.js';

interface Props {
  chat: any;
  currentUserId: string;
}

export const ChatThread: React.FC<Props> = ({ chat, currentUserId }) => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const typingTimerRef = useRef<any>(null);
  const typingAutoClearTimerRef = useRef<any>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setReplyingTo(null);
    ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chat.id}/messages?limit=30`)
      .then((res) => {
        if (!active) return;
        const list = res.data || [];
        setMessages(list);
        setHasMore(list.length >= 30);
        setTimeout(() => scrollToBottom('instant'), 30);
        ApiClient.post(`/chats/${chat.id}/read`).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
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
        setTypingUser(null);
        if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
        setTimeout(() => scrollToBottom('smooth'), 30);
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      }
    };

    const handleTyping = (data: { chatId: string; userId: string; username: string }) => {
      if (data.chatId === chat.id && data.userId !== currentUserId) {
        setTypingUser(data.username);
        scrollToBottom('smooth');
        if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
        typingAutoClearTimerRef.current = setTimeout(() => setTypingUser(null), 4000);
      }
    };

    const handleStopTyping = (data: { chatId: string; userId: string }) => {
      if (data.chatId === chat.id && data.userId !== currentUserId) {
        setTypingUser(null);
        if (typingAutoClearTimerRef.current) clearTimeout(typingAutoClearTimerRef.current);
      }
    };

    socket.on('new-message', handleMessage);
    socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping);

    return () => {
      socket.off('new-message', handleMessage);
      socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping);
      if (lastTypingSentRef.current > 0) {
        socket.emit('typing-stop', { chatId: chat.id });
      }
    };
  }, [chat.id, currentUserId, queryClient]);

  const handleInputTyping = () => {
    const now = Date.now();
    const socket = SocketClient.getSocket();
    if (!lastTypingSentRef.current || now - lastTypingSentRef.current > 1800) {
      lastTypingSentRef.current = now;
      socket.emit('typing-start', { chatId: chat.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      socket.emit('typing-stop', { chatId: chat.id });
    }, 2500);
  };

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

  const handleSendMessage = async (payload: {
    content: string;
    files: File[];
    gifUrl: string | null;
    replyToId: string | null;
  }) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingSentRef.current = 0;
    SocketClient.getSocket().emit('typing-stop', { chatId: chat.id });

    setIsSending(true);
    try {
      let res: any;
      if (payload.files.length > 0) {
        const formData = new FormData();
        formData.append('chat_id', chat.id);
        if (payload.content) formData.append('content', payload.content);
        if (payload.replyToId) formData.append('reply_to_id', payload.replyToId);
        if (payload.gifUrl) formData.append('gif_url', payload.gifUrl);
        payload.files.forEach((f) => formData.append('images', f));
        res = await ApiClient.post<any>('/chats/messages', formData);
      } else {
        res = await ApiClient.post<any>('/chats/messages', {
          chat_id: chat.id,
          content: payload.content,
          reply_to_id: payload.replyToId,
          gif_url: payload.gifUrl,
        });
      }

      setReplyingTo(null);
      if (res.data) {
        setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
        setTimeout(() => scrollToBottom('smooth'), 30);
      }
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err: any) {
      useDialogStore.getState().alert(err.message || 'Error al enviar mensaje', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg min-w-0 overflow-hidden">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 flex flex-col min-h-0">
        {isLoading ? (
          <div className="m-auto text-center text-xs text-dark-muted font-mono">Cargando mensajes...</div>
        ) : messages.length > 0 ? (
          <div className="mt-auto flex flex-col">
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
            {messages.map((m, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const isFirst =
                !prev ||
                prev.sender_id !== m.sender_id ||
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
              return (
                <ChatMessageItem
                  key={m.id}
                  message={m}
                  isMe={m.sender_id === currentUserId}
                  isFirstInGroup={isFirst}
                  onReply={(msg) => setReplyingTo(msg)}
                  onReport={(msg) => setReportingMessage(msg)}
                  onImageClick={(url) => setActiveImage(url)}
                />
              );
            })}
          </div>
        ) : (
          <div className="m-auto text-center text-xs text-dark-muted font-mono">
            <p>No hay mensajes en esta conversación.</p>
            <p className="mt-1 text-white">¡Envía un saludo!</p>
          </div>
        )}
      </div>

      {typingUser && (
        <div className="px-3 py-1.5 text-xs sm:text-sm text-brand-400 font-mono flex items-center gap-2 select-none bg-dark-bg border-t border-dark-border/40">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span>@{typingUser} está escribiendo...</span>
        </div>
      )}

      <ChatInputBar
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={handleSendMessage}
        onTyping={handleInputTyping}
        isSending={isSending}
      />

      <ReportModal
        isOpen={Boolean(reportingMessage)}
        onClose={() => setReportingMessage(null)}
        targetType="message"
        targetId={reportingMessage?.id || ''}
        targetUsername={reportingMessage?.sender?.username}
        targetContent={reportingMessage?.content}
      />

      <ImageViewerModal
        imageUrl={activeImage}
        onClose={() => setActiveImage(null)}
      />
    </div>
  );
};
