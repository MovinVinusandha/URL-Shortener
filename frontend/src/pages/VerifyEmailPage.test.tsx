import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, updateUser: vi.fn() })),
}));

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error when token is missing', () => {
    render(
      <MemoryRouter initialEntries={['/verify-email']}>
        <VerifyEmailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('No verification token was provided.')).toBeInTheDocument();
  });

  it('successfully verifies email with valid token', async () => {
    (axiosInstance.post as any).mockResolvedValue({ data: {} });

    render(
      <MemoryRouter initialEntries={['/verify-email?token=valid-token-123']}>
        <VerifyEmailPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'valid-token-123',
      });
      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      expect(screen.getByText('Proceed to Log in')).toBeInTheDocument();
    });
  });

  it('displays error and resend form when verification fails', async () => {
    (axiosInstance.post as any).mockRejectedValue({
      response: { data: { message: 'The verification link is invalid or has expired.' } },
    });

    render(
      <MemoryRouter initialEntries={['/verify-email?token=expired-token']}>
        <VerifyEmailPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText('The verification link is invalid or has expired.')).toBeInTheDocument();
    });

    // Test resend form
    (axiosInstance.post as any).mockResolvedValueOnce({ data: {} });
    const emailInput = screen.getByPlaceholderText('janedoe@email.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const resendBtn = screen.getByText('Resend Verification Link');
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/resend-verification', {
        email: 'user@example.com',
      });
    });
  });
});
