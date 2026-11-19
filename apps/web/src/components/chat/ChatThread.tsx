import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { SocketClient } from '../../services/socket.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ChatMessageItem } from './ChatMessageItem.js';
import { ChatInputBar } from './ChatInputBar.js';
import { ChatScrollBottomButton } from './ChatScrollBottomButton.js';
import { ChatTypingIndicator } from './ChatTypingIndicator.js';
import { ReportModal } from '../modals/ReportModal.js';
import { ImageViewerModal } from '../common/ImageViewerModal.js';
import { useChatMessages } from '../../hooks/useChatMessages.js';
import { useChatScroll } from '../../hooks/useChatScroll.js';

interface Props { chat: any; currentUserId: string; }

export const ChatThread: React.FC<Props> = ({ chat, currentUserId }) => {
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const { scrollContainerRef, showScrollBottomButton, highlightedMessageId, handleScroll, scrollToBottom, scrollToMessage } = useChatScroll();
  const { messages, setMessages, isLoading, hasMore, setHasMore, loadingMore, setLoadingMore, typingUser, lastTypingSentRef, typingTimerRef, sendOptimisticMessage } = useChatMessages(chat.id, currentUserId, scrollToBottom);

  useEffect(() => {
    if (!replyingTo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !reportingMessage && !activeImage) setReplyingTo(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [replyingTo, reportingMessage, activeImage]);

  const handleInputTyping = () => {
    const now = Date.now(), socket = SocketClient.getSocket();
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
    if (!(await useDialogStore.getState().confirm({ title: 'Eliminar mensaje', message: '¿Estás seguro de que deseas eliminar este mensaje?', isDanger: true, confirmText: 'Eliminar' }))) return;
    try {
      await ApiClient.delete(`/chats/messages/${msg.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err: any) { useDialogStore.getState().alert(err.message || 'Error al eliminar el mensaje', 'Error'); }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg min-w-0 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col relative">
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 flex flex-col min-h-0">
          {isLoading ? (
            <div className="m-auto text-center text-xs text-dark-muted font-mono">Cargando mensajes...</div>
          ) : messages.length > 0 ? (
            <div className="mt-auto flex flex-col pb-6">
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
                    isHighlighted={highlightedMessageId === m.id} onReply={setReplyingTo} onReport={setReportingMessage}
                    onDelete={handleDeleteMessage} onJumpToMessage={scrollToMessage}
                    onRetry={(msg) => msg.retryPayload && sendOptimisticMessage(msg.retryPayload, msg.id)}
                    onDismissError={(id) => setMessages((prev) => prev.filter((item) => item.id !== id))} onImageClick={setActiveImage} />
                );
              })}
            </div>
          ) : <div className="m-auto text-center text-xs text-dark-muted font-mono"><p>No hay mensajes en esta conversación.</p><p className="mt-1 text-white">¡Envía un saludo!</p></div>}
        </div>
        <ChatScrollBottomButton visible={showScrollBottomButton} onClick={() => scrollToBottom('smooth', true)} />
      </div>
      <ChatTypingIndicator typingUser={typingUser} />
      <ChatInputBar replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onSendMessage={(p) => sendOptimisticMessage(p)} onTyping={handleInputTyping} onFocus={() => setTimeout(() => scrollToBottom('smooth', true), 120)} />
      <ReportModal isOpen={Boolean(reportingMessage)} onClose={() => setReportingMessage(null)} targetType="message" targetId={reportingMessage?.id || ''} targetUsername={reportingMessage?.sender?.username} targetContent={reportingMessage?.content} />
      <ImageViewerModal imageUrl={activeImage} onClose={() => setActiveImage(null)} />
    </div>
  );
};
