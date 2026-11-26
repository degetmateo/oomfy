import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { BookmarkEntry, BookmarkFolder } from '@oomfy/shared';
import { PublicationCard } from '../publication/PublicationCard.js';

interface Props {
  items: BookmarkEntry[];
  folders: BookmarkFolder[];
  canReorder: boolean;
  onMoveFolder: (publicationId: string, folderId: string | null) => Promise<void>;
  onRemoveBookmark: (publicationId: string) => Promise<void>;
  onReorder: (orderedPublicationIds: string[]) => Promise<void>;
}

export const BookmarkSortableList: React.FC<Props> = ({
  items,
  folders,
  canReorder,
  onMoveFolder,
  onRemoveBookmark,
  onReorder,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const upBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const downBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeIndex, setDropBeforeIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const dragStateRef = useRef<{
    pubId: string;
    fromIdx: number;
    pointerId: number;
  } | null>(null);

  const commitOrder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const orderedIds = next.map((entry) => entry.publication_id);
    setAnnouncement(`Publicación movida a la posición ${toIdx + 1} de ${next.length}.`);
    await onReorder(orderedIds);
  };

  const handleKeyboardStep = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const movedPubId = items[idx].publication_id;
    await commitOrder(idx, targetIdx);
    requestAnimationFrame(() => {
      const atTop = targetIdx === 0;
      const atBottom = targetIdx === items.length - 1;
      const focusUp = direction === -1 ? !atTop : atBottom;
      const btn = focusUp ? upBtnRefs.current.get(movedPubId) : downBtnRefs.current.get(movedPubId);
      btn?.focus({ preventScroll: true });
    });
  };

  const computeDropSlot = (clientY: number): number => {
    const container = listRef.current;
    if (!container) return items.length;
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-bookmark-item]'));
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) return i;
    }
    return rows.length;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, pubId: string, idx: number) => {
    if (!canReorder || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture?.(e.pointerId);
    dragStateRef.current = { pubId, fromIdx: idx, pointerId: e.pointerId };
    setDraggingId(pubId);
    setDropBeforeIndex(idx);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const active = dragStateRef.current;
    if (!active || e.pointerId !== active.pointerId) return;
    setDropBeforeIndex(computeDropSlot(e.clientY));
  };

  const cleanupDrag = () => {
    dragStateRef.current = null;
    setDraggingId(null);
    setDropBeforeIndex(null);
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLButtonElement>) => {
    const active = dragStateRef.current;
    if (!active || e.pointerId !== active.pointerId) return;
    const rawSlot = computeDropSlot(e.clientY);
    const targetIdx = rawSlot > active.fromIdx ? rawSlot - 1 : rawSlot;
    cleanupDrag();
    if (targetIdx !== active.fromIdx) {
      await commitOrder(active.fromIdx, targetIdx);
    }
  };

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        ref={listRef}
        className={`divide-y divide-dark-border ${draggingId ? 'is-dragging-bookmarks' : ''}`}
      >
        {items.map((entry, idx) => {
          const isDragging = draggingId === entry.publication_id;
          const showDropLine = draggingId !== null && dropBeforeIndex === idx;
          return (
            <div
              key={entry.publication_id}
              data-bookmark-item={entry.publication_id}
              className={`relative border-b border-dark-border transition-opacity ${
                isDragging ? 'opacity-60 ring-1 ring-brand-500' : ''
              } ${showDropLine ? 'border-t-2 border-t-brand-400' : ''}`}
            >
              <div
                data-no-card-nav="true"
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-dark-card/35 border-b border-dark-border/60 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  {canReorder && (
                    <>
                      <button
                        type="button"
                        onPointerDown={(e) => handlePointerDown(e, entry.publication_id, idx)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={(e) => void handlePointerUp(e)}
                        onPointerCancel={cleanupDrag}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && draggingId) {
                            e.preventDefault();
                            cleanupDrag();
                            setAnnouncement('Reordenamiento cancelado.');
                          }
                        }}
                        aria-label="Arrastrar para reordenar"
                        title="Arrastrar para reordenar"
                        className="bookmark-drag-handle p-1 text-dark-muted hover:text-brand-400 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        ref={(el) => {
                          if (el) upBtnRefs.current.set(entry.publication_id, el);
                          else upBtnRefs.current.delete(entry.publication_id);
                        }}
                        type="button"
                        disabled={idx === 0}
                        onClick={() => void handleKeyboardStep(idx, -1)}
                        aria-label={`Subir publicación (posición ${idx + 1})`}
                        title="Subir"
                        className="p-1 border border-dark-border text-dark-muted hover:text-brand-400 hover:border-brand-500 disabled:opacity-35 pixel-button"
                      >
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        ref={(el) => {
                          if (el) downBtnRefs.current.set(entry.publication_id, el);
                          else downBtnRefs.current.delete(entry.publication_id);
                        }}
                        type="button"
                        disabled={idx === items.length - 1}
                        onClick={() => void handleKeyboardStep(idx, 1)}
                        aria-label={`Bajar publicación (posición ${idx + 1})`}
                        title="Bajar"
                        className="p-1 border border-dark-border text-dark-muted hover:text-brand-400 hover:border-brand-500 disabled:opacity-35 pixel-button"
                      >
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Mover a carpeta"
                    value={entry.folder_id || ''}
                    onChange={(e) => void onMoveFolder(entry.publication_id, e.target.value || null)}
                    className="px-2 py-1 bg-dark-bg border border-dark-border text-xs text-dark-text focus:outline-none focus:border-brand-500 font-sans"
                  >
                    <option value="">Sin carpeta</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void onRemoveBookmark(entry.publication_id)}
                    aria-label="Quitar de guardados"
                    title="Quitar de guardados"
                    className="p-1.5 border border-dark-border text-dark-muted hover:text-red-400 hover:border-red-500 pixel-button transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {entry.publication ? (
                <PublicationCard post={{ ...entry.publication, is_bookmarked: true }} hideBottomBorder />
              ) : (
                <div className="p-4 text-xs text-dark-muted">Publicación no disponible o eliminada.</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
