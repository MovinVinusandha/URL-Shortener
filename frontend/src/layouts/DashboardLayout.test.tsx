import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'USER' },
      logout: vi.fn(),
    });
  });

  it('renders sidebar and global usage stats', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/api/analytics/usage') {
        return Promise.resolve({ data: { totalClicks: 1337, totalLinks: 42 } });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      // Sidebar icons/buttons (Log out is hidden in user menu, but Profile / Help exists)
      expect(screen.getAllByText('Links')[0]).toBeInTheDocument();
      // Usage stats
      expect(screen.getByText('1337')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('dynamic top header title changes based on location', async () => {
    (axiosInstance.get as any).mockResolvedValue({ data: [] });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/analytics']}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="analytics" element={<div>Analytics Content</div>} />
            <Route path="folders" element={<div>Folders Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
    });

    rerender(
      <MemoryRouter initialEntries={['/folders']}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="analytics" element={<div>Analytics Content</div>} />
            <Route path="folders" element={<div>Folders Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Folders').length).toBeGreaterThan(0);
    });
  });
});
