'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_EXPIRED_EVENT } from '@/lib/api/client';
import { applyAwsTheme } from '@/lib/awsTheme';
import { authApi, demoApi } from '@/lib/api/resources';
import type { User } from '@/lib/api/types';
import { themeStore, type Theme } from '@/lib/theme';

export type { User };

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  /** True until the first session check finishes. */
  loading: boolean;
  theme: Theme;
  toasts: Toast[];
  toggleTheme: () => void;
  /** Bumped after the demo data is reset, so mounted pages know to reload what they show. */
  dataVersion: number;
  /** Resolves to an error message, or null on success. */
  login: (username: string, password: string) => Promise<string | null>;
  /** One-click sign-in to the demo account (loads sample data on first use). Same return as `login`. */
  loginAsDemo: () => Promise<string | null>;
  /** Replace all data with the demo samples. Only the demo account may call this. */
  resetDemo: () => Promise<void>;
  logout: () => Promise<void>;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TOAST_LIFETIME_MS = 6000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServerSnapshot);

  // Restore the session (cookie-based) once, and drop it if any API call reports it expired.
  useEffect(() => {
    applyAwsTheme();
    let active = true;
    authApi
      .me()
      .then((current) => active && setUser(current))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const removeToast = (id: string) => setToasts((current) => current.filter((toast) => toast.id !== id));

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => removeToast(id), TOAST_LIFETIME_MS);
  };

  const login = async (username: string, password: string) => {
    try {
      const { user: signedIn } = await authApi.login(username, password);
      setUser(signedIn);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to sign in';
    }
  };

  const loginAsDemo = async () => {
    try {
      const { user: signedIn, seeded } = await authApi.demoLogin();
      setUser(signedIn);
      addToast(
        seeded
          ? 'Welcome to the demo. Sample hosted zones and records have been loaded so you can explore every feature.'
          : 'Signed in to the demo account.',
        'info',
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to start the demo';
    }
  };

  const resetDemo = async () => {
    try {
      const { zones, records } = await demoApi.reset();
      setDataVersion((current) => current + 1);
      addToast(`Demo data reset: ${zones} hosted zones and ${records} records restored.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to reset the demo data', 'error');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToasts([]);
      router.replace('/login');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        theme,
        toasts,
        toggleTheme: () => themeStore.set(theme === 'light' ? 'dark' : 'light'),
        dataVersion,
        login,
        loginAsDemo,
        resetDemo,
        logout,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
