import { QueryClient } from '@tanstack/react-query';
import { Publication, PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { PublicationCacheService } from '../services/PublicationCacheService.js';
import { useToastStore } from '../stores/toastStore.js';
import { buildOptimisticPublication } from './optimisticPublicationFactory.js';
import {
  insertOptimisticPublication,
  commitOptimisticPublication,
  rollbackOptimisticPublication,
} from './optimisticPublicationCache.js';

export interface OptimisticMeta {
  content: string;
  files: File[];
  gifs: string[];
}

export function submitOptimisticPublication(
  queryClient: QueryClient,
  formData: FormData,
  user: PublicUser | null,
  meta: OptimisticMeta,
  quotedPublication?: Publication | null
): void {
  const showToast = useToastStore.getState().showToast;
  if (!user) {
    ApiClient.post('/publications', formData).then(
      () => showToast('¡Publicación enviada!', 'success'),
      () => showToast('Ha ocurrido un error al enviar la publicación', 'error')
    );
    return;
  }

  const optimistic = buildOptimisticPublication({
    user,
    content: meta.content,
    files: meta.files,
    gifs: meta.gifs,
    type: quotedPublication ? 'quote' : 'default',
    targetPublication: quotedPublication || null,
  });
  insertOptimisticPublication(queryClient, optimistic);

  ApiClient.post<{ success?: boolean; data?: Publication }>('/publications', formData).then(
    (res) => {
      if (res?.data) commitOptimisticPublication(queryClient, optimistic.id, res.data);
      else PublicationCacheService.invalidatePublicationLists(queryClient);
      showToast('¡Publicación enviada!', 'success');
    },
    () => {
      rollbackOptimisticPublication(queryClient, optimistic);
      showToast('Ha ocurrido un error al enviar la publicación', 'error');
    }
  );
}

export function submitOptimisticReply(
  queryClient: QueryClient,
  formData: FormData,
  user: PublicUser | null,
  parentPublication: Publication,
  meta: OptimisticMeta
): void {
  const showToast = useToastStore.getState().showToast;
  if (!user) {
    ApiClient.post('/publications', formData).then(
      () => {
        queryClient.invalidateQueries({ queryKey: ['publication', parentPublication.id] });
        showToast('¡Respuesta enviada!', 'success');
      },
      () => showToast('Ha ocurrido un error al enviar la respuesta', 'error')
    );
    return;
  }

  const optimistic = buildOptimisticPublication({
    user,
    content: meta.content,
    files: meta.files,
    gifs: meta.gifs,
    type: 'reply',
    targetPublication: parentPublication,
  });
  insertOptimisticPublication(queryClient, optimistic);

  ApiClient.post<{ success?: boolean; data?: Publication }>('/publications', formData).then(
    (res) => {
      if (res?.data) commitOptimisticPublication(queryClient, optimistic.id, res.data);
      showToast('¡Respuesta enviada!', 'success');
    },
    () => {
      rollbackOptimisticPublication(queryClient, optimistic);
      showToast('Ha ocurrido un error al enviar la respuesta', 'error');
    }
  );
}
