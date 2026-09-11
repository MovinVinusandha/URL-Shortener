import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('./api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn().mockResolvedValue({ data: [] }) },
}));

describe('App', () => {
  it('renders application with router and providers without crashing', () => {
    window.history.pushState({}, 'Home', '/');
    render(<App />);
    expect(screen.getByRole('link', { name: /Features/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
  }, 15000);
});
