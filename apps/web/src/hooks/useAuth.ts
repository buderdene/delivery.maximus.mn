'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, logout as apiLogout, getToken, getUser, LoginCredentials, AuthResponse } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);

  useEffect(() => {
    // Check auth status on mount
    const token = getToken();
    const savedUser = getUser();
    setIsAuthenticated(!!token);
    setUser(savedUser);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiLogin(credentials);
      setIsAuthenticated(true);
      if (response.user) {
        setUser(response.user);
      }
      router.push('/dashboard');
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setIsAuthenticated(false);
      setUser(null);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    isLoading,
    error,
    isAuthenticated,
    user,
    login,
    logout,
    setError,
  };
}
