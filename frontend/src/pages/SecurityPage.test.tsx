import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecurityPage from './SecurityPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { put: vi.fn() },
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
    
    const submitBtn = screen.getByText('Save Changes');
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
    
    const submitBtn = screen.getByText('Save Changes');
    expect(submitBtn).not.toBeDisabled();
    
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith('/api/users/me/password', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });
      expect(screen.getByText('Password updated successfully!')).toBeInTheDocument();
    });
  });
});
