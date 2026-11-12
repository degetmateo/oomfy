import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquarePlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { ChatStartingOverlay } from './ChatStartingOverlay.js';
import { PublicUser } from '@oomfy/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChatSelected: (chatId: string) => void;
}

export const StartChatModal: React.FC<Props> = ({ isOpen, onClose, onChatSelected }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [targetUsername, setTargetUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const { data: usersData, isLoading } = useQuery<{ success: boolean; data: PublicUser[] }>({
    queryKey: ['chat-search-users', searchTerm],
    queryFn: () => (!searchTerm.trim()
      ? ApiClient.get('/aux/suggested-members?limit=10')
      : ApiClient.get(`/aux/search-users?q=${encodeURIComponent(searchTerm.trim())}`)),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleStart = async (username: string) => {
    setTargetUsername(username);
    setIsStarting(true);
    try {
      const res = await ApiClient.post<{ success: boolean; chatId: string }>('/chats/start', { target_username: username });
      if (res.chatId) {
        await queryClient.refetchQueries({ queryKey: ['chats'] });
        onChatSelected(res.chatId);
        onClose();
      }
    } catch (err: any) {
      useDialogStore.getState().alert(err.message || 'Error al iniciar chat', 'Error');
    } finally {
      setIsStarting(false);
      setTargetUsername(null);
    }
  };

  const users = usersData?.data || [];

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="start-chat-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 font-mono">
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-dark-bg border-2 border-dark-border shadow-pixel overflow-hidden">
        <ChatStartingOverlay isOpen={isStarting} username={targetUsername || undefined} />
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-brand-400" aria-hidden="true" />
            <h2 id="start-chat-modal-title" className="font-bold text-xs text-brand-400 uppercase tracking-wider">Nuevo mensaje directo</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 hover:bg-dark-border text-white"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>
        <div className="p-3 border-b border-dark-border">
          <div className="relative">
            <label htmlFor="start-chat-search" className="sr-only">Buscar por usuario o nombre</label>
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" aria-hidden="true" />
            <input id="start-chat-search" name="userSearch" type="search" enterKeyHint="search" spellCheck={false} autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por usuario o nombre..." className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-dark-border">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-dark-muted">Buscando usuarios...</div>
          ) : users.length > 0 ? (
            users.map((u) => (
              <button key={u.id} type="button" disabled={isStarting} onClick={() => handleStart(u.username)} className="w-full text-left p-3 hover:bg-dark-card/60 flex items-center justify-between cursor-pointer transition-colors disabled:opacity-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <PixelAvatar src={u.icon_url} username={u.username} sizeClass="w-8 h-8" />
                  <div className="truncate text-xs">
                    <p className="font-bold text-white truncate">{u.name}</p>
                    <p className="text-dark-muted text-[11px] truncate">@{u.username}</p>
                  </div>
                </div>
                <span className="px-3 py-1 text-[11px] font-bold border border-brand-500 text-brand-400">Chatear</span>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-dark-muted">No se encontraron usuarios.</div>
          )}
        </div>
      </div>
    </div>
  );
};
