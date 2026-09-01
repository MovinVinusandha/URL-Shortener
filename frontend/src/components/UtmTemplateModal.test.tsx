import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { UtmTemplateModal } from './UtmTemplateModal';
import * as utmUtils from '../utils/utmUtils';

describe('UtmTemplateModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create modal and saves new template via API', async () => {
    const createSpy = vi.spyOn(utmUtils, 'createUtmTemplateApi').mockResolvedValue({
      id: '123',
      name: 'Product Launch',
      utms: {
        source: 'linkedin',
        medium: '',
        campaign: '',
        term: '',
        content: '',
        ref: '',
      },
      createdAt: Date.now(),
    });
    vi.spyOn(utmUtils, 'fetchUtmTemplatesApi').mockResolvedValue([]);

    render(
      <UtmTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create UTM Template')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Google Search Ads/i);
    fireEvent.change(nameInput, { target: { value: 'Product Launch' } });

    const sourceInput = screen.getByPlaceholderText('google');
    fireEvent.change(sourceInput, { target: { value: 'linkedin' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Template' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'Product Launch',
        expect.objectContaining({
          source: 'linkedin',
        }),
        []
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('renders edit modal with initial template data and updates it via API', async () => {
    const updateSpy = vi.spyOn(utmUtils, 'updateUtmTemplateApi').mockResolvedValue({
      id: 'template-xyz',
      name: 'Existing Template',
      utms: {
        source: 'twitter',
        medium: 'social',
        campaign: 'spring',
        term: '',
        content: '',
        ref: '',
      },
      createdAt: 1725177600000,
    });
    vi.spyOn(utmUtils, 'fetchUtmTemplatesApi').mockResolvedValue([]);

    const templateToEdit: utmUtils.UtmTemplate = {
      id: 'template-xyz',
      name: 'Existing Template',
      utms: {
        source: 'twitter',
        medium: 'social',
        campaign: 'spring',
        term: '',
        content: '',
        ref: '',
      },
      createdAt: 1725177600000,
    };

    render(
      <UtmTemplateModal
        isOpen={true}
        templateToEdit={templateToEdit}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit UTM Template')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'template-xyz',
        'Existing Template',
        expect.objectContaining({
          source: 'twitter',
          medium: 'social',
        }),
        []
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
