import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import axiosInstance from '../api/axiosInstance';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState<boolean>(true);

  /** Fetch the current user profile from the backend */
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<User>('/auth/me');
      setUser(data);
    } catch {
      // Token is invalid / expired — clean up
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  /** On mount: if there's a stored token, validate it; otherwise attempt silent refresh via HttpOnly cookie */
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      fetchMe().finally(() => setLoading(false));
    } else {
      // Attempt silent session restoration (e.g. cross-subdomain or reopened tab with HttpOnly refreshToken)
      const refreshPromise = axiosInstance.post?.<{ token: string }>('/auth/refresh');
      if (refreshPromise && typeof refreshPromise.then === 'function') {
        refreshPromise
          .then(async (res) => {
            if (res?.data?.token) {
              localStorage.setItem('token', res.data.token);
              setToken(res.data.token);
              await fetchMe();
            }
          })
          .catch(() => {
            // No active session or refresh token expired
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        setToken(e.newValue);
        if (e.newValue) {
          fetchMe();
        } else {
          setUser(null);
        }
      }
    };

    const handleTokenChange = () => {
      const currentToken = localStorage.getItem('token');
      setToken(currentToken);
      if (currentToken) {
        fetchMe();
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-token-changed', handleTokenChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-token-changed', handleTokenChange);
    };
  }, [fetchMe]);

  /** Called after a successful POST /auth/login */
  const login = useCallback(
    async (newToken: string) => {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      await fetchMe();
    },
    [fetchMe]
  );

  /** Update current user in local state */
  const updateUser = useCallback((updated: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updated } : prev);
  }, []);

  /** Called when the user clicks Logout */
  const logout = useCallback(() => {
    try {
      const logoutPromise = axiosInstance.post?.('/auth/logout');
      if (logoutPromise && typeof logoutPromise.catch === 'function') {
        logoutPromise.catch(() => {});
      }
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-token-changed'));
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Typed hook — throws if used outside AuthProvider */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
