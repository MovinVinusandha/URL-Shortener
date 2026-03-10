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

  /** On mount: if there's a stored token, validate it by fetching /auth/me */
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

  /** Called when the user clicks Logout */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
