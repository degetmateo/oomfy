export class ApiClient {
  private static getBaseUrl(): string {
    if (import.meta.env.VITE_API_URL) {
      return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`;
    }
    if (import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('oomfy.online')) {
      return 'https://api-oomfy.onrender.com/api';
    }
    return '/api';
  }

  private static isRefreshing = false;

  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('oomfy_token');
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const base = this.getBaseUrl();
    const res = await fetch(`${base}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/signin')) {
      if (!endpoint.includes('/auth/refresh') && !this.isRefreshing) {
        this.isRefreshing = true;
        try {
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
              this.isRefreshing = false;
              headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
              const retryRes = await fetch(`${base}${endpoint}`, {
                ...options,
                credentials: 'include',
                headers,
              });
              const retryData = await retryRes.json().catch(() => ({}));
              if (!retryRes.ok) {
                throw new Error(retryData.message || 'Error en la petición.');
              }
              return retryData as T;
            }
          }
        } catch {
          // Refresh failed
        } finally {
          this.isRefreshing = false;
        }
      }

      localStorage.removeItem('oomfy_token');
      localStorage.removeItem('oomfy_refresh_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Error en la petición al servidor.');
    }

    return data as T;
  }

  public static get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  public static post<T>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public static put<T>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public static delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }
}
