import { useState, useEffect, useMemo, useCallback, RefObject } from 'react';
import { CustomEmote, PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { useEmoteStore } from '../stores/emoteStore.js';

export type AutocompleteItem = { kind: 'emote'; emote: CustomEmote } | { kind: 'mention'; user: PublicUser };

const detectTrigger = (value: string, caret: number) => {
  const m = value.slice(0, caret).match(/(?:^|\s)(([:@])([a-zA-Z][a-zA-Z0-9_]*))$/);
  if (!m) return null;
  return { mode: m[2] === ':' ? ('emote' as const) : ('mention' as const), query: m[3], start: caret - m[1].length, end: caret };
};

export function useComposerAutocomplete(
  value: string,
  setValue: (val: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  textareaEl: HTMLTextAreaElement | null,
  maxLength?: number
) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { emotes, fetchEmotes } = useEmoteStore();
  const [caretTick, setCaretTick] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionUsers, setMentionUsers] = useState<PublicUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isFocused = Boolean(textareaEl && (typeof document === 'undefined' || document.activeElement === textareaEl));
  const caret = useMemo(() => (isFocused ? textareaEl?.selectionStart ?? value.length : value.length), [isFocused, textareaEl, value, caretTick]);
  const trigger = useMemo(() => detectTrigger(value, caret), [value, caret]);
  const triggerKey = trigger ? `${trigger.mode}:${trigger.start}:${trigger.query}` : null;
  const isDismissed = Boolean(triggerKey && dismissedAt === triggerKey);

  useEffect(() => { if (!triggerKey || triggerKey !== dismissedAt) setDismissedAt(null); }, [triggerKey, dismissedAt]);
  useEffect(() => { if (trigger?.mode === 'emote' && !isDismissed) void fetchEmotes(); }, [trigger?.mode, isDismissed, fetchEmotes]);

  useEffect(() => {
    if (trigger?.mode !== 'mention' || isDismissed) { setMentionUsers([]); setIsSearching(false); return; }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(() => {
      ApiClient.get<{ success: boolean; data: PublicUser[] }>(`/aux/search-users?q=${encodeURIComponent(trigger.query)}&limit=6`)
        .then((res) => { if (!cancelled) setMentionUsers(Array.isArray(res?.data) ? res.data : []); })
        .catch(() => { if (!cancelled) setMentionUsers([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trigger?.mode, trigger?.query, isDismissed]);

  const items: AutocompleteItem[] = useMemo(() => {
    if (!trigger || isDismissed) return [];
    if (trigger.mode === 'emote') {
      const q = trigger.query.toLowerCase();
      return emotes
        .filter((e) => (!currentUserId || e.creator_id === currentUserId) && e.name.toLowerCase().includes(q))
        .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
        .slice(0, 8).map((emote) => ({ kind: 'emote' as const, emote }));
    }
    return mentionUsers.slice(0, 6).map((user) => ({ kind: 'mention' as const, user }));
  }, [trigger, isDismissed, emotes, mentionUsers, currentUserId]);

  useEffect(() => { setActiveIndex(0); }, [triggerKey, items.length]);

  const selectItem = useCallback((idx: number) => {
    const picked = items[idx];
    if (!picked || !trigger) return;
    const token = picked.kind === 'emote' ? `:${picked.emote.name}: ` : `@${picked.user.username} `;
    const next = value.slice(0, trigger.start) + token + value.slice(trigger.end);
    if (maxLength && next.length > maxLength) return;
    setValue(next);
    setDismissedAt(null);
    const nextCaret = trigger.start + token.length;
    setTimeout(() => { const el = textareaRef.current; if (el) { el.focus(); el.setSelectionRange(nextCaret, nextCaret); } }, 0);
  }, [items, trigger, value, maxLength, setValue, textareaRef]);

  const isOpen = Boolean(trigger && !isDismissed && (items.length > 0 || isSearching));

  useEffect(() => {
    if (!textareaEl) return;
    const bumpCaret = () => setCaretTick((t) => t + 1);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || items.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActiveIndex((i) => (i + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActiveIndex((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); selectItem(activeIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDismissedAt(triggerKey); }
    };
    textareaEl.addEventListener('click', bumpCaret);
    textareaEl.addEventListener('keyup', bumpCaret);
    textareaEl.addEventListener('keydown', onKeyDown);
    return () => { textareaEl.removeEventListener('click', bumpCaret); textareaEl.removeEventListener('keyup', bumpCaret); textareaEl.removeEventListener('keydown', onKeyDown); };
  }, [textareaEl, isOpen, items.length, activeIndex, selectItem, triggerKey]);

  return { isOpen, mode: trigger?.mode ?? null, items, activeIndex, isSearching, selectItem, setActiveIndex };
}
