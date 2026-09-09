import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OAuthCallbackPage from './OAuthCallbackPage';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls login and redirects to dashboard when token is present', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({ login: loginMock });

    render(
      <MemoryRouter initialEntries={['/oauth/callback?token=mock-jwt-token']}>
        <OAuthCallbackPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Completing Social Login...')).toBeInTheDocument();

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('mock-jwt-token');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('displays error when oauth error parameter is present', () => {
    (useAuth as any).mockReturnValue({ login: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/oauth/callback?error=Google%20account%20not%20authorized']}>
        <OAuthCallbackPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    expect(screen.getByText('Google account not authorized')).toBeInTheDocument();
  });

  it('displays error when token is missing', () => {
    (useAuth as any).mockReturnValue({ login: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/oauth/callback']}>
        <OAuthCallbackPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    expect(screen.getByText('No authentication token received.')).toBeInTheDocument();
  });
});
