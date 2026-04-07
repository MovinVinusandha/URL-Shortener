import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderModal from './FolderModal';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/axiosInstance', () => ({
  default: { post: vi.fn(), put: vi.fn() },
}));

describe('FolderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('folder name input and creation submission', async () => {
    (axiosInstance.post as any).mockResolvedValue({ data: { id: 1, name: 'New Folder' } });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<FolderModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
    
    // Type in folder name
    fireEvent.change(screen.getByPlaceholderText('e.g. Marketing Campaigns'), { target: { value: 'New Folder' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Save folder' }));
    
    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/folders', { name: 'New Folder' });
      expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'New Folder' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
