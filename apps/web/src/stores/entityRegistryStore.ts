import { create } from 'zustand';
import { Publication, PublicUser } from '@oomfy/shared';
import { collectPublications, mergePublicationEntity } from './entityMergeHelpers.js';

interface EntityRegistryState {
  publications: Record<string, Publication>;
  inFlightPubs: Record<string, number>;
  mutatedAt: Record<string, number>;
  usersByUsername: Record<string, PublicUser>;
  ingestPublications: (items: Array<Publication | null | undefined>, fetchedAt?: number) => void;
  seedPublications: (items: Array<Publication | null | undefined>) => void;
  patchPublication: (id: string, updater: (prev: Publication) => Publication, markMutated?: boolean) => void;
  setPubInFlight: (id: string, delta: 1 | -1) => void;
  ingestUsers: (items: Array<PublicUser | null | undefined>) => void;
  seedUser: (user: PublicUser | null | undefined) => void;
  patchUser: (username: string, updater: (prev: PublicUser) => PublicUser) => void;
  clearRegistry: () => void;
}

export const useEntityRegistryStore = create<EntityRegistryState>((set) => ({
  publications: {},
  inFlightPubs: {},
  mutatedAt: {},
  usersByUsername: {},

  ingestPublications: (items, fetchedAt = Date.now()) => {
    const collected = collectPublications(items);
    if (collected.size === 0) return;
    set((state) => {
      let changed = false;
      const next = { ...state.publications };
      for (const [id, pub] of collected.entries()) {
        const keepLocal = (state.inFlightPubs[id] || 0) > 0 || (state.mutatedAt[id] || 0) >= fetchedAt;
        const merged = mergePublicationEntity(next[id], pub, keepLocal);
        if (next[id] !== merged) { next[id] = merged; changed = true; }
      }
      return changed ? { publications: next } : state;
    });
  },

  seedPublications: (items) => {
    const collected = collectPublications(items);
    if (collected.size === 0) return;
    set((state) => {
      let changed = false;
      const next = { ...state.publications };
      for (const [id, pub] of collected.entries()) {
        if (!next[id]) { next[id] = pub; changed = true; }
      }
      return changed ? { publications: next } : state;
    });
  },

  patchPublication: (id, updater, markMutated = true) =>
    set((state) => {
      const current = state.publications[id];
      if (!current) return state;
      return {
        publications: { ...state.publications, [id]: updater(current) },
        mutatedAt: markMutated ? { ...state.mutatedAt, [id]: Date.now() } : state.mutatedAt,
      };
    }),

  setPubInFlight: (id, delta) =>
    set((state) => {
      const count = Math.max(0, (state.inFlightPubs[id] || 0) + delta);
      const next = { ...state.inFlightPubs };
      if (count === 0) delete next[id];
      else next[id] = count;
      return { inFlightPubs: next };
    }),

  ingestUsers: (items) =>
    set((state) => {
      const next = { ...state.usersByUsername };
      let changed = false;
      for (const u of items) {
        if (!u?.username) continue;
        const key = u.username.toLowerCase();
        next[key] = next[key] ? { ...next[key], ...u } : u;
        changed = true;
      }
      return changed ? { usersByUsername: next } : state;
    }),

  seedUser: (user) => {
    if (!user?.username) return;
    const key = user.username.toLowerCase();
    set((s) => (s.usersByUsername[key] ? s : { usersByUsername: { ...s.usersByUsername, [key]: user } }));
  },

  patchUser: (username, updater) =>
    set((state) => {
      const key = username.toLowerCase();
      const current = state.usersByUsername[key];
      return current ? { usersByUsername: { ...state.usersByUsername, [key]: updater(current) } } : state;
    }),

  clearRegistry: () => set({ publications: {}, inFlightPubs: {}, mutatedAt: {}, usersByUsername: {} }),
}));
