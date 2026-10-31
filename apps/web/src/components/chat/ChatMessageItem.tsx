import React from 'react';

interface Props {
  message: any;
  isMe: boolean;
}

export const ChatMessageItem: React.FC<Props> = ({ message, isMe }) => {
  return (
    <div
      className={`flex flex-col max-w-[80%] ${
        isMe ? 'self-end items-end' : 'self-start items-start'
      }`}
    >
      <div
        className={`p-2.5 text-xs font-sans leading-relaxed border ${
          isMe
            ? 'bg-brand-500/15 border-brand-500/40 text-white'
            : 'bg-dark-card border-dark-border text-dark-text'
        }`}
      >
        <p className="whitespace-pre-line font-sans">{message.content}</p>
      </div>
      <span className="text-[10px] text-dark-muted mt-1 px-1 font-mono">
        {new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
};

