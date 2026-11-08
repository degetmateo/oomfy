import React from 'react';
import { Link } from 'react-router-dom';
import { CornerDownRight, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { FormattedText } from '../common/FormattedText.js';
import { ChatMessageMedia } from './ChatMessageMedia.js';
import { ChatMessageActions } from './ChatMessageActions.js';
import { useSwipeReply } from '../../hooks/useSwipeReply.js';

interface Props {
  message: any; isMe?: boolean; isFirstInGroup?: boolean;
  onReply?: (message: any) => void; onReport?: (message: any) => void; onDelete?: (message: any) => void;
  onRetry?: (message: any) => void; onDismissError?: (messageId: string) => void; onImageClick?: (url: string) => void;
}

export const ChatMessageItem: React.FC<Props> = ({
  message, isMe = false, isFirstInGroup = true, onReply, onReport, onDelete, onRetry, onDismissError, onImageClick,
}) => {
  const sender = message.sender || {};
  const senderName = sender.name || (isMe ? 'Tú' : 'Usuario');
  const senderUsername = sender.username || '';
  const iconUrl = sender.icon_url || (senderUsername ? `/members/${senderUsername}/icon` : null);
  const timeStr = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h24' });
  const touchProps = useSwipeReply(() => onReply?.(message));
  const isSending = message.deliveryState === 'sending';
  const isError = message.deliveryState === 'error';

  const replyNode = message.reply_to ? (
    <div className="flex items-center gap-1.5 text-xs md:text-sm text-dark-muted mb-1 select-none">
      <CornerDownRight className="w-4 h-4 text-brand-400/80 flex-shrink-0" />
      {message.reply_to.sender_username ? (
        <Link to={`/${message.reply_to.sender_username}`} className="font-bold text-brand-400 hover:underline">@{message.reply_to.sender_username}</Link>
      ) : (
        <span className="font-bold text-brand-400">@{message.reply_to.sender_username}</span>
      )}
      <span className="truncate max-w-sm text-dark-muted/80">{message.reply_to.content || '(archivo adjunto)'}</span>
    </div>
  ) : null;

  return (
    <div
      {...touchProps}
      className={`relative group flex gap-3 px-3 hover:bg-dark-card/40 transition-colors ${
        isFirstInGroup ? 'pt-2.5 pb-0.5 mt-2' : 'py-[3px]'
      } ${isSending ? 'opacity-70' : ''} ${isError ? 'bg-red-500/10 border-l-2 border-red-500' : ''}`}
    >
      {!isSending && !isError && (
        <ChatMessageActions onReply={() => onReply?.(message)} onReport={() => onReport?.(message)} onDelete={isMe ? () => onDelete?.(message) : undefined} />
      )}
      {isFirstInGroup ? (
        <div className="flex-shrink-0 pt-0.5">
          {senderUsername ? (
            <Link to={`/${senderUsername}`} className="block hover:opacity-80 transition-opacity">
              <PixelAvatar src={iconUrl} username={senderUsername} sizeClass="w-10 h-10 md:w-11 md:h-11" />
            </Link>
          ) : (
            <PixelAvatar src={iconUrl} username={senderUsername} sizeClass="w-10 h-10 md:w-11 md:h-11" />
          )}
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
            {senderUsername ? (
              <Link to={`/${senderUsername}`} className="group/author inline-flex items-baseline gap-2 hover:underline">
                <span className="font-bold text-sm md:text-base text-white">{senderName}</span>
                <span className="text-xs md:text-sm text-dark-muted font-mono">@{senderUsername}</span>
              </Link>
            ) : <span className="font-bold text-sm md:text-base text-white">{senderName}</span>}
            <span className="text-[10px] md:text-xs text-dark-muted font-mono">{timeStr}</span>
          </div>
        )}
        {message.content && (
          <p className={`text-sm md:text-base font-sans leading-relaxed whitespace-pre-wrap break-words ${isError ? 'text-red-400' : 'text-dark-text/95'}`}>
            <FormattedText text={message.content} className="font-sans" />
          </p>
        )}
        <ChatMessageMedia mediaUrls={message.media_urls} gifUrl={message.gif_url} onImageClick={onImageClick} />
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
