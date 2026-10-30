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
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/signin')) {
      localStorage.removeItem('oomfy_token');
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
