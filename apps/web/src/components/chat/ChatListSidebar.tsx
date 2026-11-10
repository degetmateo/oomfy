import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { formatMessageTimestamp, formatExactDateTime } from '../../utils/formatTime.js';

interface Props {
  chats: any[];
  isLoading: boolean;
  selectedChatId: string | null;
  getOtherParticipant: (chat: any) => any;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
}

export const ChatListSidebar: React.FC<Props> = ({
  chats, isLoading, selectedChatId, getOtherParticipant, onSelectChat, onOpenNewChat,
}) => (
  <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-dark-border bg-dark-bg flex-shrink-0 h-full overflow-hidden`}>
    <div className="p-3 border-b border-dark-border flex items-center justify-between bg-dark-bg select-none flex-shrink-0">
      <h1 className="text-sm font-bold text-white tracking-wider uppercase">Mensajes</h1>
      <button onClick={onOpenNewChat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black transition-colors pixel-button">
        <Plus className="w-4 h-4" /><span>Nuevo</span>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando conversaciones...</div>
      ) : chats.length > 0 ? (
        chats.map((chat) => {
          const part = getOtherParticipant(chat);
          const isSelected = Boolean(selectedChatId && chat.id?.toLowerCase() === selectedChatId.toLowerCase());
          const hasUnread = Boolean(chat.unread_count && chat.unread_count > 0);
          const lastAt = chat.last_message?.created_at;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              data-selected={isSelected ? 'true' : 'false'}
              className={`p-3 sm:p-3.5 cursor-pointer transition-colors flex items-center gap-3 border-b border-b-dark-border ${
                isSelected ? 'bg-brand-500/15 border-l-4 border-l-brand-500' : 'hover:bg-dark-card/50'
              }`}
            >
              <div className="relative flex-shrink-0">
                <PixelAvatar src={part.icon_url} username={part.username} sizeClass="w-12 h-12 md:w-11 md:h-11" />
                {hasUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-400 border border-black rounded-full animate-pulse" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm sm:text-base truncate ${hasUnread || isSelected ? 'font-bold text-white' : 'font-medium text-dark-text'}`}>{part.name}</p>
                  <span title={lastAt ? formatExactDateTime(lastAt) : undefined} className="text-[11px] text-dark-muted flex-shrink-0">
                    {lastAt ? formatMessageTimestamp(lastAt) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-xs sm:text-sm truncate flex-1 ${hasUnread ? 'text-white font-semibold' : 'text-dark-muted'}`}>
                    {chat.last_message?.content || 'Sin mensajes aún'}
                  </p>
                  {hasUnread && (
                    <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-brand-500 text-black border border-brand-400 pixel-button flex-shrink-0 animate-pulse">
                      {chat.unread_count > 99 ? '99+' : chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
          <MessageSquare className="w-8 h-8 opacity-40 text-brand-400" />
          <p className="font-bold text-white">No tienes conversaciones.</p>
          <button onClick={onOpenNewChat} className="mt-2 px-3 py-1.5 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold text-xs pixel-button">
            Iniciar chat
          </button>
        </div>
      )}
    </div>
  </div>
);

