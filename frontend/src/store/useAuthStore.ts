import { create } from 'zustand';
import api, { setAccessToken, getAccessToken } from '../services/api';
import type { User } from '../types';
import { connectSocket, disconnectSocket } from '../services/socket';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (id: string, token: string, password: string) => Promise<boolean>;
  clearError: () => void;
  clearSuccess: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  successMessage: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      connectSocket(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMsg = 'Erro ao fazer login';
      
      if (err.response) {
        errorMsg = err.response.data?.error || `Erro no servidor (${err.response.status})`;
        if (err.response.status === 429) {
          errorMsg = 'Muitas tentativas. Aguarde 1 minuto.';
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Servidor indisponível. Verifique se o backend está rodando e a VITE_API_URL.';
      } else {
        errorMsg = err.message || 'Erro ao fazer login';
      }
      
      set({ error: errorMsg, isLoading: false });
    }
  },

  register: async (name, email, password) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const { data } = await api.post('/auth/register', { name, email, password });
      setAccessToken(data.accessToken);
      connectSocket(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMsg = 'Erro ao criar conta';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMsg = err.response.data?.error || `Erro no servidor (${err.response.status})`;
        if (err.response.status === 429) {
          errorMsg = 'Muitas tentativas. Aguarde 1 minuto.';
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Servidor indisponível. Verifique se o backend está rodando e a VITE_API_URL.';
      } else {
        errorMsg = err.message || 'Erro ao criar conta';
      }
      
      set({ error: errorMsg, isLoading: false });
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

  forgotPassword: async (email) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const { data } = await api.post('/auth/forgot-password', { email });
      set({
        isLoading: false,
        successMessage: data.message || 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.',
      });
      return true;
    } catch (err: any) {
      let errorMsg = 'Erro ao solicitar recuperação de senha';
      if (err.response) {
        errorMsg = err.response.data?.error || errorMsg;
        if (err.response.status === 429) {
          errorMsg = 'Muitas tentativas. Aguarde 1 minuto.';
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Servidor indisponível. Verifique se o backend está rodando.';
      }
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  resetPassword: async (id, token, password) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const { data } = await api.post(`/auth/reset-password/${id}/${token}`, { password });
      set({
        isLoading: false,
        successMessage: data.message || 'Senha redefinida com sucesso!',
      });
      return true;
    } catch (err: any) {
      let errorMsg = 'Erro ao redefinir senha';
      if (err.response) {
        errorMsg = err.response.data?.error || errorMsg;
        if (err.response.status === 429) {
          errorMsg = 'Muitas tentativas. Aguarde 1 minuto.';
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Servidor indisponível. Verifique se o backend está rodando.';
      }
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearSuccess: () => set({ successMessage: null }),
}));

// Re-export so consumers that need the raw token (e.g., socket reconnect) can read it
export { getAccessToken };

