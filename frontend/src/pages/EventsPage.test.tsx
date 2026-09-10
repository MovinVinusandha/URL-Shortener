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
      expect(screen.getByText('Device')).toBeInTheDocument();
      expect(screen.getByText('is')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    // Clear filters
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText('Mobile')).not.toBeInTheDocument();
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

    // Test View Option: Bars (count shows as percentage)
    const barsBtn = screen.getAllByRole('button', { name: /bars/i })[0];
    fireEvent.click(barsBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/50%/i).length).toBeGreaterThan(0);
    });

    // Test View Option: Live Badge
    const liveBtn = screen.getAllByRole('button', { name: /live badge/i })[0];
    fireEvent.click(liveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
    });

    // Switch back to Analytics
    const analyticsBtn = screen.getAllByRole('button', { name: /analytics/i })[0];
    fireEvent.click(analyticsBtn);

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
      expect(screen.getByText('Visits')).toBeInTheDocument();
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
});

