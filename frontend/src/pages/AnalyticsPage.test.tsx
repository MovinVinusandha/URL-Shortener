import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from './AnalyticsPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as routerDom from 'react-router-dom';

vi.mock('../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({}),
    useParams: vi.fn().mockReturnValue({}),
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams()]),
    useNavigate: vi.fn(),
  };
});

// Mock Recharts to avoid testing SVG elements and ResizeObserver issues
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  };
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metric cards with overall analytics data', async () => {
    (axiosInstance.get as any).mockResolvedValue({
      data: {
        totalClicks: 1234,
        clicksByDate: [],
        clicksByCountry: [{ country: 'US', count: 100 }],
        clicksByDevice: [],
        clicksByBrowser: [{ browser: 'Chrome', count: 50 }],
      },
    });

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Overall Analytics')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getAllByText('Chrome')[0]).toBeInTheDocument();
    });
  });

  it('handles /analytics/:hash specific analytics', async () => {
    vi.spyOn(routerDom, 'useParams').mockReturnValue({ hash: 'abc123' });
    (axiosInstance.get as any).mockResolvedValue({
      data: { totalClicks: 42, clicksByDate: [], clicksByCountry: [], clicksByDevice: [], clicksByBrowser: [] },
    });

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('/abc123')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/analytics/abc123', expect.any(Object));
    });
  });

  it('toggles period buttons', async () => {
    vi.spyOn(routerDom, 'useParams').mockReturnValue({});
    (axiosInstance.get as any).mockResolvedValue({
      data: { totalClicks: 100, clicksByDate: [], clicksByCountry: [], clicksByDevice: [], clicksByBrowser: [] },
    });

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    const btn7d = screen.getByText('7d');
    fireEvent.click(btn7d);

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/analytics', { params: { period: '7d' } });
    });
  });
});
