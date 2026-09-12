import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import MaintenancePage from './MaintenancePage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../api/axiosInstance';
import React from 'react';

vi.mock('../api/axiosInstance');

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders maintenance heading, icon, and check system status button', () => {
    render(
      <BrowserRouter>
        <MaintenancePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Platform Maintenance in Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Under Maintenance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check System Status/i })).toBeInTheDocument();
  });

  it('displays target hash when accessed via parameterized URL', () => {
    render(
      <MemoryRouter initialEntries={['/maintenance/promo2026']}>
        <Routes>
          <Route path="/maintenance/:hash" element={<MaintenancePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/promo2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Identifier:/i)).toBeInTheDocument();
  });

  it('handles check maintenance status button click and displays status result and visit link targeting root domain', async () => {
    (axiosInstance.get as any).mockResolvedValueOnce({
      data: {
        systemMode: 'NORMAL',
        allowRegistration: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/maintenance/test123']}>
        <Routes>
          <Route path="/maintenance/:hash" element={<MaintenancePage />} />
        </Routes>
      </MemoryRouter>
    );

    const checkBtn = screen.getByRole('button', { name: /Check System Status/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Platform is Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Mode: NORMAL/i)).toBeInTheDocument();
      const visitLink = screen.getByRole('link', { name: /Visit Link/i });
      expect(visitLink).toBeInTheDocument();
      expect(visitLink.getAttribute('href')).toContain('/test123');
    });
  });
});
