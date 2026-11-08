export class ApiClient {
  public static getBaseUrl(): string {
    if (import.meta.env.VITE_API_URL) {
      return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}`;
    }
    if (import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('oomfy.online')) {
      return 'https://api-oomfy.onrender.com';
    }
    return '';
  }

  private static refreshPromise: Promise<string | null> | null = null;

  public static async refreshSession(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const base = this.getBaseUrl();
        const refreshToken = localStorage.getItem('oomfy_refresh_token');
        const refreshRes = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken) {
            localStorage.setItem('oomfy_token', refreshData.accessToken);
            if (refreshData.refreshToken) {
              localStorage.setItem('oomfy_refresh_token', refreshData.refreshToken);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: refreshData }));
            }
            return refreshData.accessToken as string;
          }
        }
      } catch {
        // Network error during refresh
      }

      localStorage.removeItem('oomfy_token');
      localStorage.removeItem('oomfy_refresh_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      return null;
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('oomfy_token');
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const base = this.getBaseUrl();
    const res = await fetch(`${base}${endpoint}`, { ...options, credentials: 'include', headers });
    const isAuthRoute = ['/auth/signin', '/auth/signup', '/auth/refresh', '/auth/logout'].some((p) => endpoint.includes(p));

    if (res.status === 401 && !isAuthRoute) {
      const hasSessionToken = Boolean(localStorage.getItem('oomfy_token') || localStorage.getItem('oomfy_refresh_token'));
      if (hasSessionToken) {
        const newAccessToken = await this.refreshSession();
        if (newAccessToken) {
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          const retryRes = await fetch(`${base}${endpoint}`, { ...options, credentials: 'include', headers });
          const retryData = await retryRes.json().catch(() => ({}));
          if (!retryRes.ok) throw new Error(retryData.message || 'Error en la petición.');
          return retryData as T;
        }
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Error en la petición al servidor.');
    return data as T;
  }

  public static get<T>(url: string): Promise<T> { return this.request<T>(url, { method: 'GET' }); }
  public static post<T>(url: string, body?: any): Promise<T> { return this.request<T>(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }); }
  public static put<T>(url: string, body?: any): Promise<T> { return this.request<T>(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }); }
  public static patch<T>(url: string, body?: any): Promise<T> { return this.request<T>(url, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }); }
  public static delete<T>(url: string): Promise<T> { return this.request<T>(url, { method: 'DELETE' }); }
}
