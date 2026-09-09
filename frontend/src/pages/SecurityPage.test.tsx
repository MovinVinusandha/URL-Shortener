import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecurityPage from './SecurityPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { put: vi.fn(), post: vi.fn() },
  extractBackendError: vi.fn((err: any, fallback: string) => err?.response?.data?.message || fallback),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, email: 'user@example.com', hasPassword: true },
    updateUser: vi.fn(),
  })),
}));

describe('SecurityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('client-side validation for matching passwords', () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>);
    
    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);
    
    fireEvent.change(currentInput, { target: { value: 'oldpass' } });
    fireEvent.change(newInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmInput, { target: { value: 'different' } });
    
    const submitBtn = screen.getByText('Update Password');
    expect(submitBtn).toBeDisabled();
  });

  it('submits API request when passwords match and are long enough', async () => {
    (axiosInstance.put as any).mockResolvedValue({ data: {} });
    render(<MemoryRouter><SecurityPage /></MemoryRouter>);
    
    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);
    
    fireEvent.change(currentInput, { target: { value: 'oldpass' } });
    fireEvent.change(newInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpass123' } });
    
    const submitBtn = screen.getByText('Update Password');
    expect(submitBtn).not.toBeDisabled();
    
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });
      expect(screen.getByText('Password updated successfully!')).toBeInTheDocument();
    });
  });

  it('handles backend error when password update fails', async () => {
    (axiosInstance.put as any).mockRejectedValue({
      response: { data: { message: 'Current password is incorrect' } },
    });
    render(<MemoryRouter><SecurityPage /></MemoryRouter>);

    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentInput, { target: { value: 'wrongpass' } });
    fireEvent.change(newInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByText('Update Password'));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  it('handles form submission when passwords do not match', async () => {
    render(<MemoryRouter><SecurityPage /></MemoryRouter>);

    const form = document.querySelector('form')!;
    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentInput, { target: { value: 'currentpass' } });
    fireEvent.change(newInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'mismatch123' } });

    fireEvent.submit(form);

    expect(screen.getByText('New passwords do not match.')).toBeInTheDocument();
  });
});
