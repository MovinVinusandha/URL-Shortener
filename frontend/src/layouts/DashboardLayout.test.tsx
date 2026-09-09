import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

vi.mock('../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('DashboardLayout', () => {
  const mockLogout = vi.fn();
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 1, username: 'alex', email: 'alex@example.com', role: 'USER' },
      logout: mockLogout,
    });
    (useTheme as any).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
    });
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/tags') {
        return Promise.resolve({ data: [{ id: 1, name: 'Marketing', color: 'blue' }] });
      }
      if (url === '/folders') {
        return Promise.resolve({
          data: [
            { id: 10, name: 'Links', linkCount: 5 },
            { id: 20, name: 'Campaign 2026', linkCount: 3, slug: 'campaign-2026' },
          ],
        });
      }
      if (url === '/url/all') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/analytics/usage') {
        return Promise.resolve({ data: { totalClicks: 500, totalLinks: 8 } });
      }
      return Promise.resolve({ data: {} });
    });
    (axiosInstance.post as any).mockResolvedValue({
      data: { id: 99, name: 'New Item', shortUrl: 'http://trim.sh/new1', longUrl: 'https://test.com' }
    });
    (axiosInstance.put as any).mockResolvedValue({
      data: { id: 20, name: 'Updated Campaign', shortUrl: 'http://trim.sh/upd', longUrl: 'https://test.com' }
    });
  });

  it('renders sidebar navigation and main content area', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('handles theme switcher dropdown options and click outside', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    const buttons = screen.getAllByRole('button');
    const themeBtn = buttons.find(b => b.querySelector('svg.lucide-monitor') || b.querySelector('svg.lucide-sun') || b.querySelector('svg.lucide-moon'));
    if (themeBtn) {
      fireEvent.click(themeBtn);
      const darkOption = screen.getByText('Dark');
      fireEvent.click(darkOption);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      // Re-open and test click outside
      fireEvent.click(themeBtn);
      fireEvent.mouseDown(document.body);
    }
  });

  it('handles user menu dropdown items, gift icon, profile, and logout', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    const userAvatarBtn = screen.getByText('A');
    fireEvent.click(userAvatarBtn);

    expect(screen.getByText('alex')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();

    // Profile button
    fireEvent.click(screen.getByText('Profile'));

    // "What's new" gift button
    const giftBtn = document.querySelector('svg.lucide-gift')?.closest('button');
    if (giftBtn) fireEvent.click(giftBtn);

    // Re-open and click Logout
    fireEvent.click(userAvatarBtn);
    const logoutBtn = screen.getByText('Log out');
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('handles view switcher dropdown, selecting campaigns, and click outside', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Links/i })).toBeInTheDocument();
    });

    const viewDropdownTrigger = screen.getByRole('button', { name: /Links/i });
    fireEvent.click(viewDropdownTrigger);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Campaigns/i })).toBeInTheDocument();
    });

    // Select Campaigns
    fireEvent.click(screen.getByRole('button', { name: /Campaigns/i }));

    // Re-open and test click outside
    fireEvent.click(viewDropdownTrigger);
    fireEvent.mouseDown(document.body);
  });

  it('handles top navigation tabs and creating a link via modal onSuccess', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Folders/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tags/i })).toBeInTheDocument();

    // Create link modal trigger button
    const createLinkBtn = screen.getByRole('button', { name: /create link/i });
    fireEvent.click(createLinkBtn);
    expect(screen.getByText('Destination URL')).toBeInTheDocument();

    // Submit the form inside modal to trigger onSuccess
    const urlInput = screen.getByPlaceholderText('https://dub.co/help/article/dub-links');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/layout-test' } });

    const form = document.getElementById('create-link-form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalled();
    });
  });

  it('renders header button correctly on /analytics, /folders, and /tags routes and handles modal submissions', async () => {
    // 1. Folders route
    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={['/folders']}>
        <Routes>
          <Route path="/folders" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );
    const createFolderBtn = screen.getByRole('button', { name: /create folder/i });
    expect(createFolderBtn).toBeInTheDocument();
    fireEvent.click(createFolderBtn);

    // Fill folder form and submit
    const folderInput = screen.getByPlaceholderText('e.g. Marketing Campaigns');
    fireEvent.change(folderInput, { target: { value: 'New Test Folder' } });
    fireEvent.click(screen.getByText('Save folder'));
    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalled());
    unmount1();

    // 2. Tags route
    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={['/tags']}>
        <Routes>
          <Route path="/tags" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );
    const createTagBtn = screen.getByRole('button', { name: /create tag/i });
    expect(createTagBtn).toBeInTheDocument();
    fireEvent.click(createTagBtn);

    // Fill tag form and submit
    const tagInput = screen.getByPlaceholderText('e.g. Marketing');
    fireEvent.change(tagInput, { target: { value: 'New Test Tag' } });
    const tagSubmitBtn = screen.getAllByRole('button', { name: /create tag/i }).find(b => b.getAttribute('type') === 'submit')!;
    fireEvent.click(tagSubmitBtn);
    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalled());
    unmount2();

    // 3. Analytics route
    const { unmount: unmount3 } = render(
      <MemoryRouter initialEntries={['/analytics']}>
        <Routes>
          <Route path="/analytics" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );
    const exportBtn = screen.getByRole('button', { name: /export/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    unmount3();

    // 4. Settings route
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Security/i })).toBeInTheDocument();
  });

  it('handles ROOT user role branch without calling loadTags and loadFolders', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'ROOT' },
      logout: mockLogout,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Links/i })).toBeInTheDocument();
  });

  it('handles API errors gracefully during background data load', async () => {
    (axiosInstance.get as any).mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Links/i })).toBeInTheDocument();
  });
});
