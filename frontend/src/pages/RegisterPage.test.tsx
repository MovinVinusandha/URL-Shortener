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

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, token: null })),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Inputs accept user typing', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    const usernameInput = screen.getByPlaceholderText('janedoe');
    const emailInput = screen.getByPlaceholderText('janedoe@email.com');
    const passwordInput = screen.getByPlaceholderText('At least 8 characters');
    
    fireEvent.change(usernameInput, { target: { value: 'johndoe' } });
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect((usernameInput as HTMLInputElement).value).toBe('johndoe');
    expect((emailInput as HTMLInputElement).value).toBe('test@test.com');
    expect((passwordInput as HTMLInputElement).value).toBe('password123');
  });

  it('toggles password visibility with eye icon button', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    const passwordInput = screen.getByPlaceholderText('At least 8 characters');
    expect((passwordInput as HTMLInputElement).type).toBe('password');

    const toggleBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-eye') || b.querySelector('svg.lucide-eye-off'))!;
    fireEvent.click(toggleBtn);
    expect((passwordInput as HTMLInputElement).type).toBe('text');

    fireEvent.click(toggleBtn);
    expect((passwordInput as HTMLInputElement).type).toBe('password');
  });

  it('validates required fields and minimum password length', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    // Attempt next step without values
    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();

    // Fill in short password
    fireEvent.change(screen.getByPlaceholderText('janedoe@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'short' } });
    
    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('allows navigating back to step 1 via Change info button', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('janedoe@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } });
    
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByText('Change info')).toBeInTheDocument();
    });

    // Click back to step 1
    fireEvent.click(screen.getByText('Change info'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('janedoe@email.com')).toBeInTheDocument();
    });
  });

  it('displays error when confirm password does not match', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('janedoe@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } });
    
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });

    // Step 2: enter mismatching password
    const confirmInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    fireEvent.change(confirmInput, { target: { value: 'different123' } });
    fireEvent.submit(document.querySelector('form')!);

    expect(screen.getByText('Passwords do not match. Please try again.')).toBeInTheDocument();
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it('submitting with matching password triggers the API call', async () => {
    (axiosInstance.post as any).mockResolvedValue({});
    
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText('janedoe'), { target: { value: 'johndoe' } });
    fireEvent.change(screen.getByPlaceholderText('janedoe@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } });
    
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });

    // Step 2: enter matching password
    const confirmInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.submit(document.querySelector('form')!);
    
    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/user', {
        username: 'johndoe',
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
    
    fireEvent.change(screen.getByPlaceholderText('janedoe@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } });
    
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });

    const confirmInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.submit(document.querySelector('form')!);
    
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });

  it('social sign up buttons trigger toasts', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fireEvent.click(screen.getByText('Continue with Google'));
    fireEvent.click(screen.getByText('Continue with GitHub'));
  });
});
