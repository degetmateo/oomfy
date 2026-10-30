import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Plus } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { ApiClient } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { StartChatModal } from '../components/chat/StartChatModal.js';
import { ChatThread } from '../components/chat/ChatThread.js';
import { PixelAvatar } from '../components/common/PixelAvatar.js';

export const ChatsView: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isStartOpen, setIsStartOpen] = useState(false);

  const { data: chatsData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['chats'],
    queryFn: () => ApiClient.get('/chats'),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  const chats = chatsData?.data || [];
  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const getOtherParticipant = (chat: any) => {
    return chat.participants?.find((p: any) => p.user_id !== user?.id) || {
      name: 'Usuario de oomfy',
      username: 'oomfy_user',
      icon_url: null,
    };
  };

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Mensajes">
        <button
          onClick={() => setIsStartOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black transition-colors pixel-button"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo mensaje</span>
        </button>
      </Header>

      <div className="flex flex-1 min-h-[550px] relative">
        <div
          className={`${
            selectedChatId ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 flex-col border-r border-dark-border divide-y divide-dark-border overflow-y-auto bg-dark-bg`}
        >
          {isLoading ? (
            <div className="p-8 text-center text-xs text-dark-muted">Cargando conversaciones...</div>
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const other = getOtherParticipant(chat);
              const isSelected = selectedChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-3 cursor-pointer hover:bg-dark-card/50 transition-colors flex items-center gap-3 ${
                    isSelected ? 'bg-dark-card border-l-2 border-brand-500' : ''
                  }`}
                >
                  <PixelAvatar src={other.icon_url} username={other.username} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-xs truncate">{other.name}</p>
                      <span className="text-[10px] text-dark-muted">
                        {chat.last_message?.created_at
                          ? new Date(chat.last_message.created_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-dark-muted truncate mt-0.5">
                      {chat.last_message?.content || 'Sin mensajes aún'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
              <MessageSquare className="w-8 h-8 opacity-40 text-brand-400" />
              <p className="font-bold text-white">No tienes conversaciones.</p>
              <p>¡Inicia un chat con cualquier miembro de oomfy!</p>
              <button
                onClick={() => setIsStartOpen(true)}
                className="mt-2 px-3 py-1.5 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold text-xs pixel-button"
              >
                Iniciar conversación
              </button>
            </div>
          )}
        </div>

        <div className={`${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
          {selectedChat && user ? (
            <ChatThread
              chat={selectedChat}
              currentUserId={user.id}
              onBack={() => setSelectedChatId(null)}
            />
          ) : (
            <div className="m-auto text-center text-dark-muted p-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-400" />
              <p className="text-sm font-bold text-white">Selecciona una conversación</p>
              <p className="text-xs mt-1">O inicia un nuevo mensaje con cualquier usuario.</p>
            </div>
          )}
        </div>
      </div>

      <StartChatModal
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        onChatSelected={(chatId) => setSelectedChatId(chatId)}
      />
    </div>
  );
};

