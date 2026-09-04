import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignComparisonView from './CampaignComparisonView';
import axiosInstance from '../api/axiosInstance';
import type { DateRangeValue } from './DateRangePicker';

vi.mock('../api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  };
});

const mockDateRange: DateRangeValue = {
  type: 'preset',
  value: '30d',
  label: 'Last 30 Days',
};

const mockAvailableCampaigns = [
  { campaignName: 'spring_launch_2026', totalClicks: 400 },
  { campaignName: 'summer_promo_2026', totalClicks: 250 },
  { campaignName: 'black_friday_2026', totalClicks: 800 },
];

describe('CampaignComparisonView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (axiosInstance.get as any).mockImplementation((url: string, config: any) => {
      const camp = config?.params?.utmCampaign;
      if (camp === 'spring_launch_2026') {
        return Promise.resolve({
          data: {
            totalClicks: 400,
            clicksByDate: [
              { date: '2026-03-01', count: 150 },
              { date: '2026-03-02', count: 250 },
            ],
            clicksByCountry: [{ country: 'United States', count: 300 }],
            clicksByDevice: [{ device: 'Desktop', count: 350 }],
            clicksByBrowser: [{ browser: 'Chrome', count: 350 }],
            clicksByUtmSource: [
              { name: 'twitter', count: 250 },
              { name: 'linkedin', count: 150 },
            ],
            clicksByUtmMedium: [{ name: 'social', count: 400 }],
          },
        });
      }
      if (camp === 'summer_promo_2026') {
        return Promise.resolve({
          data: {
            totalClicks: 250,
            clicksByDate: [
              { date: '2026-03-01', count: 100 },
              { date: '2026-03-02', count: 150 },
            ],
            clicksByCountry: [{ country: 'Germany', count: 200 }],
            clicksByDevice: [{ device: 'Mobile', count: 200 }],
            clicksByBrowser: [{ browser: 'Safari', count: 200 }],
            clicksByUtmSource: [
              { name: 'facebook', count: 150 },
              { name: 'twitter', count: 100 },
            ],
            clicksByUtmMedium: [{ name: 'cpc', count: 250 }],
          },
        });
      }
      return Promise.resolve({
        data: {
          totalClicks: 0,
          clicksByDate: [],
          clicksByCountry: [],
          clicksByDevice: [],
          clicksByBrowser: [],
          clicksByUtmSource: [],
          clicksByUtmMedium: [],
        },
      });
    });

    global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders empty state when no campaigns are available', () => {
    render(
      <CampaignComparisonView
        availableCampaigns={[]}
        dateRange={mockDateRange}
      />
    );

    expect(screen.getByText('No Marketing Campaigns Available')).toBeInTheDocument();
  });

  it('fetches and renders comparative data for initial campaigns', async () => {
    render(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
      />
    );

    expect(screen.getByText('Comparing:')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('400').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    expect(screen.getByText('Leader')).toBeInTheDocument();

    expect(screen.getByText('Traffic Velocity Comparison')).toBeInTheDocument();
    expect(screen.getByText('Channel Breakdown & Traffic Acquisition')).toBeInTheDocument();
  });

  it('toggles between Timeline, Volume, and Growth graph types', async () => {
    render(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    const volumeBtn = screen.getByText('Volume');
    fireEvent.click(volumeBtn);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

    const growthBtn = screen.getByText('Growth');
    fireEvent.click(growthBtn);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    const timelineBtn = screen.getByText('Timeline');
    fireEvent.click(timelineBtn);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('allows adding and removing campaigns', async () => {
    const handleSelectedChange = vi.fn();

    render(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
        onSelectedCampaignsChange={handleSelectedChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add Campaign')).toBeInTheDocument();
    });

    // Open add menu
    fireEvent.click(screen.getByText('Add Campaign'));
    expect(screen.getByPlaceholderText('Search campaign...')).toBeInTheDocument();

    // Click on third campaign
    const addBlackFridayBtn = screen.getByRole('button', { name: /black_friday_2026/i });
    fireEvent.click(addBlackFridayBtn);

    expect(handleSelectedChange).toHaveBeenCalledWith(
      expect.arrayContaining(['spring_launch_2026', 'summer_promo_2026', 'black_friday_2026'])
    );
  });

  it('handles CSV export', async () => {
    render(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export CSV'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('allows filtering by channel via table row click and controlled prop', async () => {
    const handleChannelChange = vi.fn();
    const { rerender } = render(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
        selectedChannel={null}
        onSelectedChannelChange={handleChannelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('400').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Channel Breakdown & Traffic Acquisition')).toBeInTheDocument();
    const twitterElements = screen.getAllByText('Twitter / X');
    expect(twitterElements.length).toBeGreaterThan(0);

    // Click on Twitter / X row in the table to filter
    const twitterRowElement = twitterElements[twitterElements.length - 1];
    fireEvent.click(twitterRowElement);
    expect(handleChannelChange).toHaveBeenCalledWith('twitter');

    // Rerender with selectedChannel set to 'twitter'
    rerender(
      <CampaignComparisonView
        availableCampaigns={mockAvailableCampaigns}
        dateRange={mockDateRange}
        initialCampaigns={['spring_launch_2026', 'summer_promo_2026']}
        selectedChannel="twitter"
        onSelectedChannelChange={handleChannelChange}
      />
    );

    // Active channel pill should appear
    await waitFor(() => {
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByTitle('Clear channel filter')).toBeInTheDocument();
    });

    // Verify axios was called with utmSource parameter
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/analytics',
      expect.objectContaining({
        params: expect.objectContaining({ utmSource: 'twitter' }),
      })
    );

    // Clear filter
    fireEvent.click(screen.getByTitle('Clear channel filter'));
    expect(handleChannelChange).toHaveBeenCalledWith(null);
  });
});
