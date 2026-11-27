import { PublicUser } from '@oomfy/shared';

export interface ChatSnapshot { chats: any[]; messagesByChat: Record<string, any[]>; }

function safeTimeMs(raw?: string | null): number {
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function mergeMessagesList(existing: any[], incoming: any[], mode: 'replace' | 'prepend' | 'append'): any[] {
  const map = new Map<string, any>();
  const base = mode === 'replace' ? incoming : mode === 'prepend' ? [...incoming, ...existing] : [...existing, ...incoming];
  for (const m of base) {
    if (!m?.id) continue;
    const prev = map.get(m.id);
    map.set(m.id, prev ? { ...prev, ...m } : m);
  }
  return Array.from(map.values()).sort(
    (a, b) => safeTimeMs(a.created_at) - safeTimeMs(b.created_at)
  );
}

export function extractMessageSnippet(msg: any): string {
  if (!msg) return 'Mensaje';
  return msg.content || (msg.gif_url ? 'GIF' : msg.media_urls?.length ? 'Imagen' : 'Mensaje');
}

export function applyLastMessageToChat(chats: Map<string, any>, key: string, msg: any | null): boolean {
  const chat = chats.get(key);
  if (!chat) return false;
  if (msg === null) {
    if (!chat.last_message) return false;
    chats.set(key, { ...chat, last_message: null });
    return true;
  }
  if (!msg) return false;
  const msgTs = safeTimeMs(msg.created_at);
  const prevTs = safeTimeMs(chat.updated_at);
  const nextUpdatedAt = msgTs >= prevTs ? (msg.created_at || chat.updated_at) : chat.updated_at;
  chats.set(key, {
    ...chat,
    last_message: { id: msg.id, content: extractMessageSnippet(msg), sender_id: msg.sender_id, created_at: msg.created_at },
    updated_at: nextUpdatedAt,
  });
  return true;
}

export function patchParticipantEntity(part: any, u: PublicUser): any {
  if (!part) return part;
  const sameId = part.user_id === u.id || part.id === u.id;
  const sameName = part.username?.toLowerCase() === u.username.toLowerCase();
  if (!sameId && !sameName) return part;
  return { ...part, name: u.name, username: u.username, icon_url: u.icon_url };
}

export function sortChatsDesc(chats: Iterable<any>): any[] {
  return Array.from(chats).sort((a, b) => {
    const tsA = Math.max(safeTimeMs(a?.last_message?.created_at), safeTimeMs(a?.updated_at), safeTimeMs(a?.created_at));
    const tsB = Math.max(safeTimeMs(b?.last_message?.created_at), safeTimeMs(b?.updated_at), safeTimeMs(b?.created_at));
    return tsB - tsA;
  });
}

export function syncParticipantInStores(chats: Map<string, any>, messagesByChat: Map<string, any[]>, user: PublicUser): string[] {
  const changed: string[] = [];
  for (const [k, chat] of chats.entries()) {
    if (!Array.isArray(chat.participants)) continue;
    const nextParts = chat.participants.map((p: any) => patchParticipantEntity(p, user));
    if (nextParts.some((p: any, i: number) => p !== chat.participants[i])) {
      chats.set(k, { ...chat, participants: nextParts });
      changed.push(`chat:${k}`, '__chats__');
    }
  }
  for (const [k, list] of messagesByChat.entries()) {
    const nextList = list.map((m) => (m.sender ? { ...m, sender: patchParticipantEntity(m.sender, user) } : m));
    if (nextList.some((m, i) => m !== list[i])) {
      messagesByChat.set(k, nextList);
      changed.push(`msg:${k}`);
    }
  }
  return changed;
}

export function buildChatSnapshot(chatsCache: any[], messagesByChat: Map<string, any[]>): ChatSnapshot {
  const out: Record<string, any[]> = {};
  for (const [k, list] of messagesByChat.entries()) out[k] = list.slice(-30);
  return { chats: chatsCache.slice(0, 40), messagesByChat: out };
}

export function hydrateChatMap(
  data: ChatSnapshot | null | undefined,
  messagesByChat: Map<string, any[]>,
  ingestChats: (items: any[], ts: number, mark: boolean) => void,
  ingestMessages: (id: string, msgs: any[], mode: 'replace', ts: number, mark: boolean) => void
): void {
  if (data?.chats?.length) ingestChats(data.chats, 0, false);
  for (const [k, msgs] of Object.entries(data?.messagesByChat || {})) {
    if (!messagesByChat.has(k) && Array.isArray(msgs) && msgs.length) ingestMessages(k, msgs, 'replace', 0, false);
  }
}
