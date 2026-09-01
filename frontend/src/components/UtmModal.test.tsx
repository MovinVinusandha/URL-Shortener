import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { UtmModal } from './UtmModal';

describe('UtmModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    baseUrl: 'https://example.com/pricing',
    initialUtms: {
      source: '',
      medium: '',
      campaign: '',
      term: '',
      content: '',
      ref: '',
    },
    initialCustomParams: [],
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with 6 unified rows and template action', () => {
    render(<UtmModal {...defaultProps} />);

    expect(screen.getByText('UTM Builder')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Campaign')).toBeInTheDocument();
    expect(screen.getByText('Term')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('updates inputs and triggers onSave with new values', () => {
    render(<UtmModal {...defaultProps} />);

    const sourceInput = screen.getByPlaceholderText('google');
    fireEvent.change(sourceInput, { target: { value: 'newsletter' } });

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'newsletter',
      }),
      []
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('opens templates popover and applies preset', () => {
    render(<UtmModal {...defaultProps} />);

    const templatesBtn = screen.getByText('Templates');
    fireEvent.click(templatesBtn);

    expect(screen.getByText('Platform Presets')).toBeInTheDocument();
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('X (Twitter)'));

    const sourceInput = screen.getByPlaceholderText('google');
    expect((sourceInput as HTMLInputElement).value).toBe('twitter');
  });

  it('allows adding and removing custom parameters', () => {
    render(<UtmModal {...defaultProps} />);

    const addParamBtn = screen.getByText('Add custom parameter');
    fireEvent.click(addParamBtn);

    const keyInput = screen.getByPlaceholderText('Key');
    const valueInput = screen.getByPlaceholderText('Value');

    fireEvent.change(keyInput, { target: { value: 'ref_id' } });
    fireEvent.change(valueInput, { target: { value: '123' } });

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ key: 'ref_id', value: '123' }),
      ])
    );
  });

  it('triggers onClose when cancel is clicked', () => {
    render(<UtmModal {...defaultProps} />);

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<UtmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('UTM Builder')).not.toBeInTheDocument();
  });
});
