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
      try {
        const res = await fetch(`${this.BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.success && data.accessToken) {
          setAccessToken(data.accessToken);
          window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { accessToken: data.accessToken } }));
          return data.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
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
      const hadToken = Boolean(token);
      const newToken = hadToken ? await this.refreshAccessToken() : null;
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        const retryRes = await fetch(`${this.BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers });
        const retryData = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) throw this.createHttpError(retryData.message || 'Error en la petición.', retryRes.status);
        return retryData as T;
      }
      if (hadToken) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw this.createHttpError(data.message || `Error ${res.status}: ${res.statusText}`, res.status);
    return data as T;
  }

  public static get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  public static post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, { ...options, method: 'POST', body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined });
  }
  public static put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined });
  }
  public static patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
  }
  public static delete<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}
