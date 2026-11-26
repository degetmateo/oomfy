import { PublicUser } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { userIdentityMap } from './UserIdentityMap.js';
import {
  applyLastMessageToChat, buildChatSnapshot, ChatSnapshot, hydrateChatMap,
  mergeMessagesList, sortChatsDesc, syncParticipantInStores,
} from './chatModelHelpers.js';

export type { ChatSnapshot };

export class ChatIdentityMap {
  private static readonly MAX_CHATS = 100;
  private static readonly MAX_MESSAGE_THREADS = 25;
  private static readonly MAX_MESSAGES_PER_THREAD = 150;
  private static instance: ChatIdentityMap;
  private chats = new Map<string, any>();
  private chatsCache: any[] = [];
  private messagesByChat = new Map<string, any[]>();
  private hasMoreByChat = new Map<string, boolean>();
  private chatsFetchedAt = 0;
  private messagesFetchedAt = new Map<string, number>();
  private subject = new ObservableSubject();

  private constructor() { userIdentityMap.onUserSynced((u) => this.syncParticipant(u)); }
  public static getInstance(): ChatIdentityMap { return (this.instance ??= new ChatIdentityMap()); }
  private rebuildChats(): void { this.chatsCache = sortChatsDesc(this.chats.values()); }

  public getChats(): any[] { return this.chatsCache; }
  public getChat(id?: string | null): any | undefined { return id ? this.chats.get(id.toLowerCase()) : undefined; }
  public getMessages(id?: string | null): any[] | undefined {
    if (!id) return undefined;
    const key = id.toLowerCase();
    const list = this.messagesByChat.get(key);
    if (list) {
      this.messagesByChat.delete(key);
      this.messagesByChat.set(key, list);
    }
    return list;
  }
  public hasMore(id?: string | null): boolean { return id ? Boolean(this.hasMoreByChat.get(id.toLowerCase())) : false; }
  public isChatsStale(ttlMs = 30_000): boolean { return this.chatsFetchedAt === 0 || Date.now() - this.chatsFetchedAt >= ttlMs; }
  public isMessagesStale(id?: string | null, ttlMs = 60_000): boolean {
    const ts = id ? (this.messagesFetchedAt.get(id.toLowerCase()) || 0) : 0;
    return ts === 0 || Date.now() - ts >= ttlMs;
  }
  public subscribeChats(l: Listener): () => void { return this.subject.subscribe('__chats__', l); }
  public subscribeMessages(id: string, l: Listener): () => void { return this.subject.subscribe(`msg:${id.toLowerCase()}`, l); }
  public subscribeGlobal(l: Listener): () => void { return this.subject.subscribeGlobal(l); }

  public ingestChats(items: any[], fetchedAt = Date.now(), markFetched = true): void {
    const parts: PublicUser[] = [];
    for (const c of items) {
      if (!c?.id) continue;
      const key = c.id.toLowerCase();
      this.chats.set(key, { ...this.chats.get(key), ...c });
      if (Array.isArray(c.participants)) parts.push(...c.participants);
    }
    if (parts.length > 0) userIdentityMap.ingest(parts, fetchedAt, false);
    if (markFetched) this.chatsFetchedAt = Math.max(this.chatsFetchedAt, fetchedAt);
    this.rebuildChats();
    if (this.chats.size > ChatIdentityMap.MAX_CHATS) {
      const keep = new Set(this.chatsCache.slice(0, ChatIdentityMap.MAX_CHATS).map((c) => c.id.toLowerCase()));
      for (const k of this.chats.keys()) if (!keep.has(k)) this.chats.delete(k);
      this.rebuildChats();
    }
    this.subject.notify('__chats__');
  }

  private commitMessages(key: string, next: any[], lastMsg: any): void {
    const trimmed = next.length > ChatIdentityMap.MAX_MESSAGES_PER_THREAD
      ? next.slice(-ChatIdentityMap.MAX_MESSAGES_PER_THREAD)
      : next;
    this.messagesByChat.delete(key);
    this.messagesByChat.set(key, trimmed);
    while (this.messagesByChat.size > ChatIdentityMap.MAX_MESSAGE_THREADS) {
      const oldestKey = this.messagesByChat.keys().next().value;
      if (oldestKey === undefined) break;
      this.messagesByChat.delete(oldestKey);
      this.hasMoreByChat.delete(oldestKey);
      this.messagesFetchedAt.delete(oldestKey);
    }
    if (lastMsg && applyLastMessageToChat(this.chats, key, lastMsg)) this.rebuildChats();
    this.subject.notifyMany([`msg:${key}`, '__chats__']);
  }

  public ingestMessages(chatId: string, items: any[], mode: 'replace' | 'prepend' | 'append' = 'replace', fetchedAt = Date.now(), markFetched = true, hasMore?: boolean): void {
    const key = chatId.toLowerCase(), next = mergeMessagesList(this.messagesByChat.get(key) || [], items, mode);
    if (typeof hasMore === 'boolean') this.hasMoreByChat.set(key, hasMore);
    if (markFetched) this.messagesFetchedAt.set(key, Math.max(this.messagesFetchedAt.get(key) || 0, fetchedAt));
    const senders = items.map((m) => m?.sender).filter((s) => s?.username);
    if (senders.length > 0) userIdentityMap.ingest(senders, fetchedAt, false);
    this.commitMessages(key, next, next[next.length - 1]);
  }

  public upsertMessage(chatId: string, msg: any, replaceId?: string): void {
    const key = chatId.toLowerCase();
    const next = mergeMessagesList((this.messagesByChat.get(key) || []).filter((m) => m.id !== replaceId && m.id !== msg.id), [msg], 'append');
    this.commitMessages(key, next, !String(msg.id).startsWith('temp-') ? msg : null);
  }

  public removeMessage(chatId: string, msgId: string): void {
    const key = chatId.toLowerCase();
    const next = (this.messagesByChat.get(key) || []).filter((m) => m.id !== msgId);
    this.commitMessages(key, next, next[next.length - 1]);
  }

  public patchChat(chatId: string, updater: (c: any) => any): void {
    const prev = this.chats.get(chatId.toLowerCase());
    if (!prev) return;
    this.chats.set(chatId.toLowerCase(), updater(prev));
    this.rebuildChats(); this.subject.notify('__chats__');
  }

  public syncParticipant(user: PublicUser): void {
    const changed = syncParticipantInStores(this.chats, this.messagesByChat, user);
    if (changed.includes('__chats__')) this.rebuildChats();
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public exportSnapshot(): ChatSnapshot { return buildChatSnapshot(this.chatsCache, this.messagesByChat); }
  public hydrateSnapshot(data?: ChatSnapshot | null): void { hydrateChatMap(data, this.messagesByChat, (i, t, m) => this.ingestChats(i, t, m), (id, msgs, md, t, mk) => this.ingestMessages(id, msgs, md, t, mk)); }
  public clear(): void { this.chats.clear(); this.chatsCache = []; this.messagesByChat.clear(); this.hasMoreByChat.clear(); this.messagesFetchedAt.clear(); this.chatsFetchedAt = 0; this.subject.clear(); }
}

export const chatIdentityMap = ChatIdentityMap.getInstance();
