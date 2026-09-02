import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import UtmTemplatesPage from './UtmTemplatesPage';
import * as utmUtils from '../utils/utmUtils';

describe('UtmTemplatesPage', () => {
  const mockTemplates: utmUtils.UtmTemplate[] = [
    {
      id: 'template-1',
      name: 'Google Search Ads',
      utms: {
        source: 'google',
        medium: 'cpc',
        campaign: 'spring_sale',
        term: 'shortener',
        content: 'hero_btn',
        ref: '',
      },
      createdAt: 1725177600000,
    },
    {
      id: 'template-2',
      name: 'Newsletter Weekly',
      utms: {
        source: 'newsletter',
        medium: 'email',
        campaign: 'weekly_digest',
        term: '',
        content: '',
        ref: '',
      },
      createdAt: 1725177600000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(utmUtils, 'getSavedUtmTemplates').mockReturnValue(mockTemplates);
  });

  it('renders templates list with search and template cards', () => {
    render(
      <MemoryRouter>
        <UtmTemplatesPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Search UTM templates...')).toBeInTheDocument();
    expect(screen.getByText('Google Search Ads')).toBeInTheDocument();
    expect(screen.getByText('Newsletter Weekly')).toBeInTheDocument();
  });

  it('filters templates based on search input', () => {
    render(
      <MemoryRouter>
        <UtmTemplatesPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search UTM templates...');
    fireEvent.change(searchInput, { target: { value: 'newsletter' } });

    expect(screen.getByText('Newsletter Weekly')).toBeInTheDocument();
    expect(screen.queryByText('Google Search Ads')).not.toBeInTheDocument();
  });

  it('renders empty state when no templates and opens modal', () => {
    vi.spyOn(utmUtils, 'getSavedUtmTemplates').mockReturnValue([]);

    render(
      <MemoryRouter>
        <UtmTemplatesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('No UTM templates found')).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /create template/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Create UTM Template')).toBeInTheDocument();
  });

  it('handles delete template flow', async () => {
    const deleteSpy = vi.spyOn(utmUtils, 'deleteUtmTemplateApi').mockResolvedValue();
    vi.spyOn(utmUtils, 'fetchUtmTemplatesApi').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <UtmTemplatesPage />
      </MemoryRouter>
    );

    const moreButtons = screen.getAllByRole('button');
    const menuBtn = moreButtons.find((b) => b.querySelector('svg.lucide-ellipsis-vertical'));
    if (menuBtn) {
      fireEvent.click(menuBtn);
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);

      expect(screen.getByRole('heading', { name: 'Delete Template' })).toBeInTheDocument();
      const confirmDelete = screen.getByRole('button', { name: 'Delete Template' });
      fireEvent.click(confirmDelete);

      expect(deleteSpy).toHaveBeenCalledWith('template-1');
    }
  });

  it('handles duplicate template action and pre-fills modal with copy name', async () => {
    render(
      <MemoryRouter>
        <UtmTemplatesPage />
      </MemoryRouter>
    );

    const moreButtons = screen.getAllByRole('button');
    const menuBtn = moreButtons.find((b) => b.querySelector('svg.lucide-ellipsis-vertical'));
    if (menuBtn) {
      fireEvent.click(menuBtn);
      const duplicateOption = screen.getByText('Duplicate');
      fireEvent.click(duplicateOption);

      expect(screen.getByText('Duplicate UTM Template')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Google Search Ads (Copy)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('google')).toBeInTheDocument();
      expect(screen.getByDisplayValue('cpc')).toBeInTheDocument();
      expect(screen.getByDisplayValue('spring_sale')).toBeInTheDocument();
    }
  });
});
