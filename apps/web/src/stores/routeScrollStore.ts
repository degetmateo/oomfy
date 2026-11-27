export interface ScrollSnapshot {
  y: number;
  anchorId?: string;
  anchorTop?: number;
}

const scrollSnapshots = new Map<string, ScrollSnapshot>();

export const RouteScrollStore = {
  get(key: string): number {
    return scrollSnapshots.get(key)?.y ?? 0;
  },

  set(key: string, y: number): void {
    scrollSnapshots.set(key, { y: Math.max(0, y) });
  },

  getSnapshot(key: string): ScrollSnapshot | undefined {
    return scrollSnapshots.get(key);
  },

  setSnapshot(key: string, snapshot: ScrollSnapshot): void {
    scrollSnapshots.set(key, {
      ...snapshot,
      y: Math.max(0, snapshot.y),
    });
  },

  delete(key: string): void {
    scrollSnapshots.delete(key);
  },

  clear(): void {
    scrollSnapshots.clear();
  },
};
