import { create } from 'zustand';
import { CustomEmote } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';

interface EmoteState {
  emotes: CustomEmote[];
  emoteMap: Record<string, CustomEmote>;
  isLoaded: boolean;
  isLoading: boolean;
  setEmotes: (emotes: CustomEmote[]) => void;
  addEmote: (emote: CustomEmote) => void;
  removeEmote: (id: string) => void;
  fetchEmotes: (force?: boolean) => Promise<void>;
}

const buildMap = (emotes: CustomEmote[]): Record<string, CustomEmote> => {
  const map: Record<string, CustomEmote> = {};
  for (const emote of emotes) {
    map[emote.name.toLowerCase()] = emote;
  }
  return map;
};

let inflightFetch: Promise<void> | null = null;

export const useEmoteStore = create<EmoteState>((set, get) => ({
  emotes: [],
  emoteMap: {},
  isLoaded: false,
  isLoading: false,

  setEmotes: (emotes) => set({ emotes, emoteMap: buildMap(emotes), isLoaded: true }),

  addEmote: (emote) =>
    set((state) => {
      const emotes = [...state.emotes.filter((e) => e.id !== emote.id), emote].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return { emotes, emoteMap: buildMap(emotes), isLoaded: true };
    }),

  removeEmote: (id) =>
    set((state) => {
      const emotes = state.emotes.filter((e) => e.id !== id);
      return { emotes, emoteMap: buildMap(emotes) };
    }),

  fetchEmotes: async (force = false) => {
    const { isLoaded } = get();
    if (isLoaded && !force) return;
    if (inflightFetch && !force) return inflightFetch;

    set({ isLoading: true });
    inflightFetch = ApiClient.get<{ success: boolean; data: CustomEmote[] }>('/aux/emotes?limit=200')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        set({ emotes: list, emoteMap: buildMap(list), isLoaded: true, isLoading: false });
      })
      .catch(() => {
        set({ isLoading: false });
      })
      .finally(() => {
        inflightFetch = null;
      });
    return inflightFetch;
  },
}));
