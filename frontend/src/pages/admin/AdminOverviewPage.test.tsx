import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('renders platform overview stats and graphs accurately', async () => {
    (axiosInstance.get as any).mockResolvedValue({
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
        systemMode: 'READ_ONLY',
        securityPulse: {
          unresolvedIncidents: 2,
          blockedIpsCount: 4,
          blacklistedDomainsCount: 1,
          auditChainValid: true,
        },
        systemHealth: {
          redisStatus: 'HEALTHY',
          redisMemory: '4.2M',
          sweeperStatus: 'RUNNING',
          lastSweeperRun: new Date().toISOString(),
          activeWorkerThreads: 4,
          totalCachedKeys: 65,
        },
        topDomains: [
          { domain: 'github.com', count: 42 },
          { domain: 'google.com', count: 28 },
        ],
        activitySeries: [
          { date: '2026-09-10', clicks: 120, linksCreated: 5 },
          { date: '2026-09-11', clicks: 250, linksCreated: 12 },
        ],
        deviceDistribution: [
          { name: 'Desktop', count: 200, percentage: 60.0 },
          { name: 'Mobile', count: 120, percentage: 40.0 },
        ],
        countryDistribution: [
          { name: 'United States', count: 180, percentage: 55.0 },
        ],
        recentAuditActions: [
          {
            id: 1,
            action: 'USER_SUSPENDED',
            actorEmail: 'admin@trim.com',
            targetType: 'USER',
            targetIdentifier: 'spammer@example.com',
            details: 'Suspended user for abuse',
            createdAt: new Date().toISOString(),
          }
        ]
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
      expect(screen.getByText('Platform Activity & Link Velocity')).toBeInTheDocument();
      expect(screen.getByText('Emergency Lockdown Active: READ_ONLY Mode')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('USER_SUSPENDED')).toBeInTheDocument();
    });

    // Test time range button click
    const range14d = screen.getByText('14 Days');
    fireEvent.click(range14d);

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/admin/overview', {
        params: { days: 14 }
      });
    });
  });
});
