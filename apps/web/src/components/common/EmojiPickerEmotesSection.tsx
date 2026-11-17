import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { useEmoteStore } from '../../stores/emoteStore.js';

interface Props {
  onSelectEmote: (token: string) => void;
}

export const EmojiPickerEmotesSection: React.FC<Props> = ({ onSelectEmote }) => {
  const user = useAuthStore((s) => s.user);
  const { emotes, isLoaded, isLoading, fetchEmotes } = useEmoteStore();

  useEffect(() => {
    if (!isLoaded && !isLoading) void fetchEmotes();
  }, [isLoaded, isLoading, fetchEmotes]);

  const userEmotes = user ? emotes.filter((e) => e.creator_id === user.id) : [];
  if (userEmotes.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase font-bold text-dark-muted px-1 py-0.5 tracking-wider">
        Tus Emotes
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
        {userEmotes.map((emote) => (
          <button
            key={emote.id}
            type="button"
            onClick={() => onSelectEmote(`:${emote.name}: `)}
            title={`:${emote.name}:`}
            aria-label={`:${emote.name}:`}
            className="w-9 h-9 flex items-center justify-center p-1 hover:bg-dark-card/90 hover:scale-110 rounded transition-transform cursor-pointer"
          >
            <img src={emote.image_url} alt={emote.name} className="w-6 h-6 object-contain pointer-events-none" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="border-t border-dark-border/40 my-1.5" />
    </div>
  );
};
