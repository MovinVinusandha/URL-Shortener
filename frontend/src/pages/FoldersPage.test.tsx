import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoldersPage from './FoldersPage';
import axiosInstance from '../api/axiosInstance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockNavigate = vi.fn();
const mockSetActiveFolderId = vi.fn();
const mockSetFolders = vi.fn();
const mockSetFolderToEdit = vi.fn();
const mockSetIsFolderModalOpen = vi.fn();

let mockSearchParams = new URLSearchParams();
let mockContextValue = {
  folders: [
    { id: 1, name: 'Links', linkCount: 10 },
    { id: 2, name: 'Marketing', linkCount: 5 },
    { id: 3, name: 'Personal', linkCount: 1 },
  ],
  setFolders: mockSetFolders,
  setActiveFolderId: mockSetActiveFolderId,
  setFolderToEdit: mockSetFolderToEdit,
  setIsFolderModalOpen: mockSetIsFolderModalOpen,
  isFoldersLoading: false,
  navStats: null,
};

vi.mock('../api/axiosInstance', () => ({
  default: { delete: vi.fn(), get: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => mockContextValue,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

describe('FoldersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockContextValue = {
      folders: [
        { id: 1, name: 'Links', linkCount: 10 },
        { id: 2, name: 'Marketing', linkCount: 5 },
        { id: 3, name: 'Personal', linkCount: 1 },
      ],
      setFolders: mockSetFolders,
      setActiveFolderId: mockSetActiveFolderId,
      setFolderToEdit: mockSetFolderToEdit,
      setIsFolderModalOpen: mockSetIsFolderModalOpen,
      isFoldersLoading: false,
      navStats: null,
    };
  });

  it('renders default Links folder card and custom folder cards', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('10 links')).toBeInTheDocument();
    expect(screen.getByText('5 links')).toBeInTheDocument();
    expect(screen.getByText('1 link')).toBeInTheDocument();
  });

  it('filters folders by search input and handles empty results', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const searchInput = screen.getByPlaceholderText('Search folders...');
    fireEvent.change(searchInput, { target: { value: 'mark' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Personal')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No folders found.')).toBeInTheDocument();
  });

  it('clicking default Links folder card navigates to dashboard and sets active folder', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const defaultFolder = screen.getByText('Links');
    fireEvent.click(defaultFolder);
    
    expect(mockSetActiveFolderId).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/f/links');
  });

  it('clicking a custom folder card navigates to dashboard and sets active folder', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const marketingFolder = screen.getByText('Marketing');
    fireEvent.click(marketingFolder);
    
    expect(mockSetActiveFolderId).toHaveBeenCalledWith(2);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/f/marketing');
  });

  it('clicking Analytics in 3-dot menu of a folder navigates to analytics with folderId', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const moreButtons = screen.getAllByRole('button');
    fireEvent.click(moreButtons[1]); // Marketing folder
    
    const analyticsBtn = screen.getByText('Analytics');
    expect(analyticsBtn).toBeInTheDocument();
    
    fireEvent.click(analyticsBtn);
    
    expect(mockSetActiveFolderId).toHaveBeenCalledWith(2);
    expect(mockNavigate).toHaveBeenCalledWith('/analytics/f/marketing');
  });

  it('clicking Edit in 3-dot menu opens edit folder modal', () => {
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const moreButtons = screen.getAllByRole('button');
    fireEvent.click(moreButtons[1]); // Marketing folder
    
    const editBtn = screen.getByText('Edit');
    fireEvent.click(editBtn);
    
    expect(mockSetFolderToEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'Marketing' }));
    expect(mockSetIsFolderModalOpen).toHaveBeenCalledWith(true);
  });

  it('handles delete folder flow with cancel and confirm actions', async () => {
    (axiosInstance.delete as any).mockResolvedValue({});

    render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    
    const moreButtons = screen.getAllByRole('button');
    fireEvent.click(moreButtons[1]); // Marketing folder
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    
    expect(screen.getByRole('heading', { name: 'Delete Folder' })).toBeInTheDocument();
    expect(screen.getByText(/This folder currently contains 5 links/)).toBeInTheDocument();

    // Cancel deletion
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByText(/This folder currently contains 5 links/)).not.toBeInTheDocument();
    });

    // Open and confirm deletion
    fireEvent.click(moreButtons[1]);
    fireEvent.click(screen.getByText('Delete'));
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Folder' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalledWith('/folders/2');
      expect(mockSetFolders).toHaveBeenCalled();
    });
  });

  it('renders skeletons when isFoldersLoading is true', () => {
    mockContextValue.isFoldersLoading = true;

    const { container } = render(<MemoryRouter><FoldersPage /></MemoryRouter>);
    expect(container.querySelectorAll('.react-loading-skeleton').length).toBeGreaterThan(0);
  });

  it('opens folder modal if create=true searchParam is present', () => {
    mockSearchParams = new URLSearchParams('create=true');
    render(<MemoryRouter><FoldersPage /></MemoryRouter>);

    expect(mockSetIsFolderModalOpen).toHaveBeenCalledWith(true);
  });
});
