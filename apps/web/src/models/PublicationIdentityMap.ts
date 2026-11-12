import { Publication } from '@oomfy/shared';
import { ObservableSubject, Listener } from './ObservableSubject.js';
import { collectPublications, mergePublicationEntity } from '../stores/entityMergeHelpers.js';

export class PublicationIdentityMap {
  private static instance: PublicationIdentityMap;
  private entities = new Map<string, Publication>();
  private inFlight = new Map<string, number>();
  private mutatedAt = new Map<string, number>();
  private subject = new ObservableSubject();

  public static getInstance(): PublicationIdentityMap {
    if (!this.instance) this.instance = new PublicationIdentityMap();
    return this.instance;
  }

  public get(id?: string | null): Publication | undefined {
    if (!id) return undefined;
    return this.entities.get(id.toLowerCase());
  }

  public subscribe(id: string, listener: Listener): () => void {
    return this.subject.subscribe(id, listener);
  }

  public subscribeGlobal(listener: Listener): () => void {
    return this.subject.subscribeGlobal(listener);
  }

  public seed(items: Array<Publication | null | undefined>): void {
    const collected = collectPublications(items);
    for (const [id, pub] of collected.entries()) {
      const key = id.toLowerCase();
      if (!this.entities.has(key)) {
        this.entities.set(key, {
          ...pub,
          upvotes_count: Math.max(0, pub.upvotes_count || 0),
          shares_count: Math.max(0, pub.shares_count || 0),
          quotes_count: Math.max(0, pub.quotes_count || 0),
          comments_count: Math.max(0, pub.comments_count || 0),
        });
        this.subject.notify(key);
      }
    }
  }

  public ingest(items: Array<Publication | null | undefined>, fetchedAt = Date.now()): void {
    const collected = collectPublications(items);
    for (const [id, incoming] of collected.entries()) {
      const key = id.toLowerCase();
      const prev = this.entities.get(key);
      const keepLocal = (this.inFlight.get(key) || 0) > 0 || (this.mutatedAt.get(key) || 0) >= fetchedAt;
      const merged = mergePublicationEntity(prev, incoming, keepLocal);
      if (prev !== merged) {
        this.entities.set(key, merged);
        this.subject.notify(key);
      }
    }
  }

  public patch(id: string, updater: (prev: Publication) => Publication, markMutated = true): Publication | undefined {
    const key = id.toLowerCase();
    const current = this.entities.get(key);
    if (!current) return undefined;
    const updated = updater(current);
    const next: Publication = {
      ...updated,
      upvotes_count: Math.max(0, updated.upvotes_count || 0),
      shares_count: Math.max(0, updated.shares_count || 0),
      quotes_count: Math.max(0, updated.quotes_count || 0),
      comments_count: Math.max(0, updated.comments_count || 0),
    };
    this.entities.set(key, next);
    if (markMutated) this.mutatedAt.set(key, Date.now());
    this.subject.notify(key);
    return next;
  }

  public setInFlight(id: string, delta: 1 | -1): void {
    const key = id.toLowerCase();
    const count = Math.max(0, (this.inFlight.get(key) || 0) + delta);
    if (count === 0) this.inFlight.delete(key);
    else this.inFlight.set(key, count);
  }

  public getAll(): Publication[] {
    return Array.from(this.entities.values());
  }

  public clear(): void {
    this.entities.clear();
    this.inFlight.clear();
    this.mutatedAt.clear();
    this.subject.clear();
  }
}

export const publicationIdentityMap = PublicationIdentityMap.getInstance();

