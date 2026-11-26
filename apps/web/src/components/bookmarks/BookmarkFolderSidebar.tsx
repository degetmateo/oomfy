import React, { useState } from 'react';
import { Folder, FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react';
import { BookmarkFolder, LIMITS } from '@oomfy/shared';

interface Props {
  folders: BookmarkFolder[];
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folder: BookmarkFolder) => Promise<void>;
}

export const BookmarkFolderSidebar: React.FC<Props> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      await onCreateFolder(trimmed);
      setNewName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (folderId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await onRenameFolder(folderId, trimmed);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <section aria-label="Carpetas de guardados" className="p-3 sm:p-4 border-b border-dark-border bg-dark-card/25 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectFolder('all')}
          className={`px-3 py-1.5 text-xs font-bold border transition-colors pixel-button ${
            selectedFolder === 'all'
              ? 'bg-brand-500 text-black border-brand-500'
              : 'bg-dark-card border-dark-border text-dark-text hover:border-brand-500'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => onSelectFolder('unfiled')}
          className={`px-3 py-1.5 text-xs font-bold border transition-colors pixel-button ${
            selectedFolder === 'unfiled'
              ? 'bg-brand-500 text-black border-brand-500'
              : 'bg-dark-card border-dark-border text-dark-text hover:border-brand-500'
          }`}
        >
          Sin carpeta
        </button>

        {folders.map((folder) => {
          const isSelected = selectedFolder === folder.id;
          const isEditing = editingId === folder.id;

          if (isEditing) {
            return (
              <div key={folder.id} className="inline-flex items-center gap-1 bg-dark-bg border border-brand-500 px-2 py-1">
                <input
                  type="text"
                  value={editingName}
                  maxLength={LIMITS.BOOKMARK_FOLDER_NAME_MAX}
                  aria-label="Nuevo nombre de carpeta"
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void handleRename(folder.id); }
                    if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none w-28 font-sans"
                />
                <button type="button" onClick={() => void handleRename(folder.id)} aria-label="Confirmar nombre" className="text-brand-400 hover:text-white p-0.5">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => { setEditingId(null); setEditingName(''); }} aria-label="Cancelar edición" className="text-dark-muted hover:text-white p-0.5">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          }

          return (
            <div key={folder.id} className="inline-flex items-center border border-dark-border bg-dark-card">
              <button
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={`px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isSelected ? 'bg-brand-500 text-black' : 'text-dark-text hover:text-brand-400'
                }`}
              >
                <Folder className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{folder.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-black/80' : 'text-dark-muted'}`}>
                  ({folder.items_count})
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setEditingId(folder.id); setEditingName(folder.name); }}
                aria-label={`Renombrar carpeta ${folder.name}`}
                title={`Renombrar ${folder.name}`}
                className="px-1.5 py-1.5 text-dark-muted hover:text-white border-l border-dark-border"
              >
                <Pencil className="w-3 h-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void onDeleteFolder(folder)}
                aria-label={`Eliminar carpeta ${folder.name}`}
                title={`Eliminar ${folder.name}`}
                className="px-1.5 py-1.5 text-dark-muted hover:text-red-400 border-l border-dark-border"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newName}
          maxLength={LIMITS.BOOKMARK_FOLDER_NAME_MAX}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva carpeta..."
          aria-label="Nombre de nueva carpeta"
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-dark-bg border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
        />
        <button
          type="submit"
          disabled={!newName.trim() || isCreating}
          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center gap-1.5 flex-shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Crear carpeta</span>
        </button>
      </form>
    </section>
  );
};
