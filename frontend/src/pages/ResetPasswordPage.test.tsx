import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows invalid link message when token is missing', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
    expect(screen.getByText('Request a new link')).toBeInTheDocument();
  });

  it('validates password length and mismatch', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=sample-token-123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Set a new password')).toBeInTheDocument();

    const newPassInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Repeat new password');

    // Short password
    fireEvent.change(newPassInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.submit(document.querySelector('form')!);

    expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();

    // Mismatch
    fireEvent.change(newPassInput, { target: { value: 'validpassword1' } });
    fireEvent.change(confirmInput, { target: { value: 'validpassword2' } });
    fireEvent.submit(document.querySelector('form')!);

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('submits successfully and displays success message', async () => {
    (axiosInstance.post as any).mockResolvedValue({ data: {} });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=sample-token-123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    const newPassInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Repeat new password');

    fireEvent.change(newPassInput, { target: { value: 'newsecretpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newsecretpassword123' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'sample-token-123',
        newPassword: 'newsecretpassword123',
      });
      expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument();
    });
  });

  it('handles backend error properly', async () => {
    (axiosInstance.post as any).mockRejectedValue({
      response: { data: { message: 'Token has expired' } },
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=expired-token']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    const newPassInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Repeat new password');

    fireEvent.change(newPassInput, { target: { value: 'newsecretpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newsecretpassword123' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Token has expired')).toBeInTheDocument();
    });
  });
});
