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
  private typingByChat = new Map<string, string>();
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private typingCache: Record<string, string> = {};
  private subject = new ObservableSubject();

  private constructor() { userIdentityMap.onUserSynced((u) => this.syncParticipant(u)); }
  public static getInstance(): ChatIdentityMap { return (this.instance ??= new ChatIdentityMap()); }
  private rebuildChats(): void { this.chatsCache = sortChatsDesc(this.chats.values()); }
  private rebuildTyping(): void { this.typingCache = Object.fromEntries(this.typingByChat.entries()); }

  public getChats(): any[] { return this.chatsCache; }
  public getChat(id?: string | null): any | undefined { return id ? this.chats.get(id.toLowerCase()) : undefined; }
  public getTyping(id?: string | null): string | null { return id ? (this.typingByChat.get(id.toLowerCase()) ?? null) : null; }
  public getAllTyping(): Record<string, string> { return this.typingCache; }
  public hasMessage(chatId?: string | null, msgId?: string | null): boolean {
    if (!chatId || !msgId) return false;
    return Boolean(this.messagesByChat.get(chatId.toLowerCase())?.some((m) => m.id === msgId));
  }

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
  public subscribeChat(id: string, l: Listener): () => void { return this.subject.subscribe(`chat:${id.toLowerCase()}`, l); }
  public subscribeMessages(id: string, l: Listener): () => void { return this.subject.subscribe(`msg:${id.toLowerCase()}`, l); }
  public subscribeTyping(id: string, l: Listener): () => void { return this.subject.subscribe(`typing:${id.toLowerCase()}`, l); }
  public subscribeAllTyping(l: Listener): () => void { return this.subject.subscribe('__typing__', l); }
  public subscribeGlobal(l: Listener): () => void { return this.subject.subscribeGlobal(l); }

  public setTyping(chatId: string, username: string, ttlMs = 4000): void {
    if (!chatId || !username) return;
    const key = chatId.toLowerCase();
    const existingTimer = this.typingTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    this.typingByChat.set(key, username);
    this.typingTimers.set(key, setTimeout(() => this.clearTyping(key), ttlMs));
    this.rebuildTyping();
    this.subject.notifyMany([`typing:${key}`, '__typing__']);
  }

  public clearTyping(chatId: string): void {
    if (!chatId) return;
    const key = chatId.toLowerCase();
    const existingTimer = this.typingTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.typingTimers.delete(key);
    }
    if (!this.typingByChat.has(key)) return;
    this.typingByChat.delete(key);
    this.rebuildTyping();
    this.subject.notifyMany([`typing:${key}`, '__typing__']);
  }

  public ingestChats(items: any[], fetchedAt = Date.now(), markFetched = true): void {
    const parts: PublicUser[] = [];
    const touchedChannels: string[] = ['__chats__'];
    for (const c of items) {
      if (!c?.id) continue;
      const key = c.id.toLowerCase();
      this.chats.set(key, { ...this.chats.get(key), ...c });
      touchedChannels.push(`chat:${key}`);
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
    this.subject.notifyMany(touchedChannels);
  }

  private commitMessages(key: string, next: any[], lastMsg: any | null | undefined): void {
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
    const channels = [`msg:${key}`, '__chats__'];
    if (lastMsg !== undefined && applyLastMessageToChat(this.chats, key, lastMsg)) {
      this.rebuildChats();
      channels.push(`chat:${key}`);
    }
    this.subject.notifyMany(channels);
  }

  public ingestMessages(chatId: string, items: any[], mode: 'replace' | 'prepend' | 'append' = 'replace', fetchedAt = Date.now(), markFetched = true, hasMore?: boolean): void {
    const key = chatId.toLowerCase(), next = mergeMessagesList(this.messagesByChat.get(key) || [], items, mode);
    if (typeof hasMore === 'boolean') this.hasMoreByChat.set(key, hasMore);
    if (markFetched) this.messagesFetchedAt.set(key, Math.max(this.messagesFetchedAt.get(key) || 0, fetchedAt));
    const senders = items.map((m) => m?.sender).filter((s) => s?.username);
    if (senders.length > 0) userIdentityMap.ingest(senders, fetchedAt, false);
    this.commitMessages(key, next, next.length > 0 ? next[next.length - 1] : undefined);
  }

  public upsertMessage(chatId: string, msg: any, replaceId?: string): void {
    const key = chatId.toLowerCase();
    const next = mergeMessagesList((this.messagesByChat.get(key) || []).filter((m) => m.id !== replaceId && m.id !== msg.id), [msg], 'append');
    this.commitMessages(key, next, next[next.length - 1] ?? msg);
  }

  public receiveRealtimeMessage(msg: any, currentUserId?: string, isChatActive = false): boolean {
    if (!msg?.chat_id || !msg?.id) return false;
    const key = msg.chat_id.toLowerCase();
    const alreadyKnown = this.hasMessage(key, msg.id);
    if (msg.sender?.username) userIdentityMap.ingest([msg.sender], Date.now(), false);
    this.clearTyping(key);
    this.upsertMessage(key, msg);

    const existingChat = this.chats.get(key);
    if (!existingChat) return false;

    if (!alreadyKnown) {
      const nextUnread = isChatActive
        ? 0
        : (existingChat.unread_count || 0) + (msg.sender_id !== currentUserId ? 1 : 0);
      this.chats.set(key, { ...existingChat, unread_count: nextUnread });
      this.rebuildChats();
      this.subject.notifyMany([`chat:${key}`, '__chats__']);
    }
    return true;
  }

  public removeMessage(chatId: string, msgId: string): void {
    const key = chatId.toLowerCase();
    const next = (this.messagesByChat.get(key) || []).filter((m) => m.id !== msgId);
    this.commitMessages(key, next, next[next.length - 1] ?? null);
  }

  public patchChat(chatId: string, updater: (c: any) => any): void {
    const key = chatId.toLowerCase();
    const prev = this.chats.get(key);
    if (!prev) return;
    this.chats.set(key, updater(prev));
    this.rebuildChats();
    this.subject.notifyMany([`chat:${key}`, '__chats__']);
  }

  public syncParticipant(user: PublicUser): void {
    const changed = syncParticipantInStores(this.chats, this.messagesByChat, user);
    if (changed.includes('__chats__')) this.rebuildChats();
    if (changed.length > 0) this.subject.notifyMany(changed);
  }

  public exportSnapshot(): ChatSnapshot { return buildChatSnapshot(this.chatsCache, this.messagesByChat); }
  public hydrateSnapshot(data?: ChatSnapshot | null): void { hydrateChatMap(data, this.messagesByChat, (i, t, m) => this.ingestChats(i, t, m), (id, msgs, md, t, mk) => this.ingestMessages(id, msgs, md, t, mk)); }
  public clear(): void {
    for (const timer of this.typingTimers.values()) clearTimeout(timer);
    this.typingTimers.clear();
    this.typingByChat.clear();
    this.typingCache = {};
    this.chats.clear();
    this.chatsCache = [];
    this.messagesByChat.clear();
    this.hasMoreByChat.clear();
    this.messagesFetchedAt.clear();
    this.chatsFetchedAt = 0;
    this.subject.clear();
  }
}

export const chatIdentityMap = ChatIdentityMap.getInstance();
