import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn(), put: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

const TestComponent = () => {
  const { user, token, loading, login, logout } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="token">{token || 'no-token'}</div>
      <button onClick={() => login('new-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('unauthenticated when no token is in localStorage', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('no-token');
    });
  });

  it('login(token) updates state and saves to localStorage', async () => {
    (axiosInstance.get as any).mockResolvedValue({ data: { id: 1, name: 'User' } });
    render(<AuthProvider><TestComponent /></AuthProvider>);
    
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('no-token');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(localStorage.getItem('token')).toBe('new-token');
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('new-token');
    });
  });

  it('logout() clears state and removes token from localStorage', async () => {
    localStorage.setItem('token', 'existing-token');
    (axiosInstance.get as any).mockResolvedValue({ data: { id: 1, name: 'User' } });
    
    render(<AuthProvider><TestComponent /></AuthProvider>);
    
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('existing-token');
    });

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('token').textContent).toBe('no-token');
  });
});
