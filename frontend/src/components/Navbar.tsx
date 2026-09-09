import React from 'react';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';

const Navbar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* ── Brand ─────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-7 w-auto text-foreground" />
          </Link>

          {/* ── Right side ────────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {/* Theme toggle — always visible */}
            <ThemeToggle />

            {token ? (
              /* ── Authenticated state ── */
              <>
                {/* User info (desktop) */}
                {user && (
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground text-xs font-bold flex-shrink-0">
                      {(user.username || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-foreground text-sm font-medium">{user.username || user.email}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </div>
                  </div>
                )}

                {/* Dashboard link */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                {/* Logout */}
                <button
                  id="logout-button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground border border-border hover:bg-secondary rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              /* ── Guest state ── */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium px-3 py-2 rounded-lg transition-colors hover:bg-secondary"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-solid py-2 px-4"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
