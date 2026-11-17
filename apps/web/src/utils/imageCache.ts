const MAX_CACHE_ENTRIES = 500;
const loadedUrls = new Set<string>();

export const ImageMemoryCache = {
  has(url?: string | null): boolean {
    return Boolean(url && loadedUrls.has(url));
  },
  mark(url?: string | null): void {
    if (!url) return;
    if (loadedUrls.size >= MAX_CACHE_ENTRIES) {
      const first = loadedUrls.values().next().value;
      if (first) loadedUrls.delete(first);
    }
    loadedUrls.add(url);
  },
  preload(url?: string | null): void {
    if (!url || loadedUrls.has(url) || typeof Image === 'undefined') return;
    try {
      const img = new Image();
      img.src = url;
      img.onload = () => this.mark(url);
      img.onerror = () => {};
    } catch {}
  },
  clear(): void {
    loadedUrls.clear();
  },
};
