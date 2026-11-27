import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useChatsList } from '../hooks/useChatsList.js';
import { useResizableChatSidebar } from '../hooks/useResizableChatSidebar.js';
import { useUserModel } from '../hooks/useUserModel.js';
import { useViewActive, useCloseOnViewInactive } from '../contexts/ViewActivityContext.js';
import { useViewSearchParams } from '../hooks/useViewSearchParams.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { StartChatModal } from '../components/chat/StartChatModal.js';
import { ChatListSidebar } from '../components/chat/ChatListSidebar.js';
import { ChatThread } from '../components/chat/ChatThread.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';

export const ChatsView: React.FC = () => {
  const { user } = useAuthStore();
  const isViewActive = useViewActive();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useViewSearchParams();
  const queryChatId = searchParams.get('id') || searchParams.get('chatId');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(queryChatId || null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  useCloseOnViewInactive(isStartOpen, () => setIsStartOpen(false));
  const containerRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef(isViewActive);
  const { sidebarWidth, isResizing, startResizing, handleDividerKeyDown } = useResizableChatSidebar(containerRef);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isViewActive) return;
    if (queryChatId && queryChatId !== selectedChatId) setSelectedChatId(queryChatId);
  }, [isViewActive, queryChatId, selectedChatId]);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isViewActive;
    if (!wasActive && isViewActive && navigationType === 'PUSH' && !queryChatId && typeof window !== 'undefined' && window.innerWidth < 768) {
      setSelectedChatId(null);
    }
  }, [isViewActive, navigationType, queryChatId]);

  const { chats, isLoading, markChatOpened, typingChats } = useChatsList(user?.id, selectedChatId, isViewActive);
  const selectedChat = chats.find((c) => c.id?.toLowerCase() === selectedChatId?.toLowerCase());

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setSearchParams({ id: chatId }, { replace: true });
    markChatOpened(chatId);
  };

  const getOtherParticipant = (chat: any) => {
    const raw = chat?.participants?.find((p: any) => (p.user_id || p.id) !== user?.id) || {
      name: 'Usuario de oomfy', username: 'oomfy_user', icon_url: null,
    };
    const live = raw?.username ? userIdentityMap.get(raw.username) : undefined;
    return live ? { ...raw, name: live.name, username: live.username, icon_url: live.icon_url } : raw;
  };

  const rawOther = selectedChat ? getOtherParticipant(selectedChat) : null;
  const liveOther = useUserModel(rawOther?.username);
  const other = rawOther && liveOther ? { ...rawOther, ...liveOther } : rawOther;

  return (
    <div ref={containerRef} className={`flex flex-1 w-full h-full overflow-hidden font-mono bg-dark-bg ${isResizing ? 'select-none' : ''}`}>
      <ChatListSidebar
        chats={chats} isLoading={isLoading} selectedChatId={selectedChatId} typingChats={typingChats}
        width={sidebarWidth} getOtherParticipant={getOtherParticipant} onSelectChat={handleSelectChat} onOpenNewChat={() => setIsStartOpen(true)}
      />
      <div
        role="separator" aria-orientation="vertical" aria-label="Redimensionar panel de chats"
        aria-valuenow={sidebarWidth} aria-valuemin={220} aria-valuemax={600} tabIndex={0}
        data-testid="chat-split-resizer" onMouseDown={startResizing} onKeyDown={handleDividerKeyDown}
        className="hidden md:flex w-1.5 cursor-col-resize items-center justify-center bg-dark-border/60 hover:bg-brand-500 active:bg-brand-400 transition-colors flex-shrink-0 select-none z-30"
      />
      <div className={`${!selectedChatId ? 'hidden md:flex' : 'fixed inset-0 z-50 md:relative md:inset-auto md:z-auto'} flex-1 flex flex-col h-full min-w-0 bg-dark-bg overflow-hidden mobile-chat-container`}>
        {selectedChat && other && user ? (
          <>
            <header className="sticky top-0 z-20 bg-dark-bg/95 border-b border-dark-border px-3 sm:px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] flex items-center gap-3 select-none flex-shrink-0">
              <button onClick={() => { setSelectedChatId(null); setSearchParams({}, { replace: true }); }} className="md:hidden p-2 -ml-1.5 text-dark-muted hover:text-brand-400 hover:bg-dark-border/40 transition-colors rounded select-none flex-shrink-0" title="Volver" aria-label="Volver atrás">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <PixelAvatar onClick={() => navigate(`/${other.username}`)} src={other.icon_url} username={other.username} sizeClass="w-11 h-11 md:w-12 md:h-12 hover:cursor-pointer" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-lg font-bold text-white truncate leading-tight">{other.name}</h2>
                <p className="text-xs md:text-sm text-dark-muted truncate leading-tight">@{other.username}</p>
              </div>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ChatThread key={selectedChat.id} chat={selectedChat} currentUserId={user.id} />
            </div>
          </>
        ) : selectedChatId ? (
          <div className="m-auto text-center text-dark-muted p-8 flex flex-col items-center gap-3 font-mono">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-sm font-bold text-white">Abriendo conversación...</p>
            <p className="text-xs text-dark-muted">Cargando bandeja de chat, por favor espera...</p>
          </div>
        ) : (
          <div className="m-auto text-center text-dark-muted p-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-400" />
            <p className="text-sm font-bold text-white">Selecciona una conversación</p>
            <p className="text-xs mt-1">O inicia un nuevo mensaje con cualquier usuario.</p>
          </div>
        )}
      </div>
      <StartChatModal isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} onChatSelected={handleSelectChat} />
    </div>
  );
};
