import React from 'react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { useChatModel, useChatTypingModel } from '../../hooks/useChatModel.js';
import { useUserModel } from '../../hooks/useUserModel.js';
import { formatMessageTimestamp, formatExactDateTime } from '../../utils/formatTime.js';

interface Props {
  chatId: string;
  initialChat: any;
  isSelected: boolean;
  typingOverride?: string;
  getOtherParticipant: (chat: any) => any;
  onSelectChat: (chatId: string) => void;
}

const ChatListItemBase: React.FC<Props> = ({
  chatId,
  initialChat,
  isSelected,
  typingOverride,
  getOtherParticipant,
  onSelectChat,
}) => {
  const chat = useChatModel(chatId) || initialChat;
  const modelTyping = useChatTypingModel(chatId);
  const typingUsername = modelTyping || typingOverride || null;

  const rawPart = getOtherParticipant(chat);
  const livePart = useUserModel(rawPart?.username);
  const part = livePart
    ? { ...rawPart, name: livePart.name, username: livePart.username, icon_url: livePart.icon_url }
    : rawPart;

  const hasUnread = Boolean(chat.unread_count && chat.unread_count > 0);
  const lastAt = chat.last_message?.created_at;
  const isTyping = Boolean(typingUsername);

  return (
    <div
      onClick={() => onSelectChat(chat.id)}
      data-chat-card-id={chat.id}
      data-selected={isSelected ? 'true' : 'false'}
      className={`p-3 sm:p-3.5 cursor-pointer transition-colors flex items-center gap-3 border-b border-b-dark-border ${
        isSelected ? 'bg-brand-500/15 border-l-4 border-l-brand-500' : 'hover:bg-dark-card/50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <PixelAvatar
          src={part.icon_url}
          username={part.username}
          sizeClass="w-12 h-12 md:w-11 md:h-11"
        />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-400 border border-black rounded-full animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-sm sm:text-base truncate ${hasUnread || isSelected ? 'font-bold text-white' : 'font-medium text-dark-text'}`}>
            {part.name}
          </p>
          <span title={lastAt ? formatExactDateTime(lastAt) : undefined} className="text-[11px] text-dark-muted flex-shrink-0">
            {lastAt ? formatMessageTimestamp(lastAt) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isTyping ? (
            <p className="text-xs sm:text-sm truncate flex-1 text-brand-400 font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
              <span>{typingUsername} está escribiendo...</span>
            </p>
          ) : (
            <p className={`text-xs sm:text-sm truncate flex-1 ${hasUnread ? 'text-white font-semibold' : 'text-dark-muted'}`}>
              {chat.last_message?.content || 'Sin mensajes aún'}
            </p>
          )}
          {hasUnread && (
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-brand-500 text-black border border-brand-400 pixel-button flex-shrink-0 animate-pulse">
              {chat.unread_count > 99 ? '99+' : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatListItem = React.memo(ChatListItemBase);
