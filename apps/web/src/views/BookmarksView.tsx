import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { BookmarkEntry, BookmarkFolder } from '@oomfy/shared';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { BookmarkFolderSidebar } from '../components/bookmarks/BookmarkFolderSidebar.js';
import { BookmarkSortableList } from '../components/bookmarks/BookmarkSortableList.js';
import { BookmarkApiService } from '../services/BookmarkApiService.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { publicationIdentityMap } from '../models/PublicationIdentityMap.js';
import { useAuthStore } from '../stores/authStore.js';
import { useDialogStore } from '../stores/dialogStore.js';
import { useToastStore } from '../stores/toastStore.js';

export const BookmarksView: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const dialog = useDialogStore();
  const showToast = useToastStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFolder = searchParams.get('folder') || 'all';

  const handleSelectFolder = (folderId: string) => {
    setSearchParams(folderId === 'all' ? {} : { folder: folderId }, { replace: true });
  };

  const foldersQuery = useQuery<BookmarkFolder[]>({
    queryKey: ['bookmark-folders'],
    queryFn: () => BookmarkApiService.listFolders(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const bookmarksQuery = useQuery<{ items: BookmarkEntry[]; hasMore: boolean }>({
    queryKey: ['bookmarks', selectedFolder],
    queryFn: async () => {
      const data = await BookmarkApiService.listBookmarks(selectedFolder, 50, 0);
      const pubs = data.items.map((i) => i.publication).filter(Boolean);
      if (pubs.length > 0) publicationIdentityMap.ingest(pubs, Date.now());
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  const folders = foldersQuery.data || [];
  const items = bookmarksQuery.data?.items || [];
  const canReorder = selectedFolder !== 'all' && items.length > 1;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    queryClient.invalidateQueries({ queryKey: ['bookmark-folders'] });
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const created = await BookmarkApiService.createFolder(name);
      invalidateAll();
      if (created?.id) handleSelectFolder(created.id);
      showToast('Carpeta creada', 'success');
    } catch (err: any) {
      dialog.alert(err?.message || 'No se pudo crear la carpeta.', 'Error');
    }
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    try {
      await BookmarkApiService.renameFolder(folderId, name);
      invalidateAll();
      showToast('Carpeta renombrada', 'success');
    } catch (err: any) {
      dialog.alert(err?.message || 'No se pudo renombrar la carpeta.', 'Error');
    }
  };

  const handleDeleteFolder = async (folder: BookmarkFolder) => {
    const ok = await dialog.confirm({
      title: 'Eliminar carpeta',
      message: `¿Eliminar la carpeta "${folder.name}"? Sus publicaciones permanecerán guardadas en "Sin carpeta".`,
      isDanger: true,
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await BookmarkApiService.deleteFolder(folder.id);
      if (selectedFolder === folder.id) handleSelectFolder('all');
      invalidateAll();
      showToast('Carpeta eliminada', 'success');
    } catch (err: any) {
      dialog.alert(err?.message || 'No se pudo eliminar la carpeta.', 'Error');
    }
  };

  const handleMoveFolder = async (publicationId: string, folderId: string | null) => {
    try {
      await BookmarkApiService.moveBookmark(publicationId, folderId);
      invalidateAll();
      showToast('Publicación movida de carpeta', 'success');
    } catch (err: any) {
      dialog.alert(err?.message || 'No se pudo mover la publicación.', 'Error');
    }
  };

  const handleRemoveBookmark = async (publicationId: string) => {
    try {
      await BookmarkApiService.removeBookmark(publicationId);
      PublicationCacheService.applyPatch(queryClient, publicationId, (p) => ({ ...p, is_bookmarked: false }));
      invalidateAll();
      showToast('Publicación quitada de guardados', 'success');
    } catch (err: any) {
      dialog.alert(err?.message || 'No se pudo quitar de guardados.', 'Error');
    }
  };

  const handleReorder = async (orderedPublicationIds: string[]) => {
    const folderId = selectedFolder === 'unfiled' || selectedFolder === 'all' ? null : selectedFolder;
    const prev = queryClient.getQueryData<{ items: BookmarkEntry[]; hasMore: boolean }>(['bookmarks', selectedFolder]);
    if (prev?.items) {
      const byPubId = new Map(prev.items.map((item) => [item.publication_id, item]));
      const reordered = orderedPublicationIds.map((id) => byPubId.get(id)).filter(Boolean) as BookmarkEntry[];
      queryClient.setQueryData(['bookmarks', selectedFolder], { ...prev, items: reordered });
    }
    try {
      await BookmarkApiService.reorderBookmarks(folderId, orderedPublicationIds);
    } catch (err: any) {
      if (prev) queryClient.setQueryData(['bookmarks', selectedFolder], prev);
      dialog.alert(err?.message || 'No se pudo guardar el orden.', 'Error');
    }
  };

  const handleRefresh = () => Promise.all([foldersQuery.refetch(), bookmarksQuery.refetch()]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col min-h-screen font-mono">
        <Header
          title="Guardados"
          subtitle={`${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'}`}
          onRefresh={handleRefresh}
          isRefreshing={bookmarksQuery.isFetching || foldersQuery.isFetching}
        />

        <BookmarkFolderSidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        {bookmarksQuery.isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            <p>No se pudieron cargar tus publicaciones guardadas.</p>
            <button
              type="button"
              onClick={() => void bookmarksQuery.refetch()}
              className="mt-3 px-3 py-1 border border-brand-500 text-brand-400 hover:bg-brand-500 hover:text-black font-bold pixel-button"
            >
              Reintentar
            </button>
          </div>
        ) : bookmarksQuery.isLoading ? (
          <div className="p-8 text-center text-xs text-dark-muted">Cargando guardados...</div>
        ) : items.length > 0 ? (
          <BookmarkSortableList
            items={items}
            folders={folders}
            canReorder={canReorder}
            onMoveFolder={handleMoveFolder}
            onRemoveBookmark={handleRemoveBookmark}
            onReorder={handleReorder}
          />
        ) : (
          <div role="status" className="p-10 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
            <Bookmark className="w-8 h-8 text-dark-muted/70" aria-hidden="true" />
            <p className="font-bold text-white">No hay publicaciones guardadas aquí.</p>
            <p className="font-sans">Guarda publicaciones desde el feed o muévelas a tus carpetas.</p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};
