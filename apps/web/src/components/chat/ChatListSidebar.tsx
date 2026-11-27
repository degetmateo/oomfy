import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { MobileDrawerTrigger } from '../layout/MobileDrawerTrigger.js';
import { ChatListItem } from './ChatListItem.js';

interface Props {
  chats: any[];
  isLoading: boolean;
  selectedChatId: string | null;
  typingChats?: Record<string, string>;
  width?: number;
  getOtherParticipant: (chat: any) => any;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
}

export const ChatListSidebar: React.FC<Props> = ({
  chats, isLoading, selectedChatId, typingChats, width, getOtherParticipant, onSelectChat, onOpenNewChat,
}) => (
  <div
    style={width ? { width: `${width}px` } : undefined}
    className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 chat-sidebar-resizable flex-col border-r border-dark-border bg-dark-bg flex-shrink-0 h-full overflow-hidden`}
  >
    <header className="sticky top-0 z-20 backdrop-blur-md bg-dark-bg/85 border-b border-dark-border px-4 sm:px-6 pb-3.5 safe-top-header flex items-center gap-3 select-none flex-shrink-0">
      <MobileDrawerTrigger />
      <div className="flex-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
          Mensajes
        </h1>
      </div>
      <button
        type="button"
        onClick={onOpenNewChat}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black transition-colors pixel-button flex-shrink-0"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Nuevo</span>
      </button>
    </header>

    <div className="flex-1 overflow-y-auto pb-32 md:pb-12">
      {isLoading ? (
        <div className="p-8 text-center text-xs text-dark-muted">Cargando conversaciones...</div>
      ) : chats.length > 0 ? (
        chats.map((chat) => {
          const isSelected = Boolean(selectedChatId && chat.id?.toLowerCase() === selectedChatId.toLowerCase());
          const typingOverride = typingChats?.[chat.id?.toLowerCase()];

          return (
            <ChatListItem
              key={chat.id}
              chatId={chat.id}
              initialChat={chat}
              isSelected={isSelected}
              typingOverride={typingOverride}
              getOtherParticipant={getOtherParticipant}
              onSelectChat={onSelectChat}
            />
          );
        })
      ) : (
        <div className="p-8 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
          <MessageSquare className="w-8 h-8 opacity-40 text-brand-400" />
          <p className="font-bold text-white">No tienes conversaciones.</p>
          <button onClick={onOpenNewChat} className="mt-2 px-3 py-1.5 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold text-xs pixel-button">
            Iniciar chat
          </button>
        </div>
      )}
    </div>
  </div>
);
