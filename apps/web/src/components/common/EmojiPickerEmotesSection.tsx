import React, { useEffect, useMemo } from 'react';
import { CustomEmote } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { useEmoteStore } from '../../stores/emoteStore.js';
import { normalizeEmojiQuery } from '../../utils/emojiData.js';

export function useFilteredUserEmotes(searchQuery = ''): CustomEmote[] {
  const user = useAuthStore((s) => s.user);
  const { emotes, isLoaded, isLoading, fetchEmotes } = useEmoteStore();

  useEffect(() => {
    if (!isLoaded && !isLoading) void fetchEmotes();
  }, [isLoaded, isLoading, fetchEmotes]);

  return useMemo(() => {
    const mine = user ? emotes.filter((e) => e.creator_id === user.id) : [];
    const norm = normalizeEmojiQuery(searchQuery);
    if (!norm) return mine;
    return mine.filter((e) => normalizeEmojiQuery(e.name).includes(norm));
  }, [user, emotes, searchQuery]);
}

interface Props {
  onSelectEmote: (token: string) => void;
  emotes: CustomEmote[];
}

export const EmojiPickerEmotesSection: React.FC<Props> = ({ onSelectEmote, emotes }) => {
  if (emotes.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase font-bold text-dark-muted px-1 py-0.5 tracking-wider">
        Tus Emotes
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
        {emotes.map((emote) => (
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
