import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as routerDom from 'react-router-dom';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn(), put: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

let mockContextValue: any = {
  triggerRefresh: null,
  tags: [
    { id: 1, name: 'youtube', color: '#ff0000', linkCount: 1 },
    { id: 2, name: 'work', color: '#00ff00', linkCount: 2 },
  ],
  folders: [{ id: 5, name: 'Marketing', linkCount: 1 }],
  activeFolderId: null,
};

let mockDashboardSearchParams = new URLSearchParams();
const mockSetDashboardSearchParams = vi.fn((cb) => {
  if (typeof cb === 'function') {
    mockDashboardSearchParams = cb(mockDashboardSearchParams);
  } else {
    mockDashboardSearchParams = cb;
  }
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => mockContextValue,
    useSearchParams: () => [mockDashboardSearchParams, mockSetDashboardSearchParams],
  };
});

const mockLinks = [
  {
    longUrl: 'https://example.com/one',
    shortUrl: 'http://trim.sh/abc123',
    accessed_times: 42,
    createdAt: '2026-08-01T00:00:00Z',
    tags: [
      { id: 1, name: 'youtube', color: '#ff0000' },
      { id: 2, name: 'work', color: '#00ff00' },
    ],
    hasPassword: true,
    expiresAt: '2099-01-01T00:00:00Z',
    isActive: true,
    folderId: 5,
  },
  {
    longUrl: 'https://example.com/two',
    shortUrl: 'http://trim.sh/def456',
    accessed_times: 7,
    createdAt: '2026-08-02T00:00:00Z',
    tags: [],
    expiresAt: '2020-01-01T00:00:00Z',
    isActive: false,
  },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardSearchParams = new URLSearchParams();
    (useAuth as any).mockReturnValue({ user: { id: 1, email: 'test@example.com' } });
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url.includes('/qr')) {
        return Promise.resolve({ data: new Blob(['fake-qr'], { type: 'image/png' }) });
      }
      if (url === '/url/abc123') {
        return Promise.resolve({
          data: {
            longUrl: 'https://example.com/one',
            accessed_times: 45,
            updatedAt: '2026-08-05T00:00:00Z',
            hasPassword: true,
            tags: [{ id: 1, name: 'youtube' }],
          },
        });
      }
      return Promise.resolve({ data: mockLinks });
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-qr-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('URL table renders links, multi-tags, status badges, and click counts correctly', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    expect(screen.getByText('https://example.com/one')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getAllByText(/youtube/)[0]).toBeInTheDocument();

    // Test Favicon image fallback on error
    const favicons = document.querySelectorAll('img[alt="Favicon"]');
    if (favicons[0]) {
      fireEvent.error(favicons[0]);
    }
  }, 10000);

  it('typing into Search Bar filters the displayed links', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search by short link or URL');
    fireEvent.change(searchInput, { target: { value: 'def' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();
      expect(screen.getByText(/def456/)).toBeInTheDocument();
    });
  });

  it('handles copy link, QR code modal opening and deletion flow (confirm & cancel)', async () => {
    (axiosInstance.delete as any).mockResolvedValue({});

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    // Copy link button
    const copyBtns = screen.getAllByTitle('Copy link');
    if (copyBtns[0]) {
      fireEvent.click(copyBtns[0]);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    }

    // QR Code button
    const qrBtns = screen.getAllByTitle('QR Code');
    if (qrBtns[0]) {
      fireEvent.click(qrBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('QR Code')).toBeInTheDocument();
        expect(screen.getByText('Save changes')).toBeInTheDocument();
      });
      // Close QR Modal
      const closeButtons = screen.getAllByRole('button');
      const xBtn = closeButtons.find(b => b.querySelector('svg.lucide-x'));
      if (xBtn) fireEvent.click(xBtn);
    }

    // 1. Open more menu and cancel deletion
    window.confirm = vi.fn().mockReturnValue(false);
    const moreButtons = screen.getAllByRole('button');
    const moreIconBtn = moreButtons.find(b => b.querySelector('svg.lucide-ellipsis-vertical') || b.querySelector('svg.lucide-more-vertical'))!;
    fireEvent.click(moreIconBtn);

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    expect(axiosInstance.delete).not.toHaveBeenCalled();

    // 2. Open more menu and confirm deletion
    window.confirm = vi.fn().mockReturnValue(true);
    fireEvent.click(moreIconBtn);
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalledWith('/url/def456');
    });
  });

  it('handles delete API failure error handling gracefully', async () => {
    (axiosInstance.delete as any).mockRejectedValue(new Error('Delete failure'));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button');
    const moreIconBtn = moreButtons.find(b => b.querySelector('svg.lucide-ellipsis-vertical') || b.querySelector('svg.lucide-more-vertical'))!;
    fireEvent.click(moreIconBtn);

    window.confirm = vi.fn().mockReturnValue(true);
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalled();
    });
  });

  it('handles 3-dot menu dropdown actions (Copy Link, Edit, QR, Backdrop close)', async () => {
    (axiosInstance.put as any).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics/:hash" element={<div>Analytics View</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button');
    const moreIconBtn = moreButtons.find(b => b.querySelector('svg.lucide-ellipsis-vertical') || b.querySelector('svg.lucide-more-vertical'))!;

    // 1. Open menu and click backdrop to close
    fireEvent.click(moreIconBtn);
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
    const backdrop = document.querySelector('.fixed.inset-0.z-40')!;
    fireEvent.click(backdrop);

    // 2. Copy Link from menu
    fireEvent.click(moreIconBtn);
    fireEvent.click(screen.getByText('Copy Link'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // 3. QR Code from menu
    fireEvent.click(moreIconBtn);
    fireEvent.click(screen.getByText('QR Code'));
    await waitFor(() => {
      expect(screen.getByText('QR Code')).toBeInTheDocument();
    });
    const closeButtons = screen.getAllByRole('button');
    const xBtn = closeButtons.find(b => b.querySelector('svg.lucide-x'));
    if (xBtn) fireEvent.click(xBtn);

    // 4. Edit from menu and submit edit modal
    fireEvent.click(moreIconBtn);
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => {
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });

    const form = document.getElementById('create-link-form')!;
    fireEvent.submit(form);
  });

  it('handles Analytics navigation from 3-dot menu', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics/:hash" element={<div>Analytics View</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button');
    const moreIconBtn = moreButtons.find(b => b.querySelector('svg.lucide-ellipsis-vertical') || b.querySelector('svg.lucide-more-vertical'))!;

    fireEvent.click(moreIconBtn);
    fireEvent.click(screen.getByText('Analytics'));
    expect(screen.getByText('Analytics View')).toBeInTheDocument();
  });

  it('handles QR code studio modal customization and downloads', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    const qrBtns = screen.getAllByTitle('QR Code');
    if (qrBtns[0]) {
      fireEvent.click(qrBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('QR Code')).toBeInTheDocument();
        expect(screen.getByText('Dot Style')).toBeInTheDocument();
      });

      // Switch dot style
      fireEvent.click(screen.getByTitle('Dots'));

      // Toggle logo
      fireEvent.click(screen.getByRole('button', { name: 'Logo' }));

      const closeButtons = screen.getAllByRole('button');
      const xBtn = closeButtons.find(b => b.querySelector('svg.lucide-x'));
      if (xBtn) fireEvent.click(xBtn);
    }
  });

  it('handles tag filter popover, search, and checkbox selection', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    });

    // 1. Open Filter
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByText('Tag'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
      expect(screen.getAllByText('youtube').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'you' } });

    const tagCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(tagCheckbox);

    // Test back chevron
    const backBtn = document.querySelector('svg.lucide-chevron-left')?.closest('button');
    if (backBtn) fireEvent.click(backBtn);
  });

  it('handles active tag compound pill (single and multi-tag) and pill popover search & toggle', async () => {
    mockDashboardSearchParams = new URLSearchParams('tagId=1,2');

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('2 Tags')).toBeInTheDocument();
    });

    // Open tag pill popover
    fireEvent.click(screen.getByText('2 Tags'));
    expect(screen.getByPlaceholderText('Tag...')).toBeInTheDocument();

    const tagPillInput = screen.getByPlaceholderText('Tag...');
    fireEvent.change(tagPillInput, { target: { value: 'work' } });
    expect(screen.getAllByText('work').length).toBeGreaterThan(0);

    // Toggle tag checkbox in popover
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) fireEvent.click(checkboxes[0]);

    // Clear filter
    const closeBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'));
    if (closeBtn) fireEvent.click(closeBtn);
  });

  it('renders single active tag pill correctly', async () => {
    mockDashboardSearchParams = new URLSearchParams('tagId=1');

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('youtube')).toBeInTheDocument();
    });
  });

  it('handles display properties and sorting controls (asc/desc and total clicks)', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /display/i })).toBeInTheDocument();
    });

    // Open Display menu
    fireEvent.click(screen.getByRole('button', { name: /display/i }));

    // Toggle sort order button (asc/desc)
    const sortOrderBtn = screen.getByTitle('Sort Descending');
    fireEvent.click(sortOrderBtn);

    // Open Sort menu and choose Total clicks
    const sortDropdown = screen.getByText('Date created');
    fireEvent.click(sortDropdown);
    const totalClicksOption = screen.getAllByText('Total clicks').pop()!;
    fireEvent.click(totalClicksOption);

    // Reopen and choose Date created
    const sortDropdownUpdated = screen.getAllByText('Total clicks')[0];
    fireEvent.click(sortDropdownUpdated);
    const dateCreatedOption = screen.getAllByText('Date created').pop()!;
    fireEvent.click(dateCreatedOption);

    // Toggle display property buttons
    fireEvent.click(screen.getByText('Destination URL'));
    fireEvent.click(screen.getByText('Analytics'));
    fireEvent.click(screen.getByText('Created Date'));
    fireEvent.click(screen.getByText('Tags'));
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Password'));
  });

  it('handles visibilitychange and live sync click counts', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    // Fire visibility change event
    fireEvent(document, new Event('visibilitychange'));
  });

  it('handles syncClickCounts remote 404 removal', async () => {
    const error404 = new Error('Not found') as any;
    error404.response = { status: 404 };
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/url/abc123') return Promise.reject(error404);
      return Promise.resolve({ data: mockLinks });
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/abc123/)[0]).toBeInTheDocument();
    });

    fireEvent(document, new Event('visibilitychange'));
  });

  it('renders empty state when no links exist', async () => {
    (axiosInstance.get as any).mockResolvedValue({ data: [] });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('No short links yet')).toBeInTheDocument();
    });
  });

  it('switches to Campaigns view mode and groups campaign links', async () => {
    const campaignMockLinks = [
      {
        longUrl: 'https://example.com/item?utm_campaign=black_friday&utm_source=twitter&utm_medium=social',
        shortUrl: 'http://trim.sh/bf_tw',
        accessed_times: 150,
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        longUrl: 'https://example.com/item?utm_campaign=black_friday&utm_source=facebook&utm_medium=social',
        shortUrl: 'http://trim.sh/bf_fb',
        accessed_times: 200,
        createdAt: '2026-08-02T00:00:00Z',
      },
      {
        longUrl: 'https://example.com/item2',
        shortUrl: 'http://trim.sh/plain1',
        accessed_times: 10,
        createdAt: '2026-08-03T00:00:00Z',
      },
    ];

    (axiosInstance.get as any).mockResolvedValue({ data: campaignMockLinks });
    mockDashboardSearchParams = new URLSearchParams('view=campaigns');

    render(
      <MemoryRouter initialEntries={['/dashboard?view=campaigns']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('black_friday')).toBeInTheDocument();
      expect(screen.getByText('2 Channels')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });
  });
});
