import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BlockedPage from './BlockedPage';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('BlockedPage', () => {
  it('renders security warning heading and message', () => {
    render(
      <MemoryRouter initialEntries={['/blocked/badhash']}>
        <Routes>
          <Route path="/blocked/:hash" element={<BlockedPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Security Warning: Link Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/\/badhash/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Safe Homepage/i)).toBeInTheDocument();
  });
});
