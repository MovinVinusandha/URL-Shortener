import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CampaignGroupCard } from './CampaignGroupCard';
import { extractUtmParams, groupUrlsByCampaign, formatChannelName } from '../utils/utmExtractor';
import type { UrlEntry } from '../types';

import axiosInstance from '../api/axiosInstance';

vi.mock('../api/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('utmExtractor', () => {
  it('extracts all UTM parameters correctly', () => {
    const url = 'https://example.com/promo?utm_campaign=summer_2026&utm_source=twitter&utm_medium=social&utm_term=sale&utm_content=v1';
    const params = extractUtmParams(url);
    expect(params.campaign).toBe('summer_2026');
    expect(params.source).toBe('twitter');
    expect(params.medium).toBe('social');
    expect(params.term).toBe('sale');
    expect(params.content).toBe('v1');
  });

  it('formats channel names with presets and fallbacks', () => {
    expect(formatChannelName('twitter')).toBe('Twitter / X');
    expect(formatChannelName('linkedin')).toBe('LinkedIn');
    expect(formatChannelName('reddit')).toBe('Reddit');
    expect(formatChannelName('discord_channel')).toBe('Discord Channel');
  });

  it('groups URLs into campaigns and calculates totals and top channels', () => {
    const urls: UrlEntry[] = [
      {
        shortUrl: 'http://trim.sh/tw1',
        longUrl: 'https://example.com?utm_campaign=launch_2026&utm_source=twitter',
        accessed_times: 100,
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        shortUrl: 'http://trim.sh/li1',
        longUrl: 'https://example.com?utm_campaign=launch_2026&utm_source=linkedin',
        accessed_times: 250,
        createdAt: '2026-08-02T00:00:00Z',
      },
      {
        shortUrl: 'http://trim.sh/plain',
        longUrl: 'https://example.com/no-campaign',
        accessed_times: 5,
        createdAt: '2026-08-03T00:00:00Z',
      },
    ];

    const { campaigns, ungrouped } = groupUrlsByCampaign(urls);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].campaignName).toBe('launch_2026');
    expect(campaigns[0].totalClicks).toBe(350);
    expect(campaigns[0].topChannel?.name).toBe('LinkedIn');
    expect(campaigns[0].topChannel?.clicks).toBe(250);
    expect(ungrouped).toHaveLength(1);
    expect(ungrouped[0].shortUrl).toBe('http://trim.sh/plain');
  });
});

describe('CampaignGroupCard', () => {
  const sampleCampaign = {
    campaignName: 'spring_sale_2026',
    totalClicks: 300,
    links: [
      {
        shortUrl: 'http://trim.sh/fb1',
        longUrl: 'https://example.com?utm_campaign=spring_sale_2026&utm_source=facebook&utm_medium=social',
        accessed_times: 180,
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        shortUrl: 'http://trim.sh/em1',
        longUrl: 'https://example.com?utm_campaign=spring_sale_2026&utm_source=email&utm_medium=newsletter',
        accessed_times: 120,
        createdAt: '2026-08-02T00:00:00Z',
      },
    ],
    topChannel: { name: 'Facebook', clicks: 180 },
    latestCreatedAt: '2026-08-02T00:00:00Z',
    earliestCreatedAt: '2026-08-01T00:00:00Z',
  };

  const defaultProps = {
    campaign: sampleCampaign,
    displayDomain: 'app.localhost',
    protocol: 'http:',
    folders: [
      { id: 10, name: 'Marketing 2026', slug: 'marketing' },
      { id: 20, name: 'Product Launches', slug: 'product' },
    ],
    tags: [
      { id: 101, name: 'Promotion' },
      { id: 102, name: 'Social' },
    ],
    onRefresh: vi.fn(),
    onOpenQr: vi.fn(),
    onEditUrl: vi.fn(),
    onDeleteUrl: vi.fn(),
    initialExpanded: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (axiosInstance.post as any).mockResolvedValue({ data: { success: true, message: 'Done' } });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders campaign summary, channel badges, and click counts', () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('spring_sale_2026')).toBeInTheDocument();
    expect(screen.getByText('2 Channels')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText(/Top: Facebook \(180 clicks\)/i)).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Email Newsletter')).toBeInTheDocument();
  });

  it('copies all links on "Copy All Links" click in dropdown menu', () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    const menuBtn = screen.getByTitle('Campaign Options');
    fireEvent.click(menuBtn);

    const copyAllBtn = screen.getByText('Copy All Links');
    fireEvent.click(copyAllBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Campaign: spring_sale_2026')
    );
  });

  it('triggers CSV download on "Export CSV" click in dropdown menu', () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    const menuBtn = screen.getByTitle('Campaign Options');
    fireEvent.click(menuBtn);

    const csvBtn = screen.getByText('Export CSV');
    fireEvent.click(csvBtn);
  });

  it('navigates to analytics page on Analytics button click', () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    const analyticsBtn = screen.getByTitle('View Campaign Analytics');
    fireEvent.click(analyticsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/analytics?campaign=spring_sale_2026');
  });

  it('opens Move to Folder modal and performs bulk move', async () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    // Open menu
    fireEvent.click(screen.getByTitle('Campaign Options'));
    fireEvent.click(screen.getByText('Move to Folder'));

    // Select a folder
    expect(screen.getByText('Marketing 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Marketing 2026'));

    // Click confirm button
    const submitBtn = screen.getByRole('button', { name: /Move 2 Links/i });
    fireEvent.click(submitBtn);

    expect(axiosInstance.post).toHaveBeenCalledWith('/url/bulk-action', {
      hashes: ['fb1', 'em1'],
      action: 'MOVE_FOLDER',
      folderId: 10,
    });
  });

  it('opens Assign Tags modal and performs bulk tag assignment', async () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    // Open menu
    fireEvent.click(screen.getByTitle('Campaign Options'));
    fireEvent.click(screen.getByText('Assign Tags'));

    // Select tags
    expect(screen.getByText('Promotion')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Promotion'));

    // Click confirm button
    const submitBtn = screen.getByRole('button', { name: /Apply Tags/i });
    fireEvent.click(submitBtn);

    expect(axiosInstance.post).toHaveBeenCalledWith('/url/bulk-action', {
      hashes: ['fb1', 'em1'],
      action: 'ADD_TAGS',
      tagIds: [101],
    });
  });

  it('opens Set Expiration modal and performs bulk expiration update', async () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    // Open menu
    fireEvent.click(screen.getByTitle('Campaign Options'));
    fireEvent.click(screen.getByText('Set Expiration'));

    // Select 7 days
    fireEvent.click(screen.getByText('In 7 Days'));

    // Click confirm button
    const submitBtn = screen.getByRole('button', { name: /Save Expiration/i });
    fireEvent.click(submitBtn);

    expect(axiosInstance.post).toHaveBeenCalledWith('/url/bulk-action', expect.objectContaining({
      hashes: ['fb1', 'em1'],
      action: 'SET_EXPIRATION',
    }));
  });

  it('opens Delete Campaign modal and performs bulk deletion', async () => {
    render(
      <MemoryRouter>
        <CampaignGroupCard {...defaultProps} />
      </MemoryRouter>
    );

    // Open menu
    fireEvent.click(screen.getByTitle('Campaign Options'));
    fireEvent.click(screen.getByText('Delete Campaign'));

    // Click delete confirm button
    const deleteBtn = screen.getByRole('button', { name: /Delete 2 Links/i });
    fireEvent.click(deleteBtn);

    expect(axiosInstance.post).toHaveBeenCalledWith('/url/bulk-action', {
      hashes: ['fb1', 'em1'],
      action: 'DELETE',
    });
  });
});
