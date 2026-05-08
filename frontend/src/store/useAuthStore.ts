import { create } from 'zustand';
import api, { setAccessToken, getAccessToken } from '../services/api';
import type { User } from '../types';
import { connectSocket, disconnectSocket } from '../services/socket';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      connectSocket(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Erro ao fazer login', isLoading: false });
    }
  },

  register: async (name, email, password) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await api.post('/auth/register', { name, email, password });
      setAccessToken(data.accessToken);
      connectSocket(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Erro ao criar conta', isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    setAccessToken(null);
    disconnectSocket();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  // On startup: try to silently mint a fresh access token using the HttpOnly refresh cookie.
  // No tokens live in localStorage anymore — this call is the only way to recover a session.
  checkAuth: async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      connectSocket(data.accessToken);
      // /auth/refresh returns the user too, but fall back to /me if missing
      const user = data.user ?? (await api.get('/auth/me')).data.user;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Re-export so consumers that need the raw token (e.g., socket reconnect) can read it
export { getAccessToken };
