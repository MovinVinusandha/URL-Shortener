import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart2, 
  Link as LinkIcon, 
  Users, 
  ShieldAlert, 
  SlidersHorizontal, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Monitor, 
  Shield,
  RefreshCw,
  FileText,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from '../components/BrandLogo';

export interface AdminLayoutContext {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const isRoot = user?.role === 'ROOT' || user?.role === 'ROLE_ROOT';

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { to: '/admin', label: 'Overview', icon: BarChart2, end: true },
    { to: '/admin/links', label: 'Links & Moderation', icon: LinkIcon, end: false },
    { to: '/admin/users', label: 'User Directory', icon: Users, end: false },
    { to: '/admin/security', label: 'Security & Blacklist', icon: ShieldAlert, end: false },
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: FileText, end: false },
    { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench, end: false },
    ...(isRoot ? [{ to: '/admin/settings', label: 'Live Settings', icon: SlidersHorizontal, end: false, isRootOnly: true }] : [])
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground font-sans">
      {/* ── Admin Sidebar ───────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-background border-r border-border flex flex-col z-30">
        {/* Brand & Portal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div 
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/admin')}
          >
            <BrandLogo className="w-7 h-7 text-foreground" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-foreground">Trim</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-emerald-500" /> Admin Console
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            isRoot 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
              : 'bg-primary/10 text-primary border-primary/20'
          }`}>
            {isRoot ? 'ROOT' : 'ADMIN'}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-secondary text-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.isRootOnly && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500">
                    ROOT
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Utility Bar */}
        <div className="p-3 border-t border-border flex flex-col gap-2">
          {/* Theme & User Profile Mini-Bar */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold uppercase border border-border">
                {user?.username ? user.username.charAt(0) : 'A'}
              </div>
              <span className="text-xs text-muted-foreground truncate">{user?.username || user?.email}</span>
            </div>

            <div className="relative" ref={themeMenuRef}>
              <button 
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Switch Theme"
              >
                {theme === 'system' ? <Monitor className="w-3.5 h-3.5" /> : theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {isThemeMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 bottom-full mb-2 bg-background border border-border shadow-lg rounded-xl w-28 p-1 flex flex-col gap-0.5 z-50"
                  >
                    <button
                      onClick={() => { setTheme('light'); setIsThemeMenuOpen(false); }}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded-lg transition-colors w-full text-left ${theme === 'light' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      <Sun className="w-3 h-3" /> Light
                    </button>
                    <button
                      onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded-lg transition-colors w-full text-left ${theme === 'dark' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      <Moon className="w-3 h-3" /> Dark
                    </button>
                    <button
                      onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded-lg transition-colors w-full text-left ${theme === 'system' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      <Monitor className="w-3 h-3" /> System
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Exit to App Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-border/80 transition-colors"
            title="Return to your personal workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to App</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              {location.pathname === '/admin' && 'Platform Overview'}
              {location.pathname.startsWith('/admin/links') && 'Global Link Moderation'}
              {location.pathname.startsWith('/admin/users') && 'User Governance'}
              {location.pathname.startsWith('/admin/security') && 'Security & Domain Blacklist'}
              {location.pathname.startsWith('/admin/audit-logs') && 'Immutable Audit Trail'}
              {location.pathname.startsWith('/admin/maintenance') && 'System Maintenance & Retention'}
              {location.pathname.startsWith('/admin/settings') && 'Runtime System Configuration'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-border transition-colors disabled:opacity-50"
              title="Refresh current view"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Dynamic Outlet with layout context */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ refreshTrigger, triggerRefresh } satisfies AdminLayoutContext} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
