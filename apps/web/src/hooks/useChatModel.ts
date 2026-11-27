import { useSyncExternalStore, useCallback } from 'react';
import { chatIdentityMap } from '../models/ChatIdentityMap.js';

const EMPTY_LIST: any[] = [];

export function useChatsListModel(): any[] {
  const subscribe = useCallback((cb: () => void) => chatIdentityMap.subscribeChats(cb), []);
  const getSnapshot = useCallback(() => chatIdentityMap.getChats(), []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useChatModel(chatId?: string | null): any | undefined {
  const subscribe = useCallback(
    (cb: () => void) => (chatId ? chatIdentityMap.subscribeChat(chatId, cb) : () => {}),
    [chatId]
  );
  const getSnapshot = useCallback(
    () => (chatId ? chatIdentityMap.getChat(chatId) : undefined),
    [chatId]
  );
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

export function useChatTypingModel(chatId?: string | null): string | null {
  const subscribe = useCallback(
    (cb: () => void) => (chatId ? chatIdentityMap.subscribeTyping(chatId, cb) : () => {}),
    [chatId]
  );
  const getSnapshot = useCallback(
    () => (chatId ? chatIdentityMap.getTyping(chatId) : null),
    [chatId]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAllChatsTypingModel(): Record<string, string> {
  const subscribe = useCallback((cb: () => void) => chatIdentityMap.subscribeAllTyping(cb), []);
  const getSnapshot = useCallback(() => chatIdentityMap.getAllTyping(), []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
