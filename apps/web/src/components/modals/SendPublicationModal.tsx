import React, { useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QueryClientContext } from '@tanstack/react-query';
import { Check, Search, Send, X } from 'lucide-react';
import { LIMITS, PublicUser } from '@oomfy/shared';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PixelAvatar } from '../common/PixelAvatar.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  authorUsername?: string;
  contentPreview?: string | null;
}

interface RecipientOption {
  id: string;
  username: string;
  name: string;
  icon_url?: string | null;
}

export const SendPublicationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  postId,
  authorUsername,
  contentPreview,
}) => {
  const titleId = useId();
  const searchInputId = useId();
  const messageInputId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queryClient = useContext(QueryClientContext);
  const { user: currentUser } = useAuthStore();
  const dialog = useDialogStore();

  const [recentUsers, setRecentUsers] = useState<RecipientOption[]>([]);
  const [searchResults, setSearchResults] = useState<RecipientOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<RecipientOption[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) {
      if (typeof el.showModal === 'function') {
        if (!el.open) el.showModal();
      } else {
        el.setAttribute('open', '');
      }
    } else if (el.open || el.hasAttribute('open')) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    let cancelled = false;
    ApiClient.get<{ success: boolean; data?: any[] }>('/chats')
      .then((res) => {
        if (cancelled) return;
        const users: RecipientOption[] = [];
        const seen = new Set<string>();
        for (const chat of res?.data || []) {
          for (const part of chat?.participants || []) {
            const u = part?.user || part;
            const uname = u?.username?.toLowerCase();
            if (!uname || uname === currentUser?.username?.toLowerCase() || seen.has(uname)) continue;
            seen.add(uname);
            users.push({
              id: String(u.id || u.user_id || uname),
              username: u.username,
              name: u.name || u.username,
              icon_url: u.icon_url ?? null,
            });
          }
        }
        setRecentUsers(users);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, currentUser?.username]);

  useEffect(() => {
    if (!isOpen) return;
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(() => {
      ApiClient.get<{ success: boolean; data?: PublicUser[] }>(`/aux/search-users?q=${encodeURIComponent(clean)}`)
        .then((res) => {
          if (cancelled) return;
          const items = (res?.data || [])
            .filter((u) => u?.username && u.username.toLowerCase() !== currentUser?.username?.toLowerCase())
            .map((u) => ({ id: u.id, username: u.username, name: u.name, icon_url: u.icon_url }));
          setSearchResults(items);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, currentUser?.username]);

  // Light-dismiss fallback for browsers lacking closedby="any"
  useEffect(() => {
    const el = dialogRef.current;
    if (!isOpen || !el) return;
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onDown = (e: PointerEvent) => { pressedOutside = isOutside(e); };
    const onUp = (e: PointerEvent) => { if (pressedOutside && isOutside(e)) onClose(); };
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('cancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('cancel', onCancel);
    };
  }, [isOpen, onClose]);

  const visibleCandidates = useMemo(() => {
    return searchQuery.trim() ? searchResults : recentUsers;
  }, [searchQuery, searchResults, recentUsers]);

  const selectedSet = useMemo(
    () => new Set(selected.map((u) => u.username.toLowerCase())),
    [selected]
  );

  const toggleRecipient = (candidate: RecipientOption) => {
    const key = candidate.username.toLowerCase();
    setSelected((prev) =>
      prev.some((item) => item.username.toLowerCase() === key)
        ? prev.filter((item) => item.username.toLowerCase() !== key)
        : prev.length < 20
          ? [...prev, candidate]
          : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected.length === 0 || isSending) return;
    setIsSending(true);
    setErrorMsg(null);
    try {
      await ApiClient.post('/chats/share-publication', {
        publication_id: postId,
        recipient_usernames: selected.map((u) => u.username),
        content: messageText.trim(),
      });
      queryClient?.invalidateQueries({ queryKey: ['chats'] });
      dialog.alert(
        selected.length === 1
          ? `Publicación enviada a @${selected[0].username}.`
          : `Publicación enviada a ${selected.length} usuarios.`,
        'Enviado'
      );
      setSelected([]);
      setMessageText('');
      setSearchQuery('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo enviar la publicación.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as any)}
      data-no-card-nav="true"
      data-no-swipe="true"
      onClick={(e) => e.stopPropagation()}
      className="dialog-modal backdrop:bg-black/80 bg-dark-bg border-2 border-dark-border shadow-pixel text-dark-text font-mono p-0 w-[calc(100%-1.5rem)] max-w-md m-auto overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
        <div className="flex items-center gap-2 text-brand-400">
          <Send className="w-4 h-4" aria-hidden="true" />
          <h1 id={titleId} className="font-bold text-xs uppercase tracking-wider text-white">
            Enviar publicación por mensaje
          </h1>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Cerrar"
          className="p-1 hover:bg-dark-border text-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
        {(authorUsername || contentPreview) && (
          <div className="p-2.5 bg-dark-card/50 border border-dark-border text-xs">
            {authorUsername && <span className="font-bold text-brand-400">@{authorUsername}</span>}
            {contentPreview && (
              <p className="text-dark-muted font-sans truncate mt-0.5">{contentPreview}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={searchInputId} className="block text-[11px] font-bold text-dark-muted uppercase mb-1">
            Destinatarios ({selected.length}/20)
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-dark-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id={searchInputId}
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuarios para enviar..."
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full pl-8 pr-2.5 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Destinatarios seleccionados">
            {selected.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => toggleRecipient(u)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-brand-500/20 border border-brand-500/60 text-brand-300 hover:bg-red-950/40 hover:border-red-500 hover:text-red-300 transition-colors"
                aria-label={`Quitar a @${u.username}`}
              >
                <span>@{u.username}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className="max-h-44 overflow-y-auto border border-dark-border bg-dark-card/30 divide-y divide-dark-border/60">
          {isSearching ? (
            <p className="p-3 text-xs text-dark-muted text-center">Buscando usuarios...</p>
          ) : visibleCandidates.length === 0 ? (
            <p className="p-3 text-xs text-dark-muted text-center">
              {searchQuery.trim() ? 'Sin resultados.' : 'Busca un usuario para seleccionarlo.'}
            </p>
          ) : (
            visibleCandidates.map((u) => {
              const checked = selectedSet.has(u.username.toLowerCase());
              return (
                <label
                  key={u.username}
                  className="flex items-center justify-between gap-2.5 px-3 py-2 cursor-pointer hover:bg-dark-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecipient(u)}
                      className="sr-only"
                    />
                    <PixelAvatar src={u.icon_url || `/members/${u.username}/icon`} username={u.username} sizeClass="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-dark-muted truncate">@{u.username}</p>
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-brand-500 border-brand-500 text-black' : 'border-dark-border bg-dark-bg'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div>
          <label htmlFor={messageInputId} className="block text-[11px] font-bold text-dark-muted uppercase mb-1">
            Mensaje opcional
          </label>
          <textarea
            id={messageInputId}
            rows={2}
            maxLength={LIMITS.MESSAGE_CONTENT_MAX}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Añade un comentario opcional..."
            className="w-full p-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans resize-none"
          />
        </div>

        {errorMsg && (
          <p role="alert" className="text-xs text-red-400 font-sans">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="px-3 py-1.5 border border-dark-border text-dark-muted hover:text-white text-xs font-bold pixel-button"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={selected.length === 0 || isSending}
            className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isSending ? 'Enviando...' : `Enviar${selected.length > 0 ? ` (${selected.length})` : ''}`}</span>
          </button>
        </div>
      </form>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};
