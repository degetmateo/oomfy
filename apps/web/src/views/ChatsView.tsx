import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { useAuthStore } from '../stores/authStore.js';
import { StartChatModal } from '../components/chat/StartChatModal.js';
import { ChatThread } from '../components/chat/ChatThread.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';

export const ChatsView: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryChatId = searchParams.get('id') || searchParams.get('chatId');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(queryChatId || null);
  const [isStartOpen, setIsStartOpen] = useState(false);

  useEffect(() => {
    if (queryChatId && queryChatId !== selectedChatId) {
      setSelectedChatId(queryChatId);
    }
  }, [queryChatId]);

  const { data: chatsData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chats'],
    queryFn: () => ApiClient.get('/chats'),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  const chats = chatsData?.data || [];
  const selectedChat = chats.find((c) => c.id === selectedChatId);

  useEffect(() => {
    const socket = SocketClient.getSocket();
    const handleNewChatMessage = (msg: any) => {
      queryClient.setQueryData(['chats'], (oldData: any) => {
        if (!oldData?.data) return oldData;
        const list = [...oldData.data];
        const index = list.findIndex((c: any) => c.id === msg.chat_id);
        const snippet = msg.content || (msg.gif_url ? 'GIF' : msg.media_urls?.length ? 'Imagen' : 'Mensaje');
        const newLastMessage = {
          id: msg.id,
          content: snippet,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
        };

        if (index !== -1) {
          const isCurrentActive = selectedChatId === msg.chat_id;
          const targetChat = {
            ...list[index],
            last_message: newLastMessage,
            unread_count: isCurrentActive ? 0 : (list[index].unread_count || 0) + (msg.sender_id !== user?.id ? 1 : 0),
            updated_at: msg.created_at,
          };
          list.splice(index, 1);
          list.unshift(targetChat);
          return { ...oldData, data: list };
        } else {
          queryClient.invalidateQueries({ queryKey: ['chats'] });
          return oldData;
        }
      });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    };

    socket.on('new_chat_message', handleNewChatMessage);
    return () => {
      socket.off('new_chat_message', handleNewChatMessage);
    };
  }, [queryClient, selectedChatId, user?.id]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    queryClient.setQueryData(['chats'], (oldData: any) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((c: any) =>
          c.id === chatId ? { ...c, unread_count: 0 } : c
        ),
      };
    });
  };

  const getOtherParticipant = (chat: any) => {
    return (
      chat?.participants?.find((p: any) => (p.user_id || p.id) !== user?.id) || {
        name: 'Usuario de oomfy',
        username: 'oomfy_user',
        icon_url: null,
      }
    );
  };

  const other = selectedChat ? getOtherParticipant(selectedChat) : null;

  return (
    <div className="flex flex-1 w-full h-full overflow-hidden font-mono bg-dark-bg">
      {/* Left Column: Conversations List */}
      <div
        className={`${
          selectedChatId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 flex-col border-r border-dark-border bg-dark-bg flex-shrink-0 h-full overflow-hidden`}
      >
        <div className="p-3 border-b border-dark-border flex items-center justify-between bg-dark-bg select-none flex-shrink-0">
          <h1 className="text-sm font-bold text-white tracking-wider uppercase">Mensajes</h1>
          <button
            onClick={() => setIsStartOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black transition-colors pixel-button"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-dark-border">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-dark-muted">Cargando conversaciones...</div>
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const part = getOtherParticipant(chat);
              const isSelected = selectedChatId === chat.id;
              const hasUnread = Boolean(chat.unread_count && chat.unread_count > 0);

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`p-3 sm:p-3.5 cursor-pointer hover:bg-dark-card/50 transition-colors flex items-center gap-3 ${
                    isSelected ? 'bg-dark-card border-l-4 border-brand-500' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <PixelAvatar src={part.icon_url} username={part.username} sizeClass="w-12 h-12 md:w-11 md:h-11" />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-400 border border-black rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm sm:text-base truncate ${hasUnread ? 'font-bold text-white' : 'font-medium text-dark-text'}`}>
                        {part.name}
                      </p>
                      <span className="text-[11px] text-dark-muted flex-shrink-0">
                        {chat.last_message?.created_at
                          ? new Date(chat.last_message.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs sm:text-sm truncate flex-1 ${hasUnread ? 'text-white font-semibold' : 'text-dark-muted'}`}>
                        {chat.last_message?.content || 'Sin mensajes aún'}
                      </p>
                      {hasUnread && (
                        <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-brand-500 text-black border border-brand-400 pixel-button flex-shrink-0 animate-pulse">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
              <MessageSquare className="w-8 h-8 opacity-40 text-brand-400" />
              <p className="font-bold text-white">No tienes conversaciones.</p>
              <button
                onClick={() => setIsStartOpen(true)}
                className="mt-2 px-3 py-1.5 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold text-xs pixel-button"
              >
                Iniciar chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right/Center Column: Chat Thread View */}
      <div
        className={`${
          !selectedChatId ? 'hidden md:flex' : 'fixed inset-0 z-50 md:relative md:inset-auto md:z-auto'
        } flex-1 flex flex-col h-full min-w-0 bg-dark-bg overflow-hidden`}
      >
        {selectedChat && other && user ? (
          <>
            <header className="sticky top-0 z-20 bg-dark-bg/95 border-b border-dark-border px-3 sm:px-4 py-2.5 flex items-center gap-3 select-none flex-shrink-0">
              <button
                onClick={() => setSelectedChatId(null)}
                className="md:hidden p-2 -ml-1.5 text-dark-muted hover:text-brand-400 hover:bg-dark-border/40 transition-colors rounded select-none flex-shrink-0"
                title="Volver"
                aria-label="Volver atrás"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <PixelAvatar src={other.icon_url} username={other.username} sizeClass="w-11 h-11 md:w-12 md:h-12" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-lg font-bold text-white truncate leading-tight">{other.name}</h2>
                <p className="text-xs md:text-sm text-dark-muted truncate leading-tight">@{other.username}</p>
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ChatThread chat={selectedChat} currentUserId={user.id} />
            </div>
          </>
        ) : (
          <div className="m-auto text-center text-dark-muted p-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-400" />
            <p className="text-sm font-bold text-white">Selecciona una conversación</p>
            <p className="text-xs mt-1">O inicia un nuevo mensaje con cualquier usuario.</p>
          </div>
        )}
      </div>

      <StartChatModal
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        onChatSelected={(chatId) => handleSelectChat(chatId)}
      />
    </div>
  );
};
