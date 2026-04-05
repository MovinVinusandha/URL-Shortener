import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('HomePage', () => {
  it('rendering of the main headline', () => {
    (useAuth as any).mockReturnValue({ token: null });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getAllByText(/Shorten, track &/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/manage your links/i)[0]).toBeInTheDocument();
  });

  it('URL input field accepts text', () => {
    (useAuth as any).mockReturnValue({ token: null });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    
    const input = screen.getByPlaceholderText('Paste your long URL here…');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    
    expect((input as HTMLInputElement).value).toBe('https://example.com');
  });

  it('Try it now button triggers smooth scrolling', () => {
    (useAuth as any).mockReturnValue({ token: null });
    window.scrollTo = vi.fn();
    
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    
    const tryItNowButton = screen.getByText('Try it now');
    fireEvent.click(tryItNowButton);
    
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
  });
});
