const scrollPositions = new Map<string, number>();

export const RouteScrollStore = {
  get(key: string): number {
    return scrollPositions.get(key) ?? 0;
  },

  set(key: string, y: number): void {
    scrollPositions.set(key, Math.max(0, Math.round(y)));
  },

  clear(): void {
    scrollPositions.clear();
  },
};

