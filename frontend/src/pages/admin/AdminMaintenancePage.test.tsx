import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminMaintenancePage from './AdminMaintenancePage';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';

vi.mock('../../api/axiosInstance');
vi.mock('../../context/AuthContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: vi.fn(),
  };
});
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockOverview = {
  redisConnected: true,
  redisVersion: '7.4.11',
  usedMemoryHuman: '1.19M',
  peakMemoryHuman: '1.21M',
  totalKeys: 70,
  urlKeysCount: 64,
  connectedClients: 2,
  uptimeSeconds: 56000,
  keyspaceHits: 415,
  keyspaceMisses: 29000,
  hitRatioPercentage: 1.4,
  totalDatabaseSizeMb: 0.89,
  tables: [
    { tableName: 'click_events', sizeMb: 0.19, rowCount: 338 },
    { tableName: 'urls', sizeMb: 0.05, rowCount: 86 }
  ]
};

describe('AdminMaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOutletContext as any).mockReturnValue({ refreshTrigger: 0, triggerRefresh: vi.fn() });
    (useAuth as any).mockReturnValue({
      user: { role: 'ROOT', email: 'admin@trim.com' },
    });
    (axiosInstance.get as any).mockResolvedValue({ data: mockOverview });
  });

  it('renders maintenance header and Redis telemetry cards', async () => {
    render(<AdminMaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('System Maintenance & Data Retention')).toBeInTheDocument();
      expect(screen.getByText('1.19M')).toBeInTheDocument();
      expect(screen.getByText('64')).toBeInTheDocument();
      expect(screen.getByText('0.89 MB')).toBeInTheDocument();
    });
  });

  it('switches to Dormant Link Garbage Collector tab and executes preview', async () => {
    (axiosInstance.post as any).mockResolvedValue({
      data: {
        dryRun: true,
        affectedCount: 21,
        operation: 'DEACTIVATE',
        message: 'Found 21 candidate URLs matching DORMANT',
        sampleAffectedUrls: ['fp9k9l', '82F4B50A'],
        timestamp: '2026-09-12T04:19:57.393Z'
      }
    });

    render(<AdminMaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Dormant Link Garbage Collector')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dormant Link Garbage Collector'));

    await waitFor(() => {
      expect(screen.getByText('Dry-Run Preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dry-Run Preview'));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/admin/maintenance/links/preview',
        expect.objectContaining({ cleanupType: 'DORMANT' })
      );
      expect(screen.getByText('21 matching URLs found')).toBeInTheDocument();
      expect(screen.getByText('/fp9k9l')).toBeInTheDocument();
    });
  });

  it('triggers Redis cache warm up', async () => {
    (axiosInstance.post as any).mockResolvedValue({
      data: {
        warmedCount: 50,
        message: 'Successfully pre-warmed 50 URLs into Redis'
      }
    });

    render(<AdminMaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Execute Warm-Up')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Execute Warm-Up'));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/admin/maintenance/cache/warm-up',
        { topCount: 50 }
      );
    });
  });
});
