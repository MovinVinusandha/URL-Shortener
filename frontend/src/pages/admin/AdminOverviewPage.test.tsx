import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminOverviewPage from './AdminOverviewPage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import React from 'react';

vi.mock('../../api/axiosInstance');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ refreshTrigger: 0, triggerRefresh: vi.fn() }),
  };
});

describe('AdminOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders platform overview stats accurately', async () => {
    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        totalLinks: 120,
        activeLinks: 110,
        expiredLinks: 8,
        quarantinedLinks: 2,
        totalClicks: 4500,
        clicksLast24Hours: 350,
        totalUsers: 45,
        activeUsers: 44,
        suspendedUsers: 1,
        systemHealth: {
          redisStatus: 'HEALTHY',
          redisMemory: '4.2M',
          sweeperStatus: 'RUNNING',
          lastSweeperRun: new Date().toISOString(),
          activeWorkerThreads: 4,
        },
        topDomains: [
          { domain: 'github.com', count: 42 },
          { domain: 'google.com', count: 28 },
        ],
      },
    });

    render(
      <BrowserRouter>
        <AdminOverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('4,500')).toBeInTheDocument();
      expect(screen.getByText('+350')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure Health')).toBeInTheDocument();
    });
  });
});
