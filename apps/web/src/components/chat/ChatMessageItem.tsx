import React from 'react';
import { Link } from 'react-router-dom';
import { CornerDownRight, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { LinkPreviewCard } from '../publication/LinkPreviewCard.js';
import { ChatMessageMedia } from './ChatMessageMedia.js';
import { ChatMessageActions } from './ChatMessageActions.js';
import { ChatMessageReplyPreview } from './ChatMessageReplyPreview.js';
import { useSwipeReply } from '../../hooks/useSwipeReply.js';
import { formatMessageTimestamp, formatExactDateTime } from '../../utils/formatTime.js';
import { useUserModel } from '../../hooks/useUserModel.js';

interface Props {
  message: any; isMe?: boolean; isFirstInGroup?: boolean; isHighlighted?: boolean;
  onReply?: (message: any) => void; onReport?: (message: any) => void; onDelete?: (message: any) => void;
  onRetry?: (message: any) => void; onDismissError?: (messageId: string) => void;
  onImageClick?: (url: string) => void; onJumpToMessage?: (messageId: string) => void;
}

export const ChatMessageItem: React.FC<Props> = ({
  message, isMe = false, isFirstInGroup = true, isHighlighted = false,
  onReply, onReport, onDelete, onRetry, onDismissError, onImageClick, onJumpToMessage,
}) => {
  const rawSender = message.sender || {};
  const liveSender = useUserModel(rawSender.username);
  const sender = liveSender ? { ...rawSender, name: liveSender.name, username: liveSender.username, icon_url: liveSender.icon_url } : rawSender;
  const senderName = sender.name || (isMe ? 'Tú' : 'Usuario');
  const senderUsername = sender.username || '';
  const iconUrl = sender.icon_url || (senderUsername ? `/members/${senderUsername}/icon` : null);
  const timeStr = formatMessageTimestamp(message.created_at, Date.now(), isFirstInGroup);
  const exactTimeStr = formatExactDateTime(message.created_at);
  const { offset, isDragging, isTriggered, ...touchHandlers } = useSwipeReply(() => onReply?.(message));
  const isSending = message.deliveryState === 'sending';
  const isError = message.deliveryState === 'error';

  return (
    <div
      id={`msg-${message.id}`} data-message-id={message.id} {...touchHandlers}
      style={offset > 0 || isDragging
        ? { transform: `translateX(-${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' }
        : undefined}
      className={`relative group flex gap-3 px-3 hover:bg-dark-card/40 transition-colors ${isFirstInGroup ? 'pt-2.5 pb-0.5 mt-2' : 'py-[3px]'} ${isSending ? 'opacity-70' : ''} ${isError ? 'bg-red-500/10 border-l-2 border-red-500' : ''} ${isHighlighted ? 'bg-brand-500/25 ring-1 ring-brand-500/60 ' : ''}`}
    >
      {offset > 0 && (
        <div className="absolute right-2 top-0 bottom-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className={`p-1.5 rounded-full transition-all duration-150 ${isTriggered ? 'bg-brand-500 text-black scale-110 shadow-lg' : 'bg-dark-card text-brand-400/80 scale-95'}`}>
            <CornerDownRight className="w-4 h-4" />
          </div>
        </div>
      )}
      {!isSending && !isError && (
        <ChatMessageActions onReply={() => onReply?.(message)} onReport={() => onReport?.(message)} onDelete={isMe ? () => onDelete?.(message) : undefined} />
      )}
      {isFirstInGroup ? (
        <div className="flex-shrink-0 pt-0.5">
          {senderUsername ? (
            <Link to={`/${senderUsername}`} className="block hover:opacity-80 transition-opacity">
              <PixelAvatar src={iconUrl} username={senderUsername} sizeClass="w-10 h-10 md:w-11 md:h-11" />
            </Link>
          ) : <PixelAvatar src={iconUrl} username={senderUsername} sizeClass="w-10 h-10 md:w-11 md:h-11" />}
        </div>
      ) : (
        <div className="w-10 md:w-11 flex-shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity select-none leading-none pt-0.5">
          <time dateTime={message.created_at} title={exactTimeStr} className="text-[10px] md:text-xs text-dark-muted font-mono">{timeStr}</time>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <ChatMessageReplyPreview replyTo={message.reply_to} replyToId={message.reply_to_id} onJumpToMessage={onJumpToMessage} />
        {isFirstInGroup && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1 leading-none">
            {senderUsername ? (
              <Link to={`/${senderUsername}`} className="group/author inline-flex items-baseline gap-2 hover:underline">
                <span className="font-bold text-sm md:text-base text-white">{senderName}</span>
                <span className="text-xs md:text-sm text-dark-muted font-mono">@{senderUsername}</span>
              </Link>
            ) : <span className="font-bold text-sm md:text-base text-white">{senderName}</span>}
            <time dateTime={message.created_at} title={exactTimeStr} className="text-[10px] md:text-xs text-dark-muted font-mono">{timeStr}</time>
          </div>
        )}
        {message.content && (
          <div className={`text-sm md:text-base font-sans leading-relaxed whitespace-pre-wrap break-words ${isError ? 'text-red-400' : 'text-dark-text/95'}`}>
            <FormattedText text={message.content} authorId={message.sender_id || sender.id} className="font-sans" enlargeEmoteOnly />
          </div>
        )}
        <ChatMessageMedia mediaUrls={message.media_urls} gifUrl={message.gif_url} onImageClick={onImageClick} />
        {((Array.isArray(message.embeds) && message.embeds.length > 0) || message.quoted_publication) && (
          <div className="mt-2 w-full max-w-xl" data-no-swipe="true">
            <LinkPreviewCard embeds={message.embeds} targetPublication={message.quoted_publication || undefined} />
          </div>
        )}
        {isError && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-mono text-red-400">
            <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Error al enviar</span>
            <button type="button" onClick={() => onRetry?.(message)} className="inline-flex items-center gap-1 text-red-300 hover:text-white underline font-bold">
              <RotateCcw className="w-3 h-3" /> Reintentar
            </button>
            <button type="button" onClick={() => onDismissError?.(message.id)} className="inline-flex items-center gap-1 text-dark-muted hover:text-red-300 underline">
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
