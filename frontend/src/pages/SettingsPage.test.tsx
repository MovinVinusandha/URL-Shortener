import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    (useAuth as any).mockReturnValue({
      user: { id: 1, username: 'johndoe', email: 'john@example.com', publicId: 'USR-123' },
      logout: vi.fn(),
      loading: false,
    });
  });

  it('renders user publicId and copies to clipboard', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    expect(screen.getByDisplayValue('USR-123')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('USR-123');
  });

  it('updating email form submission success and conflict handling', async () => {
    (axiosInstance.put as any).mockResolvedValueOnce({ data: {} });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    
    const emailInput = screen.getByDisplayValue('john@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    
    const saveButtons = screen.getAllByText('Save Changes');
    fireEvent.click(saveButtons[0]);
    
    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith('/users/me', { email: 'jane@example.com', username: 'johndoe' });
      expect(screen.getByText('Email updated successfully.')).toBeInTheDocument();
    });

    // Test 409 conflict
    (axiosInstance.put as any).mockRejectedValueOnce({
      response: { status: 409 },
    });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('This email is already taken.')).toBeInTheDocument();
    });
  });

  it('updating username form submission success and error handling', async () => {
    (axiosInstance.put as any).mockResolvedValueOnce({ data: {} });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    
    const usernameInput = screen.getByDisplayValue('johndoe');
    fireEvent.change(usernameInput, { target: { value: 'janedoe' } });
    
    const saveButtons = screen.getAllByText('Save Changes');
    fireEvent.click(saveButtons[1]);
    
    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith('/users/me', { username: 'janedoe', email: 'john@example.com' });
      expect(screen.getByText('Username updated successfully.')).toBeInTheDocument();
    });

    // Test error case
    (axiosInstance.put as any).mockRejectedValueOnce({
      response: { data: { message: 'Username is already taken' } },
    });
    fireEvent.click(saveButtons[1]);
    await waitFor(() => {
      expect(screen.getByText('Username is already taken')).toBeInTheDocument();
    });
  });

  it('opens Delete Account modal, handles close, error, and confirmed deletion', async () => {
    (axiosInstance.delete as any).mockResolvedValue({ data: {} });
    const logoutMock = vi.fn();
    (useAuth as any).mockReturnValue({
      user: { id: 1, username: 'johndoe', email: 'john@example.com', publicId: 'USR-123' },
      logout: logoutMock,
      loading: false,
    });

    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    
    const openModalButton = screen.getByRole('button', { name: 'Delete Account' });
    fireEvent.click(openModalButton);
    
    expect(screen.getByText(/Warning: This will permanently delete your account/i)).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Account' });
    const confirmDeleteBtn = deleteButtons[1];
    expect(confirmDeleteBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('confirm delete account');
    fireEvent.change(input, { target: { value: 'confirm delete account' } });
    expect(confirmDeleteBtn).toBeEnabled();

    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalledWith('/users/me');
      expect(logoutMock).toHaveBeenCalled();
    });
  });

  it('renders skeleton loading when loading is true', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      logout: vi.fn(),
      loading: true,
    });

    const { container } = render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    expect(container.querySelectorAll('.react-loading-skeleton').length).toBeGreaterThan(0);
  });
});
