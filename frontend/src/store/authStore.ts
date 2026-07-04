import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTH_STORAGE_KEY } from '../utils/constants';

export interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  login: (user: User, token: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      failedAttempts: 0,
      login: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true, failedAttempts: 0 }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
      setAccessToken: (token) => set({ accessToken: token }),
      incrementFailedAttempts: () =>
        set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
      resetFailedAttempts: () => set({ failedAttempts: 0 }),
    }),
    { name: AUTH_STORAGE_KEY }
  )
);
