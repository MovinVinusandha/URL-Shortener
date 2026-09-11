import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Link as LinkIcon, 
  Activity, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Database, 
  Cpu, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { AdminOverviewStats } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const AdminOverviewPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const { data } = await axiosInstance.get<AdminOverviewStats>('/admin/overview');
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch admin overview', err);
      if (!isBackground) {
        setError('Failed to load platform overview. Please check connection.');
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
  }, [refreshTrigger]);

  // Smart polling when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    }, 12_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton height={110} borderRadius={16} />
          <Skeleton height={110} borderRadius={16} />
          <Skeleton height={110} borderRadius={16} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height={240} borderRadius={16} />
          <Skeleton height={240} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-8 border border-red-500/20 bg-red-500/10 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const maxDomainCount = stats?.topDomains?.[0]?.count || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── KPI Metrics Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Links Card */}
        <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Links</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {stats?.totalLinks.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats?.activeLinks.toLocaleString()} active
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-500">
                {stats?.quarantinedLinks.toLocaleString()} quarantined
              </span>
            </div>
          </div>
        </div>

        {/* Traffic Volume Card */}
        <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traffic & Clicks</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {stats?.totalClicks.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">+{stats?.clicksLast24Hours.toLocaleString()}</span>
              <span>redirects in last 24h</span>
            </div>
          </div>
        </div>

        {/* User Governance Card */}
        <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User Accounts</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {stats?.totalUsers.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {stats?.activeUsers.toLocaleString()} active
              </span>
              {stats?.suspendedUsers ? (
                <>
                  <span>•</span>
                  <span className="text-red-500 font-medium">{stats?.suspendedUsers} suspended</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── System Health & Top Domains Row ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health Card */}
        <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Infrastructure Health</h2>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>

          <div className="space-y-4">
            {/* Redis Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium text-foreground">Redis In-Memory Cache</div>
                  <div className="text-[11px] text-muted-foreground">Sub-millisecond redirect cache</div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  {stats?.systemHealth?.redisStatus || 'HEALTHY'}
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  RAM: {stats?.systemHealth?.redisMemory || 'Normal'}
                </div>
              </div>
            </div>

            {/* Sweeper Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium text-foreground">Background Sweeper</div>
                  <div className="text-[11px] text-muted-foreground">Automated expiration worker</div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {stats?.systemHealth?.sweeperStatus || 'ACTIVE'}
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">60s interval</div>
              </div>
            </div>

            {/* Quick Actions Links */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/admin/links?status=quarantined"
                className="flex-1 text-center py-2 px-3 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-foreground transition-colors"
              >
                Review Quarantined Links
              </Link>
              <Link
                to="/admin/security"
                className="flex-1 text-center py-2 px-3 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-foreground transition-colors"
              >
                Domain Blacklist
              </Link>
            </div>
          </div>
        </div>

        {/* Top Destination Domains Card */}
        <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Top Destination Domains</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {stats?.topDomains?.length || 0} unique hosts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {(!stats?.topDomains || stats.topDomains.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No destination domains tracked yet.
              </div>
            ) : (
              stats.topDomains.map((item) => {
                const percentage = Math.round((item.count / maxDomainCount) * 100);
                return (
                  <div key={item.domain} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-foreground truncate max-w-[240px]">
                        {item.domain}
                      </span>
                      <span className="font-semibold text-muted-foreground">
                        {item.count.toLocaleString()} {item.count === 1 ? 'link' : 'links'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/70 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
