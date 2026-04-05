import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn(), put: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Inputs accept user typing', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    const nameInput = screen.getByPlaceholderText('Jane Doe');
    const emailInput = screen.getByPlaceholderText('panic@thedis.co');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect((nameInput as HTMLInputElement).value).toBe('John Doe');
    expect((emailInput as HTMLInputElement).value).toBe('test@test.com');
    expect((passwordInput as HTMLInputElement).value).toBe('password123');
  });

  it('submitting the form triggers the API call', async () => {
    (axiosInstance.post as any).mockResolvedValue({});
    
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('panic@thedis.co'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByText('Sign Up'));
    
    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/user', {
        name: 'John',
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });

  it('API errors display red error text on the screen', async () => {
    (axiosInstance.post as any).mockRejectedValue({
      response: { data: { message: 'Email already in use' } }
    });
    
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('panic@thedis.co'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    
    fireEvent.click(screen.getByText('Sign Up'));
    
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });
});
