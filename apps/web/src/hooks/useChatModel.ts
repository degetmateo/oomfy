import { useSyncExternalStore, useCallback } from 'react';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';

const EMPTY_LIST: any[] = [];

export function useChatsListModel(): any[] {
  const subscribe = useCallback((cb: () => void) => chatIdentityMap.subscribeChats(cb), []);
  const getSnapshot = useCallback(() => chatIdentityMap.getChats(), []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useChatMessagesModel(chatId?: string | null): any[] {
  const subscribe = useCallback(
    (cb: () => void) => (chatId ? chatIdentityMap.subscribeMessages(chatId, cb) : () => {}),
    [chatId]
  );
  const getSnapshot = useCallback(
    () => (chatId ? chatIdentityMap.getMessages(chatId) ?? EMPTY_LIST : EMPTY_LIST),
    [chatId]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
