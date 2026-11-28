import React, { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { ChatThread } from './ChatThread.js';
import { ViewActivityProvider } from '../../contexts/ViewActivityContext.js';
import { useChatModel } from '../../hooks/useChatModel.js';
import { useUserModel } from '../../hooks/useUserModel.js';

interface Props {
  chatId: string;
  fallbackChat: any;
  currentUserId: string;
  isThreadActive: boolean;
  getOtherParticipant: (chat: any) => any;
  onBackToInbox: () => void;
}

const ChatThreadPaneBase: React.FC<Props> = ({
  chatId,
  fallbackChat,
  currentUserId,
  isThreadActive,
  getOtherParticipant,
  onBackToInbox,
}) => {
  const navigate = useNavigate();
  const paneRef = useRef<HTMLDivElement | null>(null);
  const chat = useChatModel(chatId) || fallbackChat;
  const rawOther = getOtherParticipant(chat);
  const liveOther = useUserModel(rawOther?.username);
  const other = liveOther
    ? { ...rawOther, name: liveOther.name, username: liveOther.username, icon_url: liveOther.icon_url }
    : rawOther;

  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    if (!isThreadActive) {
      const focused = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      if (focused && el.contains(focused) && typeof focused.blur === 'function') {
        focused.blur();
      }
    }
    (el as any).inert = !isThreadActive;
  }, [isThreadActive]);

  return (
    <div
      ref={paneRef}
      data-chat-thread-id={chat.id}
      aria-hidden={!isThreadActive}
      className={isThreadActive ? 'spa-chat-thread-active' : 'spa-chat-thread-inactive'}
    >
      <ViewActivityProvider isActive={isThreadActive} viewKey="/chats" isPersistent>
        <header className="sticky top-0 z-20 bg-dark-bg border-b border-dark-border px-3 sm:px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] flex items-center gap-3 select-none flex-shrink-0">
          <button
            type="button"
            onClick={onBackToInbox}
            className="md:hidden p-2 -ml-1.5 text-dark-muted hover:text-brand-400 hover:bg-dark-border/40 transition-colors rounded select-none flex-shrink-0"
            title="Volver"
            aria-label="Volver atrás"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <PixelAvatar
            onClick={() => navigate(`/${other.username}`)}
            src={other.icon_url}
            username={other.username}
            sizeClass="w-11 h-11 md:w-12 md:h-12 hover:cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-bold text-white truncate leading-tight">{other.name}</h2>
            <p className="text-xs md:text-sm text-dark-muted truncate leading-tight">@{other.username}</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ChatThread chat={chat} currentUserId={currentUserId} />
        </div>
      </ViewActivityProvider>
    </div>
  );
};

export const ChatThreadPane = React.memo(ChatThreadPaneBase);
