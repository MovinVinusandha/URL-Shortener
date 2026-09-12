import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminAuditLogsPage from './AdminAuditLogsPage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import React from 'react';

vi.mock('../../api/axiosInstance');
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@trim.com', role: 'ROOT' },
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ refreshTrigger: 0, triggerRefresh: vi.fn() }),
  };
});

describe('AdminAuditLogsPage', () => {
  const mockLogs = [
    {
      id: 1,
      actorId: 1,
      actorEmail: 'admin@trim.com',
      actorRole: 'ROOT',
      actorIp: '127.0.0.1',
      action: 'LINK_QUARANTINED',
      targetType: 'LINK',
      targetIdentifier: 'malicious1',
      details: 'Quarantined link /malicious1',
      metadataJson: '{"reason":"Flagged phishing"}',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      entryHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      actorId: 1,
      actorEmail: 'admin@trim.com',
      actorRole: 'ROOT',
      actorIp: '127.0.0.1',
      action: 'IP_BLOCKED',
      targetType: 'IP',
      targetIdentifier: '192.168.1.100',
      details: 'Blocked perimeter IP 192.168.1.100',
      metadataJson: '{"reason":"Spam burst"}',
      prevHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
      entryHash: 'def9876543210fedcba9876543210fedcba9876543210fedcba9876543210fed',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockVerification = {
    valid: true,
    totalVerified: 2,
    genesisHash: '0000000000000000000000000000000000000000000000000000000000000000',
    latestHash: 'def9876543210fedcba9876543210fedcba9876543210fedcba9876543210fed',
    tamperedEntryId: null,
    failureReason: null,
    verifiedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit logs and displays verification status banner', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/audit-logs/verify')) {
        return Promise.resolve({ data: mockVerification });
      }
      return Promise.resolve({
        data: {
          content: mockLogs,
          totalPages: 1,
          totalElements: 2,
          size: 20,
          number: 0,
        },
      });
    });

    render(
      <BrowserRouter>
        <AdminAuditLogsPage />
      </BrowserRouter>
    );

    // Verify title and banner
    await waitFor(() => {
      expect(screen.getByText('Immutable Audit Trail')).toBeInTheDocument();
      expect(screen.getByText('Cryptographic Chain Valid & Intact')).toBeInTheDocument();
      expect(screen.getByText('(2 entries validated)')).toBeInTheDocument();
    });

    // Check table rows
    await waitFor(() => {
      expect(screen.getByText('malicious1')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('LINK QUARANTINED')).toBeInTheDocument();
      expect(screen.getByText('IP BLOCKED')).toBeInTheDocument();
    });
  });

  it('opens detail modal upon clicking a row', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/audit-logs/verify')) {
        return Promise.resolve({ data: mockVerification });
      }
      return Promise.resolve({
        data: {
          content: mockLogs,
          totalPages: 1,
          totalElements: 2,
          size: 20,
          number: 0,
        },
      });
    });

    render(
      <BrowserRouter>
        <AdminAuditLogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('malicious1')).toBeInTheDocument();
    });

    // Click on row 1
    fireEvent.click(screen.getByText('malicious1'));

    // Verify forensic details modal opened
    await waitFor(() => {
      expect(screen.getByText(/Audit Entry #1 Forensic Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Entry SHA-256 Hash/i)).toBeInTheDocument();
      expect(screen.getByText(/Previous Entry Hash/i)).toBeInTheDocument();
    });
  });
});
