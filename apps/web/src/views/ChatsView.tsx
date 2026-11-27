import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigationType } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useChatsList } from '../hooks/useChatsList.js';
import { useResizableChatSidebar } from '../hooks/useResizableChatSidebar.js';
import { useViewActive, useCloseOnViewInactive } from '../contexts/ViewActivityContext.js';
import { useViewSearchParams } from '../hooks/useViewSearchParams.js';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';
import { StartChatModal } from '../components/chat/StartChatModal.js';
import { ChatListSidebar } from '../components/chat/ChatListSidebar.js';
import { ChatThreadPane } from '../components/chat/ChatThreadPane.js';

const MAX_MOUNTED_THREADS = 12;
const PRELOAD_TOP_THREADS = 5;

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
  const lastAppliedUrlChatIdRef = useRef<string | null>(queryChatId);
  const expectedUrlChatIdRef = useRef<string | null | undefined>(undefined);
  const { sidebarWidth, isResizing, startResizing, handleDividerKeyDown } = useResizableChatSidebar(containerRef);

  // Persisted thread pool keeping DOM insertion order stable while tracking LRU recency separately
  const lastUserIdRef = useRef<string | null>(user?.id ?? null);
  const mountedThreadsRef = useRef<{ key: string; chatId: string; fallback: any }[]>([]);
  const lruKeysRef = useRef<string[]>([]);

  if ((user?.id ?? null) !== lastUserIdRef.current) {
    lastUserIdRef.current = user?.id ?? null;
    mountedThreadsRef.current = [];
    lruKeysRef.current = [];
  }

  useEffect(() => {
    if (!isViewActive) return;
    if (expectedUrlChatIdRef.current !== undefined) {
      if (queryChatId !== expectedUrlChatIdRef.current) return;
      expectedUrlChatIdRef.current = undefined;
      lastAppliedUrlChatIdRef.current = queryChatId;
      return;
    }
    if (queryChatId === lastAppliedUrlChatIdRef.current) return;
    lastAppliedUrlChatIdRef.current = queryChatId;
    if (queryChatId) setSelectedChatId(queryChatId);
  }, [isViewActive, queryChatId]);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isViewActive;
    if (!wasActive && isViewActive && navigationType === 'PUSH' && !queryChatId && typeof window !== 'undefined' && window.innerWidth < 768) {
      setSelectedChatId(null);
    }
  }, [isViewActive, navigationType, queryChatId]);

  const { chats, isLoading, markChatOpened, typingChats } = useChatsList(user?.id, selectedChatId, isViewActive);

  const ensureMountedThread = useCallback((chat: any, touchLru: boolean) => {
    if (!chat?.id) return;
    const key = chat.id.toLowerCase();
    const existing = mountedThreadsRef.current.find((item) => item.key === key);
    if (existing) {
      existing.fallback = chat;
    } else {
      mountedThreadsRef.current = [...mountedThreadsRef.current, { key, chatId: chat.id, fallback: chat }];
    }
    if (touchLru || !lruKeysRef.current.includes(key)) {
      lruKeysRef.current = [...lruKeysRef.current.filter((k) => k !== key), key];
    }
    const activeKey = selectedChatId?.toLowerCase() ?? null;
    while (mountedThreadsRef.current.length > MAX_MOUNTED_THREADS) {
      const evictKey = lruKeysRef.current.find((k) => k !== activeKey);
      if (!evictKey) break;
      lruKeysRef.current = lruKeysRef.current.filter((k) => k !== evictKey);
      mountedThreadsRef.current = mountedThreadsRef.current.filter((item) => item.key !== evictKey);
    }
  }, [selectedChatId]);

  // Pre-mount recent threads in memory so opening any conversation renders & switches instantaneously
  if (user && chats.length > 0) {
    for (const topChat of chats.slice(0, PRELOAD_TOP_THREADS)) {
      if (mountedThreadsRef.current.length < MAX_MOUNTED_THREADS || mountedThreadsRef.current.some((m) => m.key === topChat.id?.toLowerCase())) {
        ensureMountedThread(topChat, false);
      }
    }
  }

  const selectedChat = chats.find((c) => c.id?.toLowerCase() === selectedChatId?.toLowerCase())
    || chatIdentityMap.getChat(selectedChatId);

  if (user && selectedChat) {
    ensureMountedThread(selectedChat, true);
  }

  const handleSelectChat = useCallback((chatId: string) => {
    expectedUrlChatIdRef.current = chatId;
    setSelectedChatId(chatId);
    setSearchParams({ id: chatId }, { replace: true });
    markChatOpened(chatId);
  }, [setSearchParams, markChatOpened]);

  const handleBackToInbox = useCallback(() => {
    expectedUrlChatIdRef.current = null;
    setSelectedChatId(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const getOtherParticipant = useCallback((chat: any) => {
    const raw = chat?.participants?.find((p: any) => (p.user_id || p.id) !== user?.id) || {
      name: 'Usuario de oomfy', username: 'oomfy_user', icon_url: null,
    };
    const live = raw?.username ? userIdentityMap.get(raw.username) : undefined;
    return live ? { ...raw, name: live.name, username: live.username, icon_url: live.icon_url } : raw;
  }, [user?.id]);

  const selectedKey = selectedChatId?.toLowerCase() ?? null;
  const isSelectedMounted = Boolean(
    selectedKey && user && mountedThreadsRef.current.some((item) => item.key === selectedKey)
  );

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
      <div className={`${!selectedChatId ? 'hidden md:flex' : 'fixed inset-0 z-50 md:relative md:inset-auto md:z-auto'} relative flex-1 flex flex-col h-full min-w-0 bg-dark-bg overflow-hidden mobile-chat-container`}>
        {user && mountedThreadsRef.current.map((entry) => (
          <ChatThreadPane
            key={entry.key}
            chatId={entry.chatId}
            fallbackChat={entry.fallback}
            currentUserId={user.id}
            isThreadActive={isViewActive && entry.key === selectedKey}
            getOtherParticipant={getOtherParticipant}
            onBackToInbox={handleBackToInbox}
          />
        ))}
        {!isSelectedMounted && (
          selectedChatId ? (
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
          )
        )}
      </div>
      <StartChatModal isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} onChatSelected={handleSelectChat} />
    </div>
  );
};
