import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';


// Production builds talk to the Waitress service (port 9005) on whichever host served the page.
const API_PORT = import.meta.env.DEV ? 8000 : 9005;
export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api`;

export const tokens = {
  get access() { return localStorage.getItem('ismo_access'); },
  get refresh() { return localStorage.getItem('ismo_refresh'); },
  set(access: string, refresh?: string) {
    localStorage.setItem('ismo_access', access);
    if (refresh) localStorage.setItem('ismo_refresh', refresh);
  },
  clear() { localStorage.removeItem('ismo_access'); localStorage.removeItem('ismo_refresh'); },
};

export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use((r) => r, async (error: AxiosError) => {
  const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  if (error.response?.status === 401 && cfg && !cfg._retry && !cfg.url?.includes('/auth/') && tokens.refresh) {
    cfg._retry = true;
    try {
      refreshing ??= axios
        .post<{ access: string; refresh?: string }>(`${API_BASE}/auth/refresh/`, { refresh: tokens.refresh })
        .then((r) => { tokens.set(r.data.access, r.data.refresh); return r.data.access; })
        .finally(() => { refreshing = null; });
      cfg.headers.Authorization = `Bearer ${await refreshing}`;
      return api(cfg);
    } catch {
      tokens.clear();
      window.location.assign('/login');
    }
  }
  return Promise.reject(error);
});
