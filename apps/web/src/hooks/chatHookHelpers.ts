import { QueryClient } from '@tanstack/react-query';
import { PublicUser } from '@oomfy/shared';
import { extractMessageSnippet } from '../models/chatModelHelpers.js';
import { OutgoingChatPayload } from '../components/chat/ChatInputBar.js';

export function syncChatListQueryOnMessage(
  queryClient: QueryClient,
  msg: any,
  userId?: string,
  selectedChatId?: string | null
): boolean {
  const msgChatId = msg.chat_id?.toLowerCase();
  const isActive = selectedChatId?.toLowerCase() === msgChatId;
  let found = false;
  queryClient.setQueryData(['chats'], (oldData: any) => {
    if (!oldData?.data) return oldData;
    const list = [...oldData.data];
    const index = list.findIndex((c: any) => c.id?.toLowerCase() === msgChatId);
    if (index === -1) return oldData;
    found = true;
    const target = {
      ...list[index],
      last_message: { id: msg.id, content: extractMessageSnippet(msg), sender_id: msg.sender_id, created_at: msg.created_at },
      unread_count: isActive ? 0 : (list[index].unread_count || 0) + (msg.sender_id !== userId ? 1 : 0),
      updated_at: msg.created_at,
    };
    list.splice(index, 1);
    list.unshift(target);
    return { ...oldData, data: list };
  });
  return found;
}

export function buildOptimisticChatMsg(
  tempId: string,
  chatId: string,
  currentUserId: string,
  currentUser: PublicUser | null,
  payload: OutgoingChatPayload
) {
  const previewUrls = payload.files.map((f) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : ''));
  const replyMeta = payload.replyTo
    ? { id: payload.replyTo.id, content: payload.replyTo.content, sender_username: payload.replyTo.sender?.username, sender_name: payload.replyTo.sender?.name }
    : null;
  return {
    id: tempId, chat_id: chatId, sender_id: currentUserId, content: payload.content, reply_to_id: payload.replyToId,
    sender: { id: currentUserId, username: currentUser?.username || '', name: currentUser?.name || 'Tú', icon_url: currentUser?.icon_url || null },
    media_urls: previewUrls, gif_url: payload.gifUrl, embeds: [], quoted_publication: null, created_at: new Date().toISOString(), deliveryState: 'sending', retryPayload: payload, reply_to: replyMeta,
  };
}

export function buildChatSendBody(chatId: string, payload: OutgoingChatPayload) {
  if (payload.files.length === 0) {
    return { chat_id: chatId, content: payload.content, reply_to_id: payload.replyToId, gif_url: payload.gifUrl };
  }
  const fd = new FormData();
  fd.append('chat_id', chatId);
  if (payload.content) fd.append('content', payload.content);
  if (payload.replyToId) fd.append('reply_to_id', payload.replyToId);
  if (payload.gifUrl) fd.append('gif_url', payload.gifUrl);
  payload.files.forEach((f) => fd.append('images', f));
  return fd;
}
