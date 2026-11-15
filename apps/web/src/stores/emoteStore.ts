import { create } from 'zustand';
import { CustomEmote } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';

interface EmoteState {
  emotes: CustomEmote[];
  emoteMap: Record<string, CustomEmote>;
  userEmoteMap: Record<string, Record<string, CustomEmote>>;
  isLoaded: boolean;
  isLoading: boolean;
  setEmotes: (emotes: CustomEmote[]) => void;
  addEmote: (emote: CustomEmote) => void;
  removeEmote: (id: string) => void;
  importEmote: (emoteId: string) => Promise<CustomEmote>;
  fetchEmotes: (force?: boolean) => Promise<void>;
}

const buildMaps = (emotes: CustomEmote[]) => {
  const emoteMap: Record<string, CustomEmote> = {};
  const userEmoteMap: Record<string, Record<string, CustomEmote>> = {};
  for (const emote of emotes) {
    const key = emote.name.toLowerCase();
    emoteMap[key] = emote;
    if (!userEmoteMap[emote.creator_id]) userEmoteMap[emote.creator_id] = {};
    userEmoteMap[emote.creator_id][key] = emote;
  }
  return { emoteMap, userEmoteMap };
};

let inflightFetch: Promise<void> | null = null;

export const useEmoteStore = create<EmoteState>((set, get) => ({
  emotes: [],
  emoteMap: {},
  userEmoteMap: {},
  isLoaded: false,
  isLoading: false,

  setEmotes: (emotes) => set({ emotes, ...buildMaps(emotes), isLoaded: true }),

  addEmote: (emote) =>
    set((state) => {
      const emotes = [...state.emotes.filter((e) => e.id !== emote.id), emote].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return { emotes, ...buildMaps(emotes), isLoaded: true };
    }),

  removeEmote: (id) =>
    set((state) => {
      const emotes = state.emotes.filter((e) => e.id !== id);
      return { emotes, ...buildMaps(emotes) };
    }),

  importEmote: async (emoteId) => {
    const res = await ApiClient.post<{ success: boolean; data: CustomEmote }>(`/settings/emotes/${emoteId}/import`, {});
    get().addEmote(res.data);
    return res.data;
  },

  fetchEmotes: async (force = false) => {
    const { isLoaded } = get();
    if (isLoaded && !force) return;
    if (inflightFetch && !force) return inflightFetch;

    set({ isLoading: true });
    inflightFetch = ApiClient.get<{ success: boolean; data: CustomEmote[] }>('/aux/emotes?limit=500')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        set({ emotes: list, ...buildMaps(list), isLoaded: true, isLoading: false });
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
