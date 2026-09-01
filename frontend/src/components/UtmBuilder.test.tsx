import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { UtmBuilder } from './UtmBuilder';

describe('UtmBuilder', () => {
  const mockOnChange = vi.fn();
  const mockOnClear = vi.fn();

  const defaultProps = {
    utms: {
      source: '',
      medium: '',
      campaign: '',
      term: '',
      content: '',
    },
    customParams: [],
    onChange: mockOnChange,
    onClear: mockOnClear,
    defaultExpanded: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard UTM input fields and quick presets', () => {
    render(<UtmBuilder {...defaultProps} />);

    expect(screen.getByText('UTM Builder & Tracking')).toBeInTheDocument();
    expect(screen.getByText('Referral / Source')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Campaign')).toBeInTheDocument();
    expect(screen.getByText('Term / Keyword')).toBeInTheDocument();
    expect(screen.getByText('Content / Variant')).toBeInTheDocument();
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('triggers onChange when a platform preset is clicked', () => {
    render(<UtmBuilder {...defaultProps} />);

    const twitterBtn = screen.getByText('X (Twitter)');
    fireEvent.click(twitterBtn);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'twitter',
        medium: 'social',
      }),
      []
    );
  });

  it('allows adding and removing custom parameters', () => {
    render(<UtmBuilder {...defaultProps} />);

    const addParamBtn = screen.getByText('Add parameter');
    fireEvent.click(addParamBtn);

    expect(mockOnChange).toHaveBeenCalledWith(
      defaultProps.utms,
      expect.arrayContaining([
        expect.objectContaining({ key: '', value: '' }),
      ])
    );
  });

  it('triggers onClear when clear button is clicked with active tags', () => {
    render(
      <UtmBuilder
        {...defaultProps}
        utms={{
          source: 'twitter',
          medium: 'social',
          campaign: 'launch',
          term: '',
          content: '',
        }}
      />
    );

    const clearBtn = screen.getByTitle('Clear all parameters');
    fireEvent.click(clearBtn);

    expect(mockOnClear).toHaveBeenCalled();
  });
});
