import { create } from 'zustand';
import { Publication, PublicUser } from '@oomfy/shared';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { userIdentityMap } from '../models/UserIdentityMap.js';

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

export const useEntityRegistryStore = create<EntityRegistryState>((set) => {
  publicationIdentityMap.subscribeGlobal(() => {
    const pubs: Record<string, Publication> = {};
    for (const p of publicationIdentityMap.getAll()) pubs[p.id] = p;
    set({ publications: pubs });
  });

  return {
    publications: {},
    inFlightPubs: {},
    mutatedAt: {},
    usersByUsername: {},

    ingestPublications: (items, fetchedAt = Date.now()) => {
      publicationIdentityMap.ingest(items, fetchedAt);
    },

    seedPublications: (items) => {
      publicationIdentityMap.seed(items);
    },

    patchPublication: (id, updater, markMutated = true) => {
      publicationIdentityMap.patch(id, updater, markMutated);
    },

    setPubInFlight: (id, delta) => {
      publicationIdentityMap.setInFlight(id, delta);
      set((state) => {
        const count = Math.max(0, (state.inFlightPubs[id] || 0) + delta);
        const next = { ...state.inFlightPubs };
        if (count === 0) delete next[id];
        else next[id] = count;
        return { inFlightPubs: next };
      });
    },

    ingestUsers: (items) => {
      userIdentityMap.ingest(items);
      set((state) => {
        const next = { ...state.usersByUsername };
        for (const u of items) {
          if (u?.username) next[u.username.toLowerCase()] = u;
        }
        return { usersByUsername: next };
      });
    },

    seedUser: (user) => {
      if (user?.username) {
        userIdentityMap.seed(user);
        set((state) => ({ usersByUsername: { ...state.usersByUsername, [user.username.toLowerCase()]: user } }));
      }
    },

    patchUser: (username, updater) => {
      const updated = userIdentityMap.patch(username, updater);
      if (updated) {
        set((state) => ({ usersByUsername: { ...state.usersByUsername, [username.toLowerCase()]: updated } }));
      }
    },

    clearRegistry: () => {
      publicationIdentityMap.clear();
      userIdentityMap.clear();
      set({ publications: {}, inFlightPubs: {}, mutatedAt: {}, usersByUsername: {} });
    },
  };
});
