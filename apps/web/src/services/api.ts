import { resolveApiBaseUrl } from '../utils/apiBase.js';
import { getAccessToken, setAccessToken } from './sessionTokenMemory.js';

export class ApiClient {
  private static readonly BASE_URL = resolveApiBaseUrl(false);
  private static refreshPromise: Promise<string | null> | null = null;

  private static createHttpError(message: string, status: number): Error {
    return Object.assign(new Error(message), { status });
  }

  public static async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const storedRefresh = typeof localStorage !== 'undefined' ? localStorage.getItem('oomfy_refresh_token') : null;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), storedRefresh ? 15_000 : 4_000) : null;
      try {
        const res = await fetch(`${this.BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          ...(controller ? { signal: controller.signal } : {}),
          ...(storedRefresh ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: storedRefresh }) } : {}),
        });
        if (!res.ok) {
          if ((res.status === 401 || res.status === 403) && typeof localStorage !== 'undefined') localStorage.removeItem('oomfy_refresh_token');
          return null;
        }
        const data = await res.json();
        if (data?.success && data.accessToken) {
          setAccessToken(data.accessToken);
          if (data.refreshToken && typeof localStorage !== 'undefined') localStorage.setItem('oomfy_refresh_token', data.refreshToken);
          window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { accessToken: data.accessToken, refreshToken: data.refreshToken } }));
          return data.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        if (timer) clearTimeout(timer);
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAccessToken();
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${this.BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers });

    if (res.status === 401 && !endpoint.includes('/auth/')) {
      const hasSession = Boolean(token || (typeof localStorage !== 'undefined' && localStorage.getItem('oomfy_refresh_token')));
      const newToken = hasSession ? await this.refreshAccessToken() : null;
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        const retryRes = await fetch(`${this.BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers });
        const retryData = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) throw this.createHttpError(retryData.message || 'Error en la petición.', retryRes.status);
        return retryData as T;
      }
      if (hasSession) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw this.createHttpError(data.message || `Error ${res.status}: ${res.statusText}`, res.status);
    return data as T;
  }

  private static sendWithBody<T>(method: string, endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const serialized = body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(endpoint, { ...options, method, body: serialized });
  }

  public static get = <T>(ep: string, opts?: RequestInit) => this.request<T>(ep, { ...opts, method: 'GET' });
  public static post = <T>(ep: string, body?: any, opts?: RequestInit) => this.sendWithBody<T>('POST', ep, body, opts);
  public static put = <T>(ep: string, body?: any, opts?: RequestInit) => this.sendWithBody<T>('PUT', ep, body, opts);
  public static patch = <T>(ep: string, body?: any, opts?: RequestInit) => this.sendWithBody<T>('PATCH', ep, body, opts);
  public static delete = <T>(ep: string, body?: any, opts?: RequestInit) => this.sendWithBody<T>('DELETE', ep, body, opts);
}
