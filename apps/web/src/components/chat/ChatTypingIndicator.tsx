import React from 'react';

interface Props {
  typingUser: string | null;
}

export const ChatTypingIndicator: React.FC<Props> = ({ typingUser }) => {
  return (
    <div
      className="h-6 px-3 text-xs sm:text-sm text-brand-400 font-mono flex items-center gap-2 select-none bg-dark-bg border-t border-dark-border/40 overflow-hidden flex-shrink-0 transition-opacity duration-150"
      aria-live="polite"
      aria-atomic="true"
    >
      {typingUser ? (
        <>
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse flex-shrink-0" aria-hidden="true" />
          <span className="truncate">@{typingUser} está escribiendo...</span>
        </>
      ) : null}
    </div>
  );
};
