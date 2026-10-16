import { AuthUser, LoginResponse } from '../types';
import { api, tokens } from './axios';

export const authApi = {
  login: (username: string, password: string) => api.post<LoginResponse>('/auth/login/', { username, password }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me/').then((r) => r.data),
  logout: async () => { try { if (tokens.refresh) await api.post('/auth/logout/', { refresh: tokens.refresh }); } catch { /* token already invalid */ } },
};
