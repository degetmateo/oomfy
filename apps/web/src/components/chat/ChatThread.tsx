import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { SocketClient } from '../../services/socket.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ChatMessageItem } from './ChatMessageItem.js';
import { ChatInputBar } from './ChatInputBar.js';
import { ReportModal } from '../modals/ReportModal.js';
import { ImageViewerModal } from '../common/ImageViewerModal.js';
import { useChatMessages } from '../../hooks/useChatMessages.js';

interface Props { chat: any; currentUserId: string; }

export const ChatThread: React.FC<Props> = ({ chat, currentUserId }) => {
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior });

  const {
    messages, setMessages, isLoading, hasMore, setHasMore, loadingMore, setLoadingMore,
    typingUser, lastTypingSentRef, typingTimerRef, sendOptimisticMessage,
  } = useChatMessages(chat.id, currentUserId, scrollToBottom);

  const handleInputTyping = () => {
    const now = Date.now();
    const socket = SocketClient.getSocket();
    if (!lastTypingSentRef.current || now - lastTypingSentRef.current > 1800) {
      lastTypingSentRef.current = now; socket.emit('typing-start', { chatId: chat.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { lastTypingSentRef.current = 0; socket.emit('typing-stop', { chatId: chat.id }); }, 2500);
  };

  const loadOlderMessages = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: any[] }>(`/chats/${chat.id}/messages?limit=30&older_id=${messages[0].id}`);
      const older = res.data || [];
      setMessages((prev) => [...older, ...prev]); setHasMore(older.length >= 30);
    } finally { setLoadingMore(false); }
  };

  const handleDeleteMessage = async (msg: any) => {
    const confirmed = await useDialogStore.getState().confirm({
      title: 'Eliminar mensaje', message: '¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer.',
      isDanger: true, confirmText: 'Eliminar',
    });
    if (!confirmed) return;
    try {
      await ApiClient.delete(`/chats/messages/${msg.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err: any) { useDialogStore.getState().alert(err.message || 'Error al eliminar el mensaje', 'Error'); }
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
                <button type="button" onClick={loadOlderMessages} disabled={loadingMore} className="text-[11px] text-brand-400 hover:text-brand-300 font-mono underline">
                  {loadingMore ? 'Cargando anteriores...' : 'Cargar mensajes anteriores'}
                </button>
              </div>
            )}
            {messages.map((m, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const isFirst = !prev || prev.sender_id !== m.sender_id || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
              return (
                <ChatMessageItem key={m.id} message={m} isMe={m.sender_id === currentUserId} isFirstInGroup={isFirst}
                  onReply={setReplyingTo} onReport={setReportingMessage} onDelete={handleDeleteMessage}
                  onRetry={(msg) => msg.retryPayload && sendOptimisticMessage(msg.retryPayload, msg.id)}
                  onDismissError={(id) => setMessages((prev) => prev.filter((item) => item.id !== id))} onImageClick={setActiveImage} />
              );
            })}
          </div>
        ) : <div className="m-auto text-center text-xs text-dark-muted font-mono"><p>No hay mensajes en esta conversación.</p><p className="mt-1 text-white">¡Envía un saludo!</p></div>}
      </div>
      {typingUser && (
        <div className="px-3 py-1.5 text-xs sm:text-sm text-brand-400 font-mono flex items-center gap-2 select-none bg-dark-bg border-t border-dark-border/40">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" /><span>@{typingUser} está escribiendo...</span>
        </div>
      )}
      <ChatInputBar replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onSendMessage={(p) => sendOptimisticMessage(p)} onTyping={handleInputTyping} />
      <ReportModal isOpen={Boolean(reportingMessage)} onClose={() => setReportingMessage(null)} targetType="message" targetId={reportingMessage?.id || ''} targetUsername={reportingMessage?.sender?.username} targetContent={reportingMessage?.content} />
      <ImageViewerModal imageUrl={activeImage} onClose={() => setActiveImage(null)} />
    </div>
  );
};
