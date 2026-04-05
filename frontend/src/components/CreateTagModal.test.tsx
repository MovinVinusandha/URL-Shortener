import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateTagModal from './CreateTagModal';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), put: vi.fn() },
}));

describe('CreateTagModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects color pills and submits new tag', async () => {
    (axiosInstance.post as any).mockResolvedValue({ data: { id: 1, name: 'New Tag', color: 'blue' } });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<CreateTagModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
    
    // Type in tag name
    fireEvent.change(screen.getByPlaceholderText('e.g. Marketing'), { target: { value: 'New Tag' } });
    
    // Select color (Blue)
    const blueRadio = screen.getByDisplayValue('blue');
    fireEvent.click(blueRadio);
    expect(blueRadio).toBeChecked();
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create tag' }));
    
    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/tags', { name: 'New Tag', color: 'blue' });
      expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'New Tag', color: 'blue' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
