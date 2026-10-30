import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { ApiClient } from '../../services/api.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

export const KlipyGifModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['klipy-gifs', searchTerm],
    queryFn: () => ApiClient.get(`/aux/gifs?q=${encodeURIComponent(searchTerm)}&limit=24`),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 font-mono">
      <div className="w-full max-w-lg bg-[#1a1a1a] border-2 border-dark-border shadow-pixel flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b-2 border-dark-border bg-[#141414]">
          <span className="font-bold text-white text-xs tracking-wider uppercase">Seleccionar GIF (Klipy)</span>
          <button onClick={onClose} className="p-1 hover:bg-dark-border text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-dark-border bg-dark-bg">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar GIFs..."
              className="w-full pl-9 pr-3 py-1.5 bg-dark-input border border-dark-border text-xs text-white outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-xs text-dark-muted">Cargando GIFs...</div>
          ) : data?.data && data.data.length > 0 ? (
            data.data.map((gif: any) => (
              <div
                key={gif.id}
                onClick={() => {
                  onSelect(gif.url);
                  onClose();
                }}
                className="h-28 bg-dark-bg border border-dark-border overflow-hidden cursor-pointer hover:border-brand-500 group"
              >
                <img
                  src={gif.preview_url || gif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-dark-muted">No se encontraron GIFs.</div>
          )}
        </div>
      </div>
    </div>
  );
};

