import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QrCodeModal } from './QrCodeModal';

describe('QrCodeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    shortUrl: 'https://trim.ly/abc1234',
    hash: 'abc1234',
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders compact minimal QR Code modal with preview, controls and Save changes button', () => {
    render(<QrCodeModal {...defaultProps} />);

    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('https://trim.ly/abc1234')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByText('Dot Style')).toBeInTheDocument();
    expect(screen.getByText('Marker Center')).toBeInTheDocument();
    expect(screen.getByText('Marker Border')).toBeInTheDocument();
    expect(screen.getByText('Pattern Color')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('allows toggling logo, 3 distinct dot styles (Squares, Dots, Diamonds)', () => {
    render(<QrCodeModal {...defaultProps} />);

    // Toggle logo
    const noneBtn = screen.getByRole('button', { name: 'None' });
    fireEvent.click(noneBtn);

    const logoBtn = screen.getByRole('button', { name: 'Logo' });
    fireEvent.click(logoBtn);

    // Toggle 3 distinct dot styles
    const squaresBtn = screen.getByTitle('Squares');
    fireEvent.click(squaresBtn);

    const dotsBtn = screen.getByTitle('Dots');
    fireEvent.click(dotsBtn);

    const diamondsBtn = screen.getByTitle('Diamonds');
    fireEvent.click(diamondsBtn);

    // Toggle marker center & border
    const squareCenterBtn = screen.getByTitle('Square center');
    fireEvent.click(squareCenterBtn);

    const circleBorderBtn = screen.getByTitle('Circle outer');
    fireEvent.click(circleBorderBtn);
  });

  it('allows opening and interacting with modern color pickers', () => {
    render(<QrCodeModal {...defaultProps} />);

    // Open Pattern Color popover (default is #000000 in light mode)
    const patternColorBtn = screen.getByText(/#000000/i);
    fireEvent.click(patternColorBtn);

    // Click a palette swatch
    const emeraldSwatch = screen.getByTitle('#10b981');
    fireEvent.click(emeraldSwatch);
  });

  it('allows switching download formats in top-right download dropdown', () => {
    render(<QrCodeModal {...defaultProps} />);

    const downloadTrigger = screen.getByTitle('Download QR Code (PNG, JPEG, SVG)');
    fireEvent.click(downloadTrigger);

    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('SVG')).toBeInTheDocument();

    fireEvent.click(screen.getByText('SVG'));
  });

  it('saves changes and triggers onSave without closing popup', () => {
    render(<QrCodeModal {...defaultProps} />);

    const saveBtn = screen.getByText('Save changes');
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('triggers close handler when cancel button is clicked', () => {
    render(<QrCodeModal {...defaultProps} />);

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<QrCodeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('QR Code')).not.toBeInTheDocument();
  });
});
