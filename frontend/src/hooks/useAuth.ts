import { useCallback } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { REFRESH_TOKEN_KEY } from '../utils/constants';

interface AuthResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function useAuth() {
  const { login: storeLogin, logout: storeLogout, incrementFailedAttempts, resetFailedAttempts } =
    useAuthStore();

  const register = useCallback(
    async (name: string, email: string, frames: string[]): Promise<AuthResult> => {
      try {
        const res = await api.post('/auth/register', { name, email, frames });
        return { success: true, data: res.data };
      } catch (err: any) {
        return {
          success: false,
          error: err.response?.data?.detail || err.response?.data?.message || 'Registration failed',
        };
      }
    },
    []
  );

  const login = useCallback(
    async (frames: string[]): Promise<AuthResult> => {
      try {
        const res = await api.post('/auth/login', { frames, liveness_passed: true });
        const { access_token, refresh_token } = res.data.data;

        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

        // Fetch user profile
        const userRes = await api.get('/user/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        storeLogin(userRes.data.data, access_token);
        resetFailedAttempts();
        return { success: true, data: userRes.data.data };
      } catch (err: any) {
        incrementFailedAttempts();
        return {
          success: false,
          error:
            err.response?.data?.detail || err.response?.data?.message || 'Authentication failed',
        };
      }
    },
    [storeLogin, incrementFailedAttempts, resetFailedAttempts]
  );

  const requestOTP = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const res = await api.post('/auth/otp/request', { email });
      return { success: true, data: res.data };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Failed to send OTP',
      };
    }
  }, []);

  const verifyOTP = useCallback(
    async (email: string, otp: string): Promise<AuthResult> => {
      try {
        const res = await api.post('/auth/otp/verify', { email, otp });
        const { access_token, refresh_token } = res.data.data;

        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

        const userRes = await api.get('/user/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        storeLogin(userRes.data.data, access_token);
        resetFailedAttempts();
        return { success: true, data: userRes.data.data };
      } catch (err: any) {
        return {
          success: false,
          error: err.response?.data?.detail || 'OTP verification failed',
        };
      }
    },
    [storeLogin, resetFailedAttempts]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore — we're logging out regardless
    } finally {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      storeLogout();
    }
  }, [storeLogout]);

  return { register, login, requestOTP, verifyOTP, logout };
}
