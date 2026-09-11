import { render, screen, waitFor } from '@testing-library/react';
import AdminSecurityPage from './AdminSecurityPage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import React from 'react';

vi.mock('../../api/axiosInstance');
vi.mock('react-router-dom', () => ({
  useOutletContext: () => ({ refreshTrigger: 0, triggerRefresh: vi.fn() }),
}));

describe('AdminSecurityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders blacklist domain management interface', async () => {
    (axiosInstance.get as any).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          domainPattern: '*.phishing.test',
          reason: 'Known scam site',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(<AdminSecurityPage />);

    expect(screen.getByText(/Add Domain to Blocklist/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Domain \(e\.g/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('*.phishing.test')).toBeInTheDocument();
      expect(screen.getByText('Known scam site')).toBeInTheDocument();
    });
  });
});
