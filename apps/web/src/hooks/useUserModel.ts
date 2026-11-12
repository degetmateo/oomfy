import { useSyncExternalStore, useEffect, useCallback } from 'react';
import { PublicUser } from '@oomfy/shared';
import { userIdentityMap } from '../models/UserIdentityMap.js';

export function useUserModel(userOrUsername?: PublicUser | string | null): PublicUser | undefined {
  const username = typeof userOrUsername === 'string' ? userOrUsername : userOrUsername?.username;
  const initialUser = typeof userOrUsername === 'object' && userOrUsername ? userOrUsername : undefined;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!username) return () => {};
      return userIdentityMap.subscribe(username, onStoreChange);
    },
    [username]
  );

  const getSnapshot = useCallback(() => {
    return username ? userIdentityMap.get(username) : undefined;
  }, [username]);

  useEffect(() => {
    if (initialUser?.username) {
      userIdentityMap.seed(initialUser);
    }
  }, [initialUser]);

  const live = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return live || initialUser;
}

