export type Listener = () => void;

export class ObservableSubject {
  private listenersById = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();

  public subscribe(id: string, listener: Listener): () => void {
    const key = id.toLowerCase();
    if (!this.listenersById.has(key)) {
      this.listenersById.set(key, new Set());
    }
    const set = this.listenersById.get(key)!;
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listenersById.delete(key);
    };
  }

  public subscribeGlobal(listener: Listener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  public notify(id?: string): void {
    if (id) {
      const set = this.listenersById.get(id.toLowerCase());
      if (set) {
        for (const listener of Array.from(set)) {
          listener();
        }
      }
    }
    for (const listener of Array.from(this.globalListeners)) {
      listener();
    }
  }

  public clear(): void {
    this.listenersById.clear();
    this.globalListeners.clear();
  }
}

