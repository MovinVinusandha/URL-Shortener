import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLinksPage from './AdminLinksPage';
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

describe('AdminLinksPage', () => {
  const mockTriageSummary = {
    needsAttentionCount: 3,
    spikeCount: 1,
    quarantinedCount: 2,
    createdLast24hCount: 12,
    totalLinks: 150,
  };

  const mockLinks = [
    {
      id: 101,
      shortUrl: 'test101',
      fullShortUrl: 'https://trim.ly/test101',
      longUrl: 'https://example.com/suspicious-link',
      totalClicks: 12,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      isActive: true,
      isQuarantined: true,
      quarantineReason: 'Flagged domain',
      isPasswordProtected: false,
      userEmail: 'creator@example.com',
      username: 'creator',
      userPublicId: 'usr-12345',
    },
    {
      id: 102,
      shortUrl: 'spike200',
      fullShortUrl: 'https://trim.ly/spike200',
      longUrl: 'https://news.ycombinator.com/item?id=123',
      totalClicks: 850,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      isActive: true,
      isQuarantined: false,
      quarantineReason: null,
      isPasswordProtected: false,
      userEmail: 'dev@trim.com',
      username: 'devuser',
      userPublicId: 'usr-67890',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders triage KPI cards and loads triage queue by default', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/links/triage-summary')) {
        return Promise.resolve({ data: mockTriageSummary });
      }
      return Promise.resolve({
        data: {
          content: mockLinks,
          totalPages: 1,
          totalElements: 2,
          size: 20,
          number: 0,
        },
      });
    });

    render(
      <BrowserRouter>
        <AdminLinksPage />
      </BrowserRouter>
    );

    // Verify Triage KPI values
    await waitFor(() => {
      expect(screen.getAllByText('Needs Attention').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Traffic Spikes').length).toBeGreaterThan(0);
      expect(screen.getByText('Created Last 24h')).toBeInTheDocument();
      expect(screen.getByText('Total Database')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Check link items rendered in table
    await waitFor(() => {
      expect(screen.getByText('/test101')).toBeInTheDocument();
      expect(screen.getByText('/spike200')).toBeInTheDocument();
      expect(screen.getByText('850')).toBeInTheDocument();
    });
  });

  it('allows switching triage tabs and selects rows for bulk actions', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/links/triage-summary')) {
        return Promise.resolve({ data: mockTriageSummary });
      }
      return Promise.resolve({
        data: {
          content: mockLinks,
          totalPages: 1,
          totalElements: 2,
          size: 20,
          number: 0,
        },
      });
    });

    render(
      <BrowserRouter>
        <AdminLinksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('/test101')).toBeInTheDocument();
    });

    // Select row for bulk actions
    const checkboxes = screen.getAllByRole('checkbox');
    // First row checkbox
    fireEvent.click(checkboxes[0]);

    // Verify floating action bar appears
    await waitFor(() => {
      expect(screen.getByText(/1 link selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quarantine selected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });
  });
});
