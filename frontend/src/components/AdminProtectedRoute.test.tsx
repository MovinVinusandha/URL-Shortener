import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminProtectedRoute from './AdminProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AdminProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    (useAuth as any).mockReturnValue({ token: null, user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<AdminProtectedRoute />}>
            <Route path="admin" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects regular USER accounts to /dashboard', () => {
    (useAuth as any).mockReturnValue({
      token: 'valid-token',
      user: { role: 'USER', emailVerified: true },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/dashboard" element={<div>User Dashboard</div>} />
          <Route path="/" element={<AdminProtectedRoute />}>
            <Route path="admin" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('User Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('allows access for users with role ADMIN', () => {
    (useAuth as any).mockReturnValue({
      token: 'valid-token',
      user: { role: 'ADMIN', emailVerified: true },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/dashboard" element={<div>User Dashboard</div>} />
          <Route path="/" element={<AdminProtectedRoute />}>
            <Route path="admin" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('allows access for users with role ROOT', () => {
    (useAuth as any).mockReturnValue({
      token: 'valid-token',
      user: { role: 'ROOT', emailVerified: true },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<AdminProtectedRoute />}>
            <Route path="admin" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
