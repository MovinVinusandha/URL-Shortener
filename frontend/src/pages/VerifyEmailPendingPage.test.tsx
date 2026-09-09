import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPendingPage from './VerifyEmailPendingPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

const mockLogout = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { email: 'test@example.com', emailVerified: false }, logout: mockLogout })),
}));

describe('VerifyEmailPendingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders verify your email info with user email', () => {
    render(
      <MemoryRouter>
        <VerifyEmailPendingPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles resending verification link when button clicked', async () => {
    (axiosInstance.post as any).mockResolvedValueOnce({ data: {} });

    render(
      <MemoryRouter>
        <VerifyEmailPendingPage />
      </MemoryRouter>
    );

    const resendBtn = screen.getByText('Resend Verification Email');
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/resend-verification', {
        email: 'test@example.com',
      });
      expect(screen.getByText('A fresh verification email has been dispatched!')).toBeInTheDocument();
    });
  });

  it('allows sign out from pending page', () => {
    render(
      <MemoryRouter>
        <VerifyEmailPendingPage />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByText('Sign out');
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });
});
