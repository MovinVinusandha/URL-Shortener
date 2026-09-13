import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LinkCheckPage from './LinkCheckPage';
import axiosInstance from '../api/axiosInstance';

vi.mock('../api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isCancel: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      folders: [{ id: 1, name: 'Work' }],
    }),
  };
});

const mockLinks = [
  {
    id: 1,
    shortUrl: 'github',
    longUrl: 'https://github.com',
    clicks: 10,
    folderId: 1,
    folderName: 'Work',
  },
  {
    id: 2,
    shortUrl: 'broken-link',
    longUrl: 'https://nonexistent-domain-12345.xyz',
    clicks: 2,
    folderId: null,
  },
];

describe('LinkCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (axiosInstance.get as any).mockResolvedValue({ data: mockLinks });
  });

  it('renders redesigned link check elements and graphs', async () => {
    render(
      <MemoryRouter>
        <LinkCheckPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Test URL...')).toBeInTheDocument();
    expect(screen.getByText('Start Check')).toBeInTheDocument();
    expect(screen.getByTitle('Reload Links')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Inspection Progress')).toBeInTheDocument();
    expect(screen.getByText('Status Code Distribution')).toBeInTheDocument();
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Abnormal').length).toBeGreaterThan(0);
  });

  it('runs batch check when Start Check is clicked', async () => {
    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        total: 2,
        normal: 1,
        abnormal: 1,
        networkError: 0,
        results: [
          {
            id: '1',
            slug: 'github',
            url: 'https://github.com',
            statusCode: 200,
            status: 'NORMAL',
            durationMs: 45,
          },
          {
            id: '2',
            slug: 'broken-link',
            url: 'https://nonexistent-domain-12345.xyz',
            statusCode: 404,
            status: 'ABNORMAL',
            durationMs: 120,
            error: 'HTTP Status 404',
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <LinkCheckPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Start Check')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Check'));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/links/check',
        expect.objectContaining({
          timeoutSeconds: 8,
        }),
        expect.any(Object)
      );
    });
  });
});
