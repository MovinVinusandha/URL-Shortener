import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSettingsPage from './AdminSettingsPage';
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
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOutletContext as any).mockReturnValue({ refreshTrigger: 0, triggerRefresh: vi.fn() });
    (useAuth as any).mockReturnValue({
      user: { role: 'ROOT', email: 'admin@trim.com' },
    });

    (axiosInstance.get as any).mockImplementation((url: string) => {
      if (url === '/admin/settings') {
        return Promise.resolve({
          data: [
            { settingKey: 'ALLOW_REGISTRATION', settingValue: 'true' },
            { settingKey: 'REQUIRE_EMAIL_VERIFICATION', settingValue: 'true' },
            { settingKey: 'MAX_LINKS_PER_USER', settingValue: '1000' },
            { settingKey: 'PANIC_MODE', settingValue: 'NORMAL' },
            { settingKey: 'DEFAULT_LINK_EXPIRATION_DAYS', settingValue: '0' },
          ],
        });
      }
      if (url === '/admin/settings/vault') {
        return Promise.resolve({
          data: [
            {
              key: 'SPRING_DATASOURCE_URL',
              category: 'DATABASE',
              value: 'jdbc:mysql://mysql:3306/url_shortener',
              isSecret: false,
              source: 'ENV',
              description: 'JDBC connection URL',
            },
            {
              key: 'JWT_SECRET',
              category: 'SECURITY',
              value: 'my-super-secret-key-12345678901234',
              isSecret: true,
              source: 'ENV',
              description: 'HMAC-SHA secret for JWT',
            },
          ],
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders settings page with tabs for ROOT user', async () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('Configuration & Environment Vault')).toBeInTheDocument();
    expect(screen.getByText('Runtime Policies')).toBeInTheDocument();
    expect(screen.getByText('Panic Switch')).toBeInTheDocument();
    expect(screen.getByText('Environment Vault')).toBeInTheDocument();
    expect(screen.getByText('SMTP Diagnostics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Public User Registration')).toBeInTheDocument();
      expect(screen.getByText('Registration Open')).toBeInTheDocument();
    });
  });

  it('navigates to Environment Vault tab and displays masked secrets', async () => {
    render(<AdminSettingsPage />);

    const vaultTab = screen.getByText('Environment Vault');
    fireEvent.click(vaultTab);

    await waitFor(() => {
      expect(screen.getByText('SPRING_DATASOURCE_URL')).toBeInTheDocument();
      expect(screen.getByText('JWT_SECRET')).toBeInTheDocument();
    });

    // JWT_SECRET should be masked with bullets
    expect(screen.getByText('••••••••••••••••••••')).toBeInTheDocument();
  });

  it('navigates to Panic Switch tab and allows setting lockdown', async () => {
    (axiosInstance.put as any).mockResolvedValue({ data: {} });

    render(<AdminSettingsPage />);

    const panicTab = screen.getByText('Panic Switch');
    fireEvent.click(panicTab);

    expect(screen.getByText('Root Emergency Lockdown Control')).toBeInTheDocument();
    expect(screen.getByText('Read-Only Lockdown')).toBeInTheDocument();
    expect(screen.getByText('Full Maintenance')).toBeInTheDocument();

    const readOnlyOption = screen.getByText('Read-Only Lockdown');
    fireEvent.click(readOnlyOption);

    expect(axiosInstance.put).toHaveBeenCalledWith(
      '/admin/settings/PANIC_MODE',
      expect.objectContaining({ settingValue: 'READ_ONLY' })
    );
  });
});
