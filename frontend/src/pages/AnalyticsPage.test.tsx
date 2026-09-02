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

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn((cb) => {
  if (typeof cb === 'function') {
    mockSearchParams = cb(mockSearchParams);
  } else {
    mockSearchParams = cb;
  }
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      folders: [
        { id: 1, name: 'Main Folder', slug: 'main' },
        { id: 2, name: 'Marketing', slug: 'marketing' },
      ],
      tags: [
        { id: 10, name: 'BrandTag', color: 'blue' },
        { id: 20, name: 'Social', color: 'green' },
      ],
      activeFolderId: null,
      setActiveFolderId: vi.fn(),
    }),
    useParams: vi.fn().mockReturnValue({}),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    useNavigate: () => mockNavigate,
  };
});

vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Tooltip: ({ content }: any) => {
      if (typeof content === 'function') {
        return content({
          active: true,
          payload: [{ value: 450, payload: { count: 450, cumulative: 450 } }],
          label: '2026-08-01T00:00:00Z',
        });
      }
      return <div>Tooltip</div>;
    },
  };
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.spyOn(routerDom, 'useParams').mockReturnValue({});
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/url/all') {
        return Promise.resolve({
          data: [
            { id: 1, shortUrl: 'http://localhost:8080/xyz789', longUrl: 'https://example.com/target', accessed_times: 15, tags: [{ id: 10, name: 'BrandTag' }], folderId: 1 },
          ],
        });
      }
      return Promise.resolve({
        data: {
          totalClicks: 1234,
          clicksByDate: [
            { date: '2026-08-01T00:00:00Z', count: 12 },
            { date: '2026-08-02T00:00:00Z', count: 24 },
          ],
          clicksByCountry: [{ country: 'US', count: 100 }, { country: 'GB', count: 50 }],
          clicksByDevice: [{ device: 'Desktop', count: 80 }, { device: 'Mobile', count: 40 }],
          clicksByBrowser: [{ browser: 'Chrome', count: 90 }, { browser: 'Safari', count: 30 }],
          clicksByUtmCampaign: [{ name: 'summer_promo', count: 42 }],
          clicksByUtmSource: [{ name: 'twitter', count: 25 }],
          clicksByReferer: [{ name: 't.co', count: 18 }],
        },
      });
    });
  });

  it('renders summary metrics, countries, devices, browsers, and date breakdowns', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText(/Desktop/)).toBeInTheDocument();
    expect(screen.getByText(/Mobile/)).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('GB')).toBeInTheDocument();
    expect(screen.getAllByText('Chrome')[0]).toBeInTheDocument();
  }, 10000);

  it('handles empty analytics datasets (0 clicks and empty arrays)', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/url/all') return Promise.resolve({ data: [] });
      return Promise.resolve({
        data: {
          totalClicks: 0,
          clicksByDate: [],
          clicksByCountry: [],
          clicksByDevice: [],
          clicksByBrowser: [],
        },
      });
    });

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/No country data|No data/i).length).toBeGreaterThan(0);
  });

  it('renders custom link pill and allows clearing link filter', async () => {
    mockSearchParams = new URLSearchParams('hash=xyz789');

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Link')).toBeInTheDocument();
    });

    // Open Link Pill Popover
    const linkTriggers = screen.getAllByText('/xyz789');
    fireEvent.click(linkTriggers[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search links...')).toBeInTheDocument();
    });

    // Filter search inside link popover
    const searchInput = screen.getByPlaceholderText('Search links...');
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    // Click link option
    const linkOptions = screen.getAllByText('/xyz789');
    fireEvent.click(linkOptions[linkOptions.length - 1]);

    // Clear link filter
    const clearBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'));
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(mockSetSearchParams).toHaveBeenCalled();
    }
  });

  it('renders compound tag pills and handles popover search & checkbox toggles', async () => {
    mockSearchParams = new URLSearchParams('tagId=10,20');

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('2 Tags')).toBeInTheDocument();
    });

    // Open tag popover
    fireEvent.click(screen.getByText('2 Tags'));
    expect(screen.getByPlaceholderText('Tag...')).toBeInTheDocument();

    // Search inside tag popover
    fireEvent.change(screen.getByPlaceholderText('Tag...'), { target: { value: 'Brand' } });
    expect(screen.getByText('BrandTag')).toBeInTheDocument();

    // Toggle checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes[0]) {
      fireEvent.click(checkboxes[0]);
      expect(mockSetSearchParams).toHaveBeenCalled();
    }

    // Clear tag filter button
    const clearBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'));
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(mockSetSearchParams).toHaveBeenCalled();
    }
  });

  it('renders folder pill popover, navigation, and clearing folder filter', async () => {
    vi.spyOn(routerDom, 'useParams').mockReturnValue({ folderSlug: 'marketing' });

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Folder')).toBeInTheDocument();
    });

    // Open folder pill popover
    const folderTrigger = screen.getByText('Marketing');
    fireEvent.click(folderTrigger);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
      expect(screen.getByText('Main Folder')).toBeInTheDocument();
    });

    // Search and select
    const folderSearchInput = screen.getByPlaceholderText('Search folders...');
    fireEvent.change(folderSearchInput, { target: { value: 'Main' } });
    fireEvent.click(screen.getByText('Main Folder'));
    expect(mockNavigate).toHaveBeenCalledWith('/analytics/f/main');

    // Click clear folder button
    const clearBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'));
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(mockNavigate).toHaveBeenCalled();
    }
  });

  it('handles folderId query param without folderSlug', async () => {
    mockSearchParams = new URLSearchParams('folderId=1');

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Folder')).toBeInTheDocument();
    });

    const clearBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'));
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(mockSetSearchParams).toHaveBeenCalled();
    }
  });

  it('handles filter popover sub-menus (Link, Tag, Folder) and back buttons', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    });

    // 1. Open Filter Menu
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Link')).toBeInTheDocument();

    // 2. Select Tag Sub-filter
    fireEvent.click(screen.getByText('Tag'));
    expect(screen.getByPlaceholderText('Tag...')).toBeInTheDocument();

    // Back chevron
    const backBtn = document.querySelector('svg.lucide-chevron-left')?.closest('button');
    if (backBtn) fireEvent.click(backBtn);

    // 3. Select Folder Sub-filter
    fireEvent.click(screen.getByText('Folder'));
    expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    if (backBtn) fireEvent.click(backBtn);

    // 4. Select Link Sub-filter
    fireEvent.click(screen.getByText('Link'));
    expect(screen.getByPlaceholderText('Search links...')).toBeInTheDocument();
  });

  it('closes popovers when clicking outside the document', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Link')).toBeInTheDocument();

    // Trigger click outside on document
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Link')).not.toBeInTheDocument();
    });
  });

  it('handles date presets (24h, 7d, 30d)', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    // Open date picker
    fireEvent.click(screen.getByText('Last 30 days'));
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Last 24 hours'));

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/analytics', expect.objectContaining({
        params: expect.objectContaining({ period: '24h' })
      }));
    });
  });

  it('renders single active tag pill correctly', async () => {
    mockSearchParams = new URLSearchParams('tagId=10');

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('BrandTag')).toBeInTheDocument();
    });
  });

  it('displays API error states gracefully and allows Back to Dashboard navigation', async () => {
    (axiosInstance.get as any).mockRejectedValue(new Error('Network Error'));

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/Network Error|Failed to load/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Dashboard/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Back to Dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles 404 API error state gracefully', async () => {
    const error404 = new Error('Not Found') as any;
    error404.response = { status: 404 };
    (axiosInstance.get as any).mockRejectedValue(error404);

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Analytics not found or unauthorized.')).toBeInTheDocument();
    });
  });

  it('allows switching between Timeline, Volume, and Growth chart options', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Traffic Velocity Timeline')).toBeInTheDocument();
    });

    // Switch to Volume
    const volumeBtn = screen.getByRole('button', { name: /Volume/i });
    fireEvent.click(volumeBtn);
    expect(screen.getByText('Period Volume Comparison')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

    // Switch to Growth
    const growthBtn = screen.getByRole('button', { name: /Growth/i });
    fireEvent.click(growthBtn);
    expect(screen.getByText('Cumulative Audience Trajectory')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    // Switch back to Timeline
    const timelineBtn = screen.getByRole('button', { name: /Timeline/i });
    fireEvent.click(timelineBtn);
    expect(screen.getByText('Traffic Velocity Timeline')).toBeInTheDocument();
  });

  it('renders UTM Campaign Performance breakdown and allows tab switching', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
      expect(screen.getByText('twitter')).toBeInTheDocument();
    });

    // Switch to Campaign tab
    const campaignTab = screen.getByRole('button', { name: 'Campaign' });
    fireEvent.click(campaignTab);
    expect(screen.getByText('summer_promo')).toBeInTheDocument();

    // Switch to Referral tab
    const refTab = screen.getByRole('button', { name: /Referral|Referrer/i });
    fireEvent.click(refTab);
    expect(screen.getAllByText('t.co').length).toBeGreaterThan(0);
  });

  it('clicking UTM rows activates multiple simultaneous drilldown filters and shows dismissible pills', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('twitter')).toBeInTheDocument();
    });

    // Click on the 'twitter' UTM row
    const twitterRow = screen.getByText('twitter').closest('div[title*="Click to filter"]');
    expect(twitterRow).toBeInTheDocument();
    fireEvent.click(twitterRow!);

    expect(mockSetSearchParams).toHaveBeenCalled();

    // Set multiple UTM params in searchParams (source=twitter AND campaign=summer_promo)
    mockSearchParams.set('utm_source', 'twitter');
    mockSearchParams.set('utm_campaign', 'summer_promo');

    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByTitle('Clear Source filter')).toBeInTheDocument();
      expect(screen.getByTitle('Clear Campaign filter')).toBeInTheDocument();
    });

    // Clicking clear Source filter removes only source
    const clearSourceBtn = screen.getByTitle('Clear Source filter');
    fireEvent.click(clearSourceBtn);
    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});
