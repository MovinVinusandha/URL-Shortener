import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import axiosInstance from '../api/axiosInstance';
import { ThemeProvider } from '../context/ThemeContext';

vi.mock('../api/axiosInstance');

// Mock cobe
vi.mock('cobe', () => {
  return {
    default: vi.fn(() => ({
      update: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the events page toolbar and empty state properly', async () => {
    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: true,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/search by slug, url, city/i)).toBeInTheDocument();
    expect(screen.getByText(/filter/i)).toBeInTheDocument();
    expect(screen.getByText(/stream/i)).toBeInTheDocument();
    expect(screen.getByText(/globe 3d/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no click events recorded/i)).toBeInTheDocument();
    });
  });

  it('renders a list of events when data is returned', async () => {
    const mockEvents = [
      {
        id: 101,
        urlId: 1,
        shortUrlHash: 'launch-test',
        originalUrl: 'https://example.com/promo',
        timestamp: new Date().toISOString(),
        device: 'Desktop',
        browser: 'Chrome',
        os: 'macOS',
        country: 'United States',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        utmCampaign: 'launch-2026',
        referer: 'twitter.com',
      },
    ];

    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        content: mockEvents,
        totalElements: 1,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/\/launch-test/i)).toBeInTheDocument();
      expect(screen.getByText(/San Francisco, United States/i)).toBeInTheDocument();
      expect(screen.getByText(/launch-2026/i)).toBeInTheDocument();
    });
  });

  it('switches to Globe 3D view and renders pulse ticker', async () => {
    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: true,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const globeTab = screen.getByRole('button', { name: /globe 3d/i });
    fireEvent.click(globeTab);

    await waitFor(() => {
      expect(screen.getByText(/recent pulse/i)).toBeInTheDocument();
      expect(screen.getByTitle(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByTitle(/zoom out/i)).toBeInTheDocument();
      expect(screen.getByTitle(/reset orientation/i)).toBeInTheDocument();
    });
  });

  it('opens filter popover and applies device filter pill', async () => {
    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: true,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Open filter popover
    const filterBtn = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterBtn);

    // Select Device Type
    const deviceCategoryBtn = screen.getByText(/device type/i);
    fireEvent.click(deviceCategoryBtn);

    // Select Mobile
    const mobileBtn = screen.getByRole('button', { name: /^mobile$/i });
    fireEvent.click(mobileBtn);

    // Verify compound filter pill appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove device filter/i })).toBeInTheDocument();
      expect(screen.getByText('is')).toBeInTheDocument();
      expect(screen.getAllByText('Mobile').length).toBeGreaterThan(0);
    });

    // Dismiss filter via the cross icon on the pill (Clear filters button was removed)
    const removeFilterBtn = screen.getByRole('button', { name: /remove device filter/i });
    fireEvent.click(removeFilterBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /remove device filter/i })).not.toBeInTheDocument();
    });
  });

  it('renders visitor country badges on Globe 3D and supports mouse dragging', async () => {
    const mockEvents = [
      {
        id: 201,
        urlId: 1,
        shortUrlHash: 'london-promo',
        originalUrl: 'https://example.com/london',
        timestamp: new Date().toISOString(),
        device: 'Desktop',
        browser: 'Chrome',
        os: 'macOS',
        country: 'United Kingdom',
        city: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
      },
      {
        id: 202,
        urlId: 1,
        shortUrlHash: 'tokyo-launch',
        originalUrl: 'https://example.com/tokyo',
        timestamp: new Date().toISOString(),
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
        country: 'Japan',
        city: 'Tokyo',
        latitude: 35.6762,
        longitude: 139.6503,
      },
    ];

    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: mockEvents,
        totalElements: 2,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Switch to Globe 3D view
    const globeTab = screen.getByRole('button', { name: /globe 3d/i });
    fireEvent.click(globeTab);

    // Verify floating badges rendered for London and Tokyo in default Analytics mode
    await waitFor(() => {
      expect(screen.getByText('LONDON')).toBeInTheDocument();
      expect(screen.getByText('TOKYO')).toBeInTheDocument();
      expect(screen.getAllByText(/visits/i).length).toBeGreaterThan(0);
    });

    // Test View Option: Live Stream
    const liveStreamBtn = screen.getAllByRole('button', { name: /live stream/i })[0];
    fireEvent.click(liveStreamBtn);

    // Switch back to Visits
    const visitsBtn = screen.getAllByRole('button', { name: /visits/i })[0];
    fireEvent.click(visitsBtn);

    // Verify pointer drag rotation handlers on globe container
    const globeContainer = screen.getByText('LONDON').closest('.cursor-grab') as HTMLElement;
    expect(globeContainer).toBeInTheDocument();

    fireEvent.pointerDown(globeContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(globeContainer, { clientX: 150, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(globeContainer, { pointerId: 1 });

    // Clicking a badge filters by that country
    const londonBadge = screen.getByText('LONDON');
    fireEvent.click(londonBadge);

    await waitFor(() => {
      expect(screen.getByText('Country')).toBeInTheDocument();
      expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    });
  });

  it('renders badges for all mapped locations even when more than 3 exist', async () => {
    const multiMockEvents = [
      { id: 1, shortUrlHash: 'a', originalUrl: 'https://a.com', timestamp: new Date().toISOString(), country: 'United States', city: 'New York', latitude: 40.7128, longitude: -74.006 },
      { id: 2, shortUrlHash: 'b', originalUrl: 'https://b.com', timestamp: new Date().toISOString(), country: 'United Kingdom', city: 'London', latitude: 51.5074, longitude: -0.1278 },
      { id: 3, shortUrlHash: 'c', originalUrl: 'https://c.com', timestamp: new Date().toISOString(), country: 'Japan', city: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
      { id: 4, shortUrlHash: 'd', originalUrl: 'https://d.com', timestamp: new Date().toISOString(), country: 'Germany', city: 'Berlin', latitude: 52.52, longitude: 13.405 },
      { id: 5, shortUrlHash: 'e', originalUrl: 'https://e.com', timestamp: new Date().toISOString(), country: 'France', city: 'Paris', latitude: 48.8566, longitude: 2.3522 },
    ];

    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: multiMockEvents,
        totalElements: 5,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const globeTab = screen.getByRole('button', { name: /globe 3d/i });
    fireEvent.click(globeTab);

    // Verify all 5 locations have their badges rendered (not sliced to 3)
    await waitFor(() => {
      expect(screen.getByText('NEW YORK')).toBeInTheDocument();
      expect(screen.getByText('LONDON')).toBeInTheDocument();
      expect(screen.getByText('TOKYO')).toBeInTheDocument();
      expect(screen.getByText('BERLIN')).toBeInTheDocument();
      expect(screen.getByText('PARIS')).toBeInTheDocument();
    });
  });

  it('preserves the 3D globe canvas even when there are 0 visits', async () => {
    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: true,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const globeTab = screen.getByRole('button', { name: /globe 3d/i });
    fireEvent.click(globeTab);

    // The 3D globe container and zoom controls must remain mounted and spinning
    await waitFor(() => {
      expect(screen.getAllByText('Visits').length).toBeGreaterThan(0);
      expect(screen.getByText(/listening for incoming visitor clicks/i)).toBeInTheDocument();
      expect(screen.getByTitle(/zoom in/i)).toBeInTheDocument();
    });
  });

  it('debounces search input and triggers API call with search query', async () => {
    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: true,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/search by slug, url, city/i);
    fireEvent.change(searchInput, { target: { value: 'campaign-test' } });

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith(
        '/analytics/events',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'campaign-test',
          }),
        })
      );
    });
  });

  it('renders Dub.co table columns, supports toggling column visibility, and shows functional pagination text', async () => {
    const mockEvents = [
      {
        id: 301,
        urlId: 1,
        shortUrlHash: 'dub-promo',
        originalUrl: 'https://example.com/dub',
        timestamp: '2026-07-31T15:50:00Z',
        device: 'Desktop',
        browser: 'Chrome',
        os: 'macOS',
        country: 'United States',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        referer: 'twitter.com',
        utmCampaign: 'summer-sale',
      },
      {
        id: 302,
        urlId: 2,
        shortUrlHash: 'dub-launch',
        originalUrl: 'https://example.com/launch',
        timestamp: '2026-07-31T15:55:00Z',
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
        country: 'United Kingdom',
        city: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
        referer: 'Direct',
      },
    ];

    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        content: mockEvents,
        totalElements: 2,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Verify pagination text format: "Viewing 1-2 of 2 events"
    await waitFor(() => {
      expect(screen.getByText(/viewing 1-2 of 2 events/i)).toBeInTheDocument();
    });

    // Verify Dub.co table columns header (Event column removed)
    expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^event$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /link/i })).toBeInTheDocument();

    // Verify Display dropdown button (Links tab style)
    const displayBtn = screen.getByRole('button', { name: /display/i });
    fireEvent.click(displayBtn);

    // Verify Display Popover has Ordering and Display Properties
    expect(screen.getByText(/ordering/i)).toBeInTheDocument();
    expect(screen.getByText(/display properties/i)).toBeInTheDocument();

    // OS is false by default
    expect(screen.queryByRole('columnheader', { name: /^os$/i })).not.toBeInTheDocument();

    // Toggle OS column on via pill badge
    const osToggle = screen.getByRole('button', { name: /^os$/i });
    fireEvent.click(osToggle);
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /^os$/i })).toBeInTheDocument();
    });

    // Toggle Device column (true by default) off
    const deviceToggle = screen.getByRole('button', { name: /^device$/i });
    fireEvent.click(deviceToggle);
    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: /^device$/i })).not.toBeInTheDocument();
    });
  });

  it('opens redesigned minimalist Event Details modal popup and shows audit details and raw JSON', async () => {
    const mockEvent = {
      id: 401,
      urlId: 1,
      shortUrlHash: 'dub-drawer-test',
      originalUrl: 'https://example.com/target-destination',
      timestamp: '2026-08-01T12:00:00Z',
      ipAddress: '192.168.1.1',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
      country: 'Germany',
      city: 'Berlin',
      latitude: 52.5200,
      longitude: 13.4050,
      referer: 'google.com',
      utmSource: 'newsletter',
      utmMedium: 'email',
      utmCampaign: 'germany-launch',
    };

    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        content: [mockEvent],
        totalElements: 1,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Wait for event to render in table
    await waitFor(() => {
      expect(screen.getByText(/\/dub-drawer-test/i)).toBeInTheDocument();
    });

    // Click the event row to open details modal
    const eventRow = screen.getByText(/\/dub-drawer-test/i);
    fireEvent.click(eventRow);

    // Verify modal opened with redesigned sections
    await waitFor(() => {
      expect(screen.getByText(/event details/i)).toBeInTheDocument();
      expect(screen.getByText('#401')).toBeInTheDocument();
      expect(screen.getAllByText('https://example.com/target-destination').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/berlin, germany/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('germany-launch').length).toBeGreaterThan(0);
    });

    // Toggle Raw JSON viewer
    const jsonToggle = screen.getByRole('button', { name: /raw event json/i });
    fireEvent.click(jsonToggle);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy json/i })).toBeInTheDocument();
    });
  });

  it('supports interactive pill popovers and column header sorting states', async () => {
    const mockEvents = [
      {
        id: 501,
        urlId: 1,
        shortUrlHash: 'alpha-link',
        originalUrl: 'https://example.com/alpha',
        timestamp: '2026-09-01T10:00:00Z',
        device: 'Desktop',
        browser: 'Chrome',
        os: 'macOS',
        country: 'United States',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        utmCampaign: 'promo-summer',
      },
      {
        id: 502,
        urlId: 2,
        shortUrlHash: 'beta-link',
        originalUrl: 'https://example.com/beta',
        timestamp: '2026-09-02T10:00:00Z',
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
        country: 'Canada',
        city: 'Toronto',
        latitude: 43.6532,
        longitude: -79.3832,
        utmCampaign: 'promo-winter',
      },
    ];

    (axiosInstance.get as any).mockResolvedValue({
      data: {
        content: mockEvents,
        totalElements: 2,
        totalPages: 1,
        size: 30,
        number: 0,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <EventsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Wait for events to load in table so availableCampaigns is populated
    await waitFor(() => {
      expect(screen.getByText(/\/alpha-link/i)).toBeInTheDocument();
    });

    // Open filter dropdown and apply campaign filter
    const filterBtn = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterBtn);

    const campaignCategoryBtn = screen.getByRole('button', { name: /campaign/i });
    fireEvent.click(campaignCategoryBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /promo-summer/i })).toBeInTheDocument();
    });

    const summerCampaignBtn = screen.getByRole('button', { name: /promo-summer/i });
    fireEvent.click(summerCampaignBtn);

    // Verify campaign pill is rendered
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove campaign filter/i })).toBeInTheDocument();
      expect(screen.getAllByText('promo-summer').length).toBeGreaterThanOrEqual(1);
    });

    // Clicking the pill value button opens the interactive pill popover
    const pillValueBtn = screen.getAllByText('promo-summer')[0];
    fireEvent.click(pillValueBtn);

    // In the popover, select promo-winter
    await waitFor(() => {
      const winterOption = screen.getByRole('button', { name: /promo-winter/i });
      expect(winterOption).toBeInTheDocument();
      fireEvent.click(winterOption);
    });

    // Verify campaign switched to promo-winter
    await waitFor(() => {
      expect(screen.getAllByText('promo-winter').length).toBeGreaterThanOrEqual(1);
    });

    // Test column header sorting click
    const countryHeaders = screen.getAllByText(/^Country$/i);
    fireEvent.click(countryHeaders[0]);
  });
});


