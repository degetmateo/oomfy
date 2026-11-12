import { useSyncExternalStore, useEffect, useCallback, useMemo } from 'react';
import { Publication } from '@oomfy/shared';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';

export function usePublicationModel<T extends Publication | null | undefined>(
  postOrId?: T | string | null
): Publication | undefined {
  const id = typeof postOrId === 'string' ? postOrId : postOrId?.id;
  const initialPost = typeof postOrId === 'object' && postOrId ? postOrId : undefined;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!id) return () => {};
      return publicationIdentityMap.subscribe(id, onStoreChange);
    },
    [id]
  );

  const getSnapshot = useCallback(() => {
    return id ? publicationIdentityMap.get(id) : undefined;
  }, [id]);

  useEffect(() => {
    if (initialPost?.id) {
      publicationIdentityMap.seed([initialPost]);
    }
  }, [initialPost]);

  const live = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const resolved = live || (initialPost as Publication | undefined);

  const targetId = resolved?.target_publication?.id;
  const liveTarget = targetId ? publicationIdentityMap.get(targetId) : undefined;

  return useMemo(() => {
    if (!resolved) return undefined;
    if (resolved.target_publication && liveTarget && resolved.target_publication !== liveTarget) {
      return { ...resolved, target_publication: liveTarget };
    }
    return resolved;
  }, [resolved, liveTarget]);
}

