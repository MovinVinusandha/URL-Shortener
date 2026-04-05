import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TagsPage from './TagsPage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockNavigate = vi.fn();

vi.mock('../api/axiosInstance', () => ({
  default: { delete: vi.fn(), get: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      tags: [
        { id: 1, name: 'Important', color: 'red', linkCount: 3 },
        { id: 2, name: 'Work', color: 'blue', linkCount: 0 },
      ],
      setTags: vi.fn(),
      setTagToEdit: vi.fn(),
      setIsCreateTagModalOpen: vi.fn(),
    }),
    useNavigate: () => mockNavigate,
  };
});

describe('TagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tag list', () => {
    render(<MemoryRouter><TagsPage /></MemoryRouter>);
    
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('3 links')).toBeInTheDocument();
  });

  it('filters tags by search input', () => {
    render(<MemoryRouter><TagsPage /></MemoryRouter>);
    
    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'imp' } });
    
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('clicking a tag navigates to dashboard with tag query', () => {
    render(<MemoryRouter><TagsPage /></MemoryRouter>);
    
    const tag = screen.getByText('Important');
    fireEvent.click(tag);
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard?tag=Important');
  });
});
