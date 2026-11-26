function getStore(type: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    const host: any = typeof window !== 'undefined' ? window : globalThis;
    return host?.[type] ?? null;
  } catch {
    return null;
  }
}

function readItem(type: 'localStorage' | 'sessionStorage', key: string): string | null {
  try {
    return getStore(type)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeItem(type: 'localStorage' | 'sessionStorage', key: string, value: string): boolean {
  try {
    const store = getStore(type);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    /* ignore when storage is restricted or full on mobile WebViews */
    return false;
  }
}

function removeItem(type: 'localStorage' | 'sessionStorage', key: string): void {
  try {
    getStore(type)?.removeItem(key);
  } catch {
    /* ignore when storage is restricted on mobile WebViews */
  }
}

export const safeLocalGet = (key: string): string | null => readItem('localStorage', key);
export const safeLocalSet = (key: string, val: string): boolean => writeItem('localStorage', key, val);
export const safeLocalRemove = (key: string): void => removeItem('localStorage', key);
export const safeSessionGet = (key: string): string | null => readItem('sessionStorage', key);
export const safeSessionSet = (key: string, val: string): boolean => writeItem('sessionStorage', key, val);
export const safeSessionRemove = (key: string): void => removeItem('sessionStorage', key);
