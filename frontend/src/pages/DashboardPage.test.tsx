import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
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

// Mock useOutletContext
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      triggerRefresh: null,
      tags: [],
      folders: [],
      activeFolderId: null,
    }),
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('URL table renders links and click counts correctly', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 1 } });
    (axiosInstance.get as any).mockResolvedValue({
      data: [
        {
          longUrl: 'https://example.com/one',
          shortUrl: 'http://trim.sh/abc123',
          accessed_times: 42,
          createdAt: new Date().toISOString(),
        },
        {
          longUrl: 'https://example.com/two',
          shortUrl: 'http://trim.sh/def456',
          accessed_times: 7,
          createdAt: new Date().toISOString(),
        }
      ]
    });
    
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('trim.sh/abc123')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/one')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      
      expect(screen.getByText('trim.sh/def456')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/two')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  it('typing into Search Bar filters the displayed links', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 1 } });
    (axiosInstance.get as any).mockResolvedValue({
      data: [
        {
          longUrl: 'https://example.com/one',
          shortUrl: 'http://trim.sh/abc123',
          accessed_times: 42,
          createdAt: new Date().toISOString(),
        },
        {
          longUrl: 'https://example.com/two',
          shortUrl: 'http://trim.sh/def456',
          accessed_times: 7,
          createdAt: new Date().toISOString(),
        }
      ]
    });
    
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('trim.sh/abc123')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search by short link or URL');
    fireEvent.change(searchInput, { target: { value: 'def' } });
    
    expect(screen.queryByText('trim.sh/abc123')).not.toBeInTheDocument();
    expect(screen.getByText('trim.sh/def456')).toBeInTheDocument();
  });
});
