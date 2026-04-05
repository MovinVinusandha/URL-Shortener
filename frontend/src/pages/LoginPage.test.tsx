import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn(), put: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Email and Password inputs accept user typing', () => {
    (useAuth as any).mockReturnValue({ login: vi.fn() });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    
    const emailInput = screen.getByPlaceholderText('panic@thedis.co');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect((emailInput as HTMLInputElement).value).toBe('test@test.com');
    expect((passwordInput as HTMLInputElement).value).toBe('password123');
  });

  it('submitting the form triggers the API call', async () => {
    const loginMock = vi.fn();
    (useAuth as any).mockReturnValue({ login: loginMock });
    (axiosInstance.post as any).mockResolvedValue({ data: { token: 'mock-token' } });
    
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('panic@thedis.co'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByText('Log in with email'));
    
    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password123',
      });
      expect(loginMock).toHaveBeenCalledWith('mock-token');
    });
  });

  it('API errors display red error text on the screen', async () => {
    (useAuth as any).mockReturnValue({ login: vi.fn() });
    (axiosInstance.post as any).mockRejectedValue({
      response: { data: { message: 'Incorrect password' } }
    });
    
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('panic@thedis.co'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    
    fireEvent.click(screen.getByText('Log in with email'));
    
    await waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    });
  });
});
