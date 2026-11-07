import React, { useRef } from 'react';
import { CornerDownRight } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { ChatMessageMedia } from './ChatMessageMedia.js';
import { ChatMessageActions } from './ChatMessageActions.js';

interface Props {
  message: any;
  isMe?: boolean;
  isFirstInGroup?: boolean;
  onReply?: (message: any) => void;
  onReport?: (message: any) => void;
  onDelete?: (message: any) => void;
  onImageClick?: (url: string) => void;
}

export const ChatMessageItem: React.FC<Props> = ({
  message, isMe = false, isFirstInGroup = true, onReply, onReport, onDelete, onImageClick,
}) => {
  const sender = message.sender || {};
  const senderName = sender.name || (isMe ? 'Tú' : 'Usuario');
  const senderUsername = sender.username || '';
  const iconUrl = sender.icon_url || (senderUsername ? `/members/${senderUsername}/icon` : null);
  const timeStr = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h24' });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => onReply?.(message), 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (Math.abs(touchStartRef.current.x - e.touches[0].clientX) > 10 || Math.abs(touchStartRef.current.y - e.touches[0].clientY) > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (!touchStartRef.current) return;
    if (touchStartRef.current.x - e.changedTouches[0].clientX > 50 && Math.abs(touchStartRef.current.y - e.changedTouches[0].clientY) < 30) {
      onReply?.(message);
    }
    touchStartRef.current = null;
  };

  const replyNode = message.reply_to ? (
    <div className="flex items-center gap-1.5 text-xs md:text-sm text-dark-muted mb-1 select-none">
      <CornerDownRight className="w-4 h-4 text-brand-400/80 flex-shrink-0" />
      <span className="font-bold text-brand-400">@{message.reply_to.sender_username}</span>
      <span className="truncate max-w-sm text-dark-muted/80">{message.reply_to.content || '(archivo adjunto)'}</span>
    </div>
  ) : null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative group flex gap-3 px-3 hover:bg-dark-card/40 transition-colors ${
        isFirstInGroup ? 'pt-2.5 pb-0.5 mt-2' : 'py-[3px]'
      }`}
    >
      <ChatMessageActions onReply={() => onReply?.(message)} onReport={() => onReport?.(message)} onDelete={isMe ? () => onDelete?.(message) : undefined} />

      {isFirstInGroup ? (
        <div className="flex-shrink-0 pt-0.5">
          <PixelAvatar src={iconUrl} username={senderUsername} sizeClass="w-10 h-10 md:w-11 md:h-11" />
        </div>
      ) : (
        <div className="w-10 md:w-11 flex-shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity select-none leading-none pt-0.5">
          <span className="text-[10px] md:text-xs text-dark-muted font-mono">{timeStr}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {replyNode}
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2 mb-1 leading-none">
            <span className="font-bold text-sm md:text-base text-white hover:underline cursor-pointer">{senderName}</span>
            {senderUsername && <span className="text-xs md:text-sm text-dark-muted font-mono">@{senderUsername}</span>}
            <span className="text-[10px] md:text-xs text-dark-muted font-mono">{timeStr}</span>
          </div>
        )}
        {message.content && (
          <p className="text-sm md:text-base text-dark-text/95 font-sans leading-relaxed whitespace-pre-wrap break-words">
            <FormattedText text={message.content} />
          </p>
        )}
        <ChatMessageMedia mediaUrls={message.media_urls} gifUrl={message.gif_url} onImageClick={onImageClick} />
      </div>
    </div>
  );
};
