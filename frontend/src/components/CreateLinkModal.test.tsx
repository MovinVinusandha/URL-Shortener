import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateLinkModal from './CreateLinkModal';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn() },
  extractBackendError: vi.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

describe('CreateLinkModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendering when isOpen={true}', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    expect(screen.getByText('Destination URL')).toBeInTheDocument();
  });

  it('returning null when isOpen={false}', () => {
    const { container } = render(
      <CreateLinkModal 
        isOpen={false} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('typing in Destination URL updates the field', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const input = screen.getByPlaceholderText('https://dub.co/help/article/dub-links');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    expect((input as HTMLInputElement).value).toBe('https://example.com');
  });

  it('clicking expiration pill buttons updates active state', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const btnNone = screen.getByText('None');
    const btn1Hour = screen.getByText('1 Hour');
    const btn24Hours = screen.getByText('24 Hours');
    const btn7Days = screen.getByText('7 Days');
    
    fireEvent.click(btn1Hour);
    expect(btn1Hour.className).toContain('bg-gray-900');
    
    fireEvent.click(btn24Hours);
    expect(btn24Hours.className).toContain('bg-gray-900');

    fireEvent.click(btn7Days);
    expect(btn7Days.className).toContain('bg-gray-900');

    fireEvent.click(btnNone);
    expect(btnNone.className).toContain('bg-gray-900');
  });

  it('password field has a working show/hide toggle', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const input = screen.getByPlaceholderText('Optional password...');
    expect((input as HTMLInputElement).type).toBe('password');
    
    const toggleButton = input.nextElementSibling as HTMLButtonElement;
    
    fireEvent.click(toggleButton);
    expect((input as HTMLInputElement).type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect((input as HTMLInputElement).type).toBe('password');
  });

  it('handles tag selection and inline tag creation', async () => {
    (axiosInstance.post as any).mockResolvedValue({
      data: { id: 99, name: 'BrandNewTag', color: 'blue' }
    });

    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[{ id: 1, name: 'existing-tag', color: 'red' }]} 
      />
    );

    // Open tag dropdown
    fireEvent.click(screen.getByText('Select tags...'));

    expect(screen.getByText('existing-tag')).toBeInTheDocument();
    fireEvent.click(screen.getByText('existing-tag'));

    // Search for a new tag
    const tagSearchInput = screen.getByPlaceholderText('Search or create tag...');
    fireEvent.change(tagSearchInput, { target: { value: 'BrandNewTag' } });

    const createTagBtn = screen.getByText(/\+ Create/i);
    expect(createTagBtn).toBeInTheDocument();
    fireEvent.click(createTagBtn);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/tags', expect.objectContaining({ name: 'BrandNewTag' }));
    });
  });

  it('handles folder selection dropdown, search, and creating new folder trigger', () => {
    const onOpenFolderModal = vi.fn();
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[
          { id: 1, name: 'Links' },
          { id: 2, name: 'Marketing' },
          { id: 3, name: 'Personal' }
        ]} 
        tags={[]} 
        onOpenFolderModal={onOpenFolderModal}
      />
    );

    // Open Folder dropdown (right column)
    const folderButtons = screen.getAllByRole('button');
    const folderSelectBtn = folderButtons.find(b => b.querySelector('svg.lucide-chevrons-up-down'))!;
    fireEvent.click(folderSelectBtn);

    expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();

    // Search folder
    const searchInput = screen.getByPlaceholderText('Search folders...');
    fireEvent.change(searchInput, { target: { value: 'Market' } });
    expect(screen.getByText('Marketing')).toBeInTheDocument();

    // Select folder
    fireEvent.click(screen.getByText('Marketing'));

    // Open again and click Create new folder
    fireEvent.click(folderSelectBtn);
    fireEvent.click(screen.getByText('Create new folder'));
    expect(onOpenFolderModal).toHaveBeenCalled();
  });

  it('submits a new short link successfully', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    (axiosInstance.post as any).mockResolvedValue({
      data: {
        shortUrl: 'http://trim.sh/custom123',
        longUrl: 'https://example.com/test',
        accessed_times: 0,
      }
    });

    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={onClose} 
        onSuccess={onSuccess} 
        folders={[{ id: 1, name: 'Links' }]} 
        tags={[]} 
      />
    );

    // Fill Destination URL
    const urlInput = screen.getByPlaceholderText('https://dub.co/help/article/dub-links');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/test' } });

    // Fill Short Link using randomize
    const randomizeBtn = screen.getByTitle('Randomize');
    fireEvent.click(randomizeBtn);

    // Submit form
    const form = document.getElementById('create-link-form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/shorten', expect.objectContaining({
        longUrl: 'https://example.com/test',
      }));
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const mockUrlToEdit = {
      shortUrl: 'http://trim.sh/abc123',
      longUrl: 'https://example.com/edit',
      folderId: 1,
      folderName: 'My Folder',
      tags: [{ id: 1, name: 'youtube', color: 'red' }],
      hasPassword: true,
      expiresAt: '2025-12-31T23:59:59',
      isActive: true,
    };

    it('pre-fills inputs and disables short URL input', () => {
      render(
        <CreateLinkModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSuccess={vi.fn()} 
          folders={[{ id: 1, name: 'My Folder' }]} 
          tags={[{ id: 1, name: 'youtube', color: 'red' }]}
          urlToEdit={mockUrlToEdit}
        />
      );

      const longUrlInput = screen.getByDisplayValue('https://example.com/edit');
      expect(longUrlInput).toBeInTheDocument();

      const shortUrlInput = screen.getByDisplayValue('abc123');
      expect(shortUrlInput).toBeDisabled();
      
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });

    it('submits using axiosInstance.put when in edit mode', async () => {
      const onSuccessMock = vi.fn();
      (axiosInstance.put as any).mockResolvedValue({ data: { success: true } });

      render(
        <CreateLinkModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSuccess={onSuccessMock} 
          folders={[]} 
          tags={[]}
          urlToEdit={mockUrlToEdit}
        />
      );

      const longUrlInput = screen.getByDisplayValue('https://example.com/edit');
      fireEvent.change(longUrlInput, { target: { value: 'https://example.com/updated' } });

      const form = document.getElementById('create-link-form')!;
      fireEvent.submit(form);

      expect(axiosInstance.put).toHaveBeenCalledWith('/url/abc123', expect.objectContaining({
        longUrl: 'https://example.com/updated',
      }));
    });

    it('handles password removal toggle and cancelation in edit mode', () => {
      render(
        <CreateLinkModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSuccess={vi.fn()} 
          folders={[]} 
          tags={[]} 
          urlToEdit={mockUrlToEdit}
        />
      );

      const removeBtn = screen.getByText('Remove current password');
      expect(removeBtn).toBeInTheDocument();

      // Click to mark password for removal
      fireEvent.click(removeBtn);
      expect(screen.getByText('Cancel password removal')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password will be removed')).toBeInTheDocument();

      // Click to cancel removal
      fireEvent.click(screen.getByText('Cancel password removal'));
      expect(screen.getByText('Remove current password')).toBeInTheDocument();
    });
  });

  describe('Default Folder Selection', () => {
    const mockFolders = [
      { id: 10, name: 'Marketing', slug: 'marketing' },
      { id: 20, name: 'Links', slug: 'links' },
      { id: 30, name: 'Social', slug: 'social' }
    ];

    it('defaults folder selection to the system "Links" folder when creating a new link', () => {
      render(
        <CreateLinkModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSuccess={vi.fn()} 
          folders={mockFolders} 
          tags={[]} 
        />
      );
      
      expect(screen.getAllByText('Links').length).toBeGreaterThan(0);
    });

    it('falls back to the first folder if no "Links" folder exists', () => {
      const customFolders = [
        { id: 100, name: 'Work', slug: 'work' },
        { id: 200, name: 'Personal', slug: 'personal' }
      ];

      render(
        <CreateLinkModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSuccess={vi.fn()} 
          folders={customFolders} 
          tags={[]} 
        />
      );
      
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  it('renders custom calendar date picker and handles day & time selection', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );
    
    const customBtn = screen.getByText('Custom');
    fireEvent.click(customBtn);

    const triggerBtn = screen.getByRole('button', { name: /select custom date and time|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i });
    expect(triggerBtn).toBeInTheDocument();

    // Open popover
    fireEvent.click(triggerBtn);
    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();

    // Month chevrons
    const popoverButtons = screen.getAllByRole('button');
    const chevrons = popoverButtons.filter(b => b.querySelector('svg.lucide-chevron-left') || b.querySelector('svg.lucide-chevron-right'));
    chevrons.forEach(c => fireEvent.click(c));

    // Select a day
    const dayButtons = screen.getAllByRole('button').filter(b => /^\d+$/.test(b.textContent || ''));
    if (dayButtons.length > 0) {
      fireEvent.click(dayButtons[Math.min(15, dayButtons.length - 1)]);
    }

    // Toggle AM / PM
    const pmBtn = screen.getByText('PM');
    fireEvent.click(pmBtn);

    // Select hour and minute
    const selects = screen.getAllByRole('combobox');
    if (selects.length >= 2) {
      fireEvent.change(selects[0], { target: { value: '5' } });
      fireEvent.change(selects[1], { target: { value: '30' } });
    }
  });

  it('clicking UTM toolbar button opens the UTM parameters modal', () => {
    render(
      <CreateLinkModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
        folders={[]} 
        tags={[]} 
      />
    );

    const utmToolbarBtn = screen.getByTitle('UTM Builder & Tracking Parameters');
    expect(utmToolbarBtn).toBeInTheDocument();

    fireEvent.click(utmToolbarBtn);
    expect(screen.getByText('UTM Builder')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('calls onSuccess with mapped UrlEntry array when batch multi-channel links are created', async () => {
    const onSuccessMock = vi.fn();
    (axiosInstance.get as any).mockResolvedValue({ data: [] });
    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        campaignName: 'Summer Launch',
        totalCreated: 2,
        items: [
          {
            channelName: 'Facebook',
            shortUrl: 'http://localhost/fb123',
            fullShortUrl: 'http://localhost/fb123',
            longUrlWithUtm: 'https://example.com?utm_source=facebook',
            utmSource: 'facebook',
            utmMedium: 'social',
          },
          {
            channelName: 'Twitter',
            shortUrl: 'http://localhost/tw123',
            fullShortUrl: 'http://localhost/tw123',
            longUrlWithUtm: 'https://example.com?utm_source=twitter',
            utmSource: 'twitter',
            utmMedium: 'social',
          },
        ],
      },
    });

    render(
      <CreateLinkModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccessMock}
        folders={[]}
        tags={[]}
        initialMode="multi"
      />
    );

    const destInput = screen.getByPlaceholderText('https://yourbrand.com/launch');
    fireEvent.change(destInput, { target: { value: 'https://example.com' } });

    const campInput = screen.getByPlaceholderText('summer_sale_2026');
    fireEvent.change(campInput, { target: { value: 'Summer Launch' } });

    const createBtn = screen.getByRole('button', { name: /create \d+ campaign links/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    const passedEntries = onSuccessMock.mock.calls[0][0];
    expect(Array.isArray(passedEntries)).toBe(true);
    expect(passedEntries).toHaveLength(2);
    expect(passedEntries[0].shortUrl).toBe('http://localhost/fb123');
    expect(passedEntries[1].shortUrl).toBe('http://localhost/tw123');
  });
});

