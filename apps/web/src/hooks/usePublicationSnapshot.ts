import { Publication } from '@oomfy/shared';
import { usePublicationModel } from './usePublicationModel.js';

export function usePublicationSnapshot<T extends Publication | null | undefined>(post: T): T {
  const model = usePublicationModel(post);
  return (model || post) as T;
}
