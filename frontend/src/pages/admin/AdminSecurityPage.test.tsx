import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('renders incidents stream by default and displays detected threats', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/admin/incidents') {
        return Promise.resolve({
          data: {
            content: [
              {
                id: 101,
                incidentType: 'MALWARE_PAYLOAD',
                severity: 'CRITICAL',
                targetUrl: 'http://malware.biz/trojan.exe',
                shortUrl: 'badLink',
                clientIp: '192.168.1.50',
                userEmail: 'attacker@test.com',
                details: 'Executable payload extension detected',
                isResolved: false,
                createdAt: new Date().toISOString(),
              },
            ],
            totalElements: 1,
            totalPages: 1,
          },
        });
      }
      if (url === '/admin/blacklist') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/admin/blocked-ips') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<AdminSecurityPage />);

    expect(screen.getByText(/Threat Intelligence & Security Hub/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('MALWARE_PAYLOAD')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText(/attacker@test.com/i)).toBeInTheDocument();
    });
  });

  it('switches to Blacklists tab and renders domain & IP blacklist interfaces', async () => {
    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/admin/blacklist') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              domainPattern: '*.phishing.test',
              reason: 'Known scam site',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      if (url === '/admin/blocked-ips') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              ipAddress: '198.51.100.4',
              reason: 'Malicious botnet node',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: { content: [] } });
    });

    render(<AdminSecurityPage />);

    // Click Blacklists tab
    const blacklistsTab = screen.getByRole('button', { name: /Blacklists/i });
    fireEvent.click(blacklistsTab);

    expect(screen.getByText(/Add Domain to Blocklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Block Client IP or CIDR Subnet/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('*.phishing.test')).toBeInTheDocument();
      expect(screen.getByText('198.51.100.4')).toBeInTheDocument();
    });
  });

  it('switches to URL Scanner tab and executes on-demand analysis', async () => {
    (axiosInstance.get as any).mockResolvedValue({ data: { content: [] } });
    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        safe: false,
        riskScore: 85,
        threatType: 'MALWARE_PAYLOAD',
        detectedThreats: ['Executable dropper extension: .exe'],
        engine: 'HEURISTIC',
        scanDurationMs: 12,
      },
    });

    render(<AdminSecurityPage />);

    // Click URL Scanner tab
    const scannerTab = screen.getByRole('button', { name: /URL Scanner/i });
    fireEvent.click(scannerTab);

    expect(screen.getByText(/On-Demand URL Diagnostic Sandbox/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/https:\/\/example\.com\/payload\.exe/i);
    fireEvent.change(input, { target: { value: 'http://example.com/trojan.exe' } });

    const scanBtn = screen.getByRole('button', { name: /Analyze URL/i });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(screen.getByText(/Potential Threat Flagged/i)).toBeInTheDocument();
      expect(screen.getByText(/Executable dropper extension: \.exe/i)).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });
});
