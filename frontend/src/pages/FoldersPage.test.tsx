import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoldersPage from './FoldersPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as routerDom from 'react-router-dom';

vi.mock('../api/axiosInstance', () => ({
  default: { delete: vi.fn(), get: vi.fn() },
}));

const mockNavigate = vi.fn();
const mockSetActiveFolderId = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      folders: [
        { id: 1, name: 'Marketing', linkCount: 5 },
        { id: 2, name: 'Personal', linkCount: 1 },
      ],
      setFolders: vi.fn(),
      setActiveFolderId: mockSetActiveFolderId,
      setFolderToEdit: vi.fn(),
      setIsFolderModalOpen: vi.fn(),
    }),
    useNavigate: () => mockNavigate,
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams()]),
  };
});

describe('FoldersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders folder cards', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('5 links')).toBeInTheDocument();
    expect(screen.getByText('1 link')).toBeInTheDocument();
  });

  it('filters folders by search input', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const searchInput = screen.getByPlaceholderText('Search folders...');
    fireEvent.change(searchInput, { target: { value: 'mark' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Personal')).not.toBeInTheDocument();
  });

  it('clicking a folder card navigates to dashboard and sets active folder', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const marketingFolder = screen.getByText('Marketing');
    fireEvent.click(marketingFolder);
    
    expect(mockSetActiveFolderId).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
