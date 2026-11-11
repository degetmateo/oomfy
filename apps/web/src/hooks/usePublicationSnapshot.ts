import { useEffect } from 'react';
import { Publication } from '@oomfy/shared';
import { useEntityRegistryStore } from '../stores/entityRegistryStore.js';

export function usePublicationSnapshot<T extends Publication | null | undefined>(post: T): T {
  const pubId = post?.id;
  const live = useEntityRegistryStore((s) => (pubId ? s.publications[pubId] : undefined));
  const targetId = post?.target_publication?.id;
  const liveTarget = useEntityRegistryStore((s) => (targetId ? s.publications[targetId] : undefined));
  const seedPublications = useEntityRegistryStore((s) => s.seedPublications);

  useEffect(() => {
    if (post?.id) seedPublications([post]);
  }, [pubId, seedPublications]);

  if (!post) return post;
  const resolved = live ? { ...post, ...live } : post;
  if (resolved.target_publication && liveTarget) {
    return { ...resolved, target_publication: { ...resolved.target_publication, ...liveTarget } } as T;
  }
  return resolved as T;
}

