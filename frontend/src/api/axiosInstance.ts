import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required to send/receive the refreshToken HttpOnly cookie
});

// ── Request interceptor: attach JWT if available ──────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle token expiry ────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on auth pages (prevents redirect loops)
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      if (!isAuthPage) {
        localStorage.removeItem('token');
        // Hard redirect clears React state entirely and forces re-auth
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts the exact error message string from Spring Boot API responses.
 * Handles:
 *  - { message: "..." }
 *  - { error: "..." }
 *  - { longUrl: "..." }, { email: "..." } (validation/custom error maps)
 *  - raw string responses
 */
export const extractBackendError = (
  error: unknown,
  fallback = 'An unexpected error occurred. Please try again.'
): string => {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;

    // 1. Raw string response
    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    // 2. Object response (JSON)
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      if (typeof obj.message === 'string' && obj.message.trim()) {
        return obj.message;
      }
      if (typeof obj.error === 'string' && obj.error.trim()) {
        return obj.error;
      }
      if (typeof obj.longUrl === 'string' && obj.longUrl.trim()) {
        return obj.longUrl;
      }
      if (typeof obj.email === 'string' && obj.email.trim()) {
        return obj.email;
      }
      if (typeof obj.password === 'string' && obj.password.trim()) {
        return obj.password;
      }

      // Fallback for any map with string values (e.g., Spring validation errors map)
      const stringValues = Object.values(obj).filter(
        (val): val is string => typeof val === 'string' && val.trim().length > 0
      );
      if (stringValues.length > 0) {
        return stringValues.join('. ');
      }
    }
  }
  return fallback;
};

export default axiosInstance;
