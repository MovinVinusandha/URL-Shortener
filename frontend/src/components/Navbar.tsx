import React from 'react';
import { Link2, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* ── Brand ─────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white font-bold text-lg tracking-tight">
              Snip<span className="text-violet-500 dark:text-violet-400">URL</span>
            </span>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-slate-900 dark:text-white text-sm font-medium">{user.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{user.email}</span>
                    </div>
                  </div>
                )}

                {/* Dashboard link */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm font-medium transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                {/* Logout */}
                <button
                  id="logout-button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary py-2 px-4"
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
