import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiChannelModal } from './MultiChannelModal';
import axiosInstance from '../api/axiosInstance';

vi.mock('../api/axiosInstance', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: [] }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MultiChannelModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    folders: [{ id: 1, name: 'Marketing' }],
    tags: [{ id: 1, name: 'promo', color: 'blue' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders correctly when open in multi-channel mode', () => {
    render(<MultiChannelModal {...defaultProps} />);
    expect(screen.getByText('Multi-Channel')).toBeInTheDocument();
    expect(screen.getByText('Single Link')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://yourbrand.com/launch')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('summer_sale_2026')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Twitter / X')).toBeInTheDocument();
  });

  it('switches between Single Link and Multi-Channel modes seamlessly', async () => {
    render(<MultiChannelModal {...defaultProps} />);
    
    // Initially Multi-Channel
    expect(screen.getByText('Target Channels (4)')).toBeInTheDocument();

    // Click Single Link tab
    const singleLinkTab = screen.getByRole('button', { name: /Single Link/i });
    fireEvent.click(singleLinkTab);

    // Now in Single Link mode
    await waitFor(() => {
      expect(screen.getByText('Short Link')).toBeInTheDocument();
    });

    // Click back to Multi-Channel
    const multiChannelTab = screen.getByRole('button', { name: /Multi-Channel/i });
    fireEvent.click(multiChannelTab);

    await waitFor(() => {
      expect(screen.getByText('Target Channels (4)')).toBeInTheDocument();
    });
  });

  it('toggles channel selection on click', () => {
    render(<MultiChannelModal {...defaultProps} />);
    const youtubeChip = screen.getByText('YouTube').closest('div')!;
    
    // Initially unselected -> click to select
    fireEvent.click(youtubeChip);
    expect(screen.getByText(/Create 5 Campaign Links/i)).toBeInTheDocument();

    // Click again to unselect
    fireEvent.click(youtubeChip);
    expect(screen.getByText(/Create 4 Campaign Links/i)).toBeInTheDocument();
  });

  it('allows adding a custom channel', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: { id: 99, name: 'Reddit', utmSource: 'reddit', utmMedium: 'community' }
    });

    render(<MultiChannelModal {...defaultProps} />);
    
    const addCustomBtn = screen.getByText('Add Custom Channel');
    fireEvent.click(addCustomBtn);

    const nameInput = screen.getByPlaceholderText('Name (e.g. Reddit)');
    const sourceInput = screen.getByPlaceholderText('utm_source (e.g. reddit)');
    const mediumInput = screen.getByPlaceholderText('utm_medium (e.g. social)');

    fireEvent.change(nameInput, { target: { value: 'Reddit' } });
    fireEvent.change(sourceInput, { target: { value: 'reddit' } });
    fireEvent.change(mediumInput, { target: { value: 'community' } });

    const submitAddBtn = screen.getByRole('button', { name: 'Add Channel' });
    fireEvent.click(submitAddBtn);

    await waitFor(() => {
      expect(screen.getByText('Reddit')).toBeInTheDocument();
    });
  });

  it('submits batch creation successfully and transitions to results step', async () => {
    const mockResponse = {
      data: {
        campaignName: 'spring_2026',
        totalCreated: 2,
        items: [
          {
            channelName: 'Facebook',
            shortUrl: 'fb123',
            fullShortUrl: 'https://trim.link/fb123',
            longUrlWithUtm: 'https://example.com?utm_source=facebook&utm_campaign=spring_2026',
            utmSource: 'facebook',
            utmMedium: 'social',
            urlId: 101,
          },
          {
            channelName: 'Twitter / X',
            shortUrl: 'tw123',
            fullShortUrl: 'https://trim.link/tw123',
            longUrlWithUtm: 'https://example.com?utm_source=twitter&utm_campaign=spring_2026',
            utmSource: 'twitter',
            utmMedium: 'social',
            urlId: 102,
          },
        ],
      },
    };
    (axiosInstance.post as any).mockResolvedValue(mockResponse);

    render(<MultiChannelModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('https://yourbrand.com/launch'), {
      target: { value: 'https://example.com/product' },
    });
    fireEvent.change(screen.getByPlaceholderText('summer_sale_2026'), {
      target: { value: 'spring_2026' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create.*Campaign Links/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/url/batch-campaign',
        expect.objectContaining({
          longUrl: 'https://example.com/product',
          campaignName: 'spring_2026',
        })
      );
    });

    // Verify Results Screen
    await waitFor(() => {
      expect(screen.getByText('https://trim.link/fb123')).toBeInTheDocument();
      expect(screen.getByText('https://trim.link/tw123')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy All Links/i })).toBeInTheDocument();
    });

    // Test Copy Individual
    const copyBtns = screen.getAllByRole('button', { name: /Copy/i });
    fireEvent.click(copyBtns[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://trim.link/fb123');

    // Test Copy All
    const copyAllBtn = screen.getByRole('button', { name: /Copy All Links/i });
    fireEvent.click(copyAllBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Facebook: https://trim.link/fb123\nTwitter / X: https://trim.link/tw123'
    );
  });
});
