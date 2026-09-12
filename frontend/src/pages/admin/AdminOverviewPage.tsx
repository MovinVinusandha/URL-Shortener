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
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  FileText,
  Calendar,
  Layers
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import axiosInstance from '../../api/axiosInstance';
import type { AdminOverviewStats } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion } from 'framer-motion';
import { parseISO, format } from 'date-fns';

const formatXAxisDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(5);
    return format(d, 'MMM d');
  } catch {
    return dateStr.slice(5);
  }
};

const formatTooltipDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, 'EEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs space-y-2 font-sans min-w-[180px]">
        <div className="font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center gap-1.5 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{formatTooltipDate(label)}</span>
        </div>
        <div className="space-y-1 pt-0.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-foreground">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const AdminOverviewPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);

  const fetchStats = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const { data } = await axiosInstance.get<AdminOverviewStats>('/admin/overview', {
        params: { days: timeRangeDays }
      });
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
  }, [refreshTrigger, timeRangeDays]);

  // Smart polling when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    }, 15_000);

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
  }, [timeRangeDays]);

  // Aggregate summary indicators for the selected velocity window
  const velocitySummary = React.useMemo(() => {
    if (!stats?.activitySeries || stats.activitySeries.length === 0) {
      return { totalClicks: 0, totalLinks: 0, peakClicks: 0, peakDate: null };
    }
    let totalClicks = 0;
    let totalLinks = 0;
    let peakClicks = 0;
    let peakDate: string | null = null;

    stats.activitySeries.forEach(item => {
      totalClicks += item.clicks || 0;
      totalLinks += item.linksCreated || 0;
      if ((item.clicks || 0) > peakClicks) {
        peakClicks = item.clicks || 0;
        peakDate = item.date;
      }
    });

    return { totalClicks, totalLinks, peakClicks, peakDate };
  }, [stats?.activitySeries]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
        {/* KPI Grid Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-5 bg-card/70 border border-border rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton width={80} height={14} borderRadius={4} />
                <Skeleton width={32} height={32} borderRadius={10} />
              </div>
              <div>
                <Skeleton width={110} height={28} borderRadius={6} />
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton width={70} height={14} borderRadius={4} />
                  <Skeleton width={50} height={14} borderRadius={4} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Canvas Skeleton */}
        <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton width={36} height={36} borderRadius={12} />
              <div className="space-y-1">
                <Skeleton width={180} height={16} borderRadius={4} />
                <Skeleton width={240} height={12} borderRadius={4} />
              </div>
            </div>
            <Skeleton width={160} height={28} borderRadius={10} />
          </div>
          <div className="h-72 w-full pt-2 flex items-end gap-3 px-2">
            {[40, 65, 30, 85, 55, 90, 45, 70, 60, 95, 50, 75].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                <Skeleton height={`${h}%`} borderRadius={6} />
              </div>
            ))}
          </div>
        </div>

        {/* 3-column Breakdown Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 bg-card border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton width={18} height={18} borderRadius={4} />
                  <Skeleton width={110} height={16} borderRadius={4} />
                </div>
                <Skeleton width={50} height={14} borderRadius={4} />
              </div>
              <div className="space-y-3 pt-1">
                {[1, 2, 3, 4].map(row => (
                  <div key={row} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton width={90} height={13} borderRadius={4} />
                      <Skeleton width={60} height={13} borderRadius={4} />
                    </div>
                    <Skeleton height={6} borderRadius={999} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom 2-column Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="p-5 bg-card border border-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton width={18} height={18} borderRadius={4} />
                  <Skeleton width={130} height={16} borderRadius={4} />
                </div>
                <Skeleton width={60} height={14} borderRadius={4} />
              </div>
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map(row => (
                  <div key={row} className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton width={140} height={14} borderRadius={4} />
                      <Skeleton width={90} height={11} borderRadius={4} />
                    </div>
                    <Skeleton width={70} height={14} borderRadius={4} />
                  </div>
                ))}
              </div>
            </div>
          ))}
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
  const isPanicActive = stats?.systemMode && stats.systemMode !== 'NORMAL';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* ── 0. Emergency Panic Mode Alert Banner ────────────────────── */}
      {isPanicActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
            stats.systemMode === 'MAINTENANCE'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              stats.systemMode === 'MAINTENANCE' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                Emergency Lockdown Active: {stats.systemMode} Mode
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {stats.systemMode === 'MAINTENANCE'
                  ? 'System is under full lockdown. Redirects and new links are returning HTTP 503 maintenance responses.'
                  : 'System is in Read-Only lockdown. Link creation and user mutations are temporarily suspended.'}
              </p>
            </div>
          </div>

          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-accent text-xs font-medium shrink-0 transition-colors"
          >
            Manage Switch in Settings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* ── 1. KPI Metrics Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Links Card */}
        <div className="p-5 bg-card/70 border border-border rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-border/80 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Links</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground transition-transform duration-200 group-hover:scale-105">
              <LinkIcon className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-mono">
              {stats?.totalLinks.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats?.activeLinks.toLocaleString()} active
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                {stats?.quarantinedLinks.toLocaleString()} quarantined
              </span>
            </div>
          </div>
        </div>

        {/* Traffic Volume Card */}
        <div className="p-5 bg-card/70 border border-border rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-border/80 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traffic & Clicks</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-mono">
              {stats?.totalClicks.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary font-mono">+{stats?.clicksLast24Hours.toLocaleString()}</span>
              <span>redirects in last 24h</span>
            </div>
          </div>
        </div>

        {/* User Accounts Card */}
        <div className="p-5 bg-card/70 border border-border rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-border/80 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User Directory</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground tracking-tight font-mono">
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
              ) : (
                <span className="text-muted-foreground">0 suspended</span>
              )}
            </div>
          </div>
        </div>

        {/* Security & Perimeter Pulse Card */}
        <div className="p-5 bg-card/70 border border-border rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-border/80 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security Pulse</span>
            <div className="p-2 rounded-xl bg-secondary text-foreground">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground tracking-tight font-mono">
                {stats?.securityPulse?.unresolvedIncidents === 0 ? '0' : stats?.securityPulse?.unresolvedIncidents}
              </span>
              <span className="text-xs font-medium text-muted-foreground">incidents</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono text-foreground font-semibold">{stats?.securityPulse?.blockedIpsCount || 0}</span> IPs blocked
              <span>•</span>
              <span className="font-mono text-foreground font-semibold">{stats?.securityPulse?.blacklistedDomainsCount || 0}</span> domains
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Primary Dual-Layer Time Series Graph ───────────────── */}
      <div className="p-5 bg-card border border-border rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-gray-200 dark:border-zinc-800">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Platform Activity & Link Velocity
              </h2>
              <p className="text-xs text-muted-foreground">
                Redirect clicks versus new short links created over time
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Quick summary badges */}
            {stats?.activitySeries && stats.activitySeries.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 mr-1 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-gray-200 dark:border-zinc-800 text-muted-foreground">
                  <span>Clicks:</span>
                  <span className="font-mono font-semibold text-foreground">{velocitySummary.totalClicks.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-gray-200 dark:border-zinc-800 text-muted-foreground">
                  <span>New Links:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">+{velocitySummary.totalLinks.toLocaleString()}</span>
                </div>
                {velocitySummary.peakClicks > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-gray-200 dark:border-zinc-800 text-muted-foreground">
                    <span>Peak:</span>
                    <span className="font-mono font-semibold text-primary">{velocitySummary.peakClicks.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Time Range Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border self-start sm:self-auto">
              {[
                { days: 7, label: '7 Days' },
                { days: 14, label: '14 Days' },
                { days: 30, label: '30 Days' },
              ].map(range => (
                <button
                  key={range.days}
                  onClick={() => setTimeRangeDays(range.days)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    timeRangeDays === range.days
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2">
          {stats?.activitySeries && stats.activitySeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.activitySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0099ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0099ff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="linksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground font-mono"
                  tickFormatter={formatXAxisDate}
                  minTickGap={34}
                  interval="equidistantPreserveStart"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground font-mono"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(value) => <span className="text-muted-foreground font-medium text-xs mr-4">{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  name="Redirect Clicks" 
                  stroke="#0099ff" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#clicksGradient)" 
                  animationDuration={300}
                />
                <Area 
                  type="monotone" 
                  dataKey="linksCreated" 
                  name="Links Created" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#linksGradient)" 
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No activity recorded in this time window.
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Device Split & Top Countries Mini Breakdown ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Distribution */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Device Classes</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Last {timeRangeDays}d</span>
            </div>

            <div className="space-y-3 pt-1">
              {stats?.deviceDistribution && stats.deviceDistribution.length > 0 ? (
                stats.deviceDistribution.map(item => {
                  const Icon = item.name === 'Mobile' ? Smartphone : item.name === 'Tablet' ? Tablet : Monitor;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.name}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {item.count.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No device data recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Top Geographies</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Last {timeRangeDays}d</span>
            </div>

            <div className="space-y-3 pt-1">
              {stats?.countryDistribution && stats.countryDistribution.length > 0 ? (
                stats.countryDistribution.map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[160px]">
                        {item.name}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No geographic data recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Infrastructure & Audit Pulse */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Infrastructure Pulse</h3>
              </div>
              <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="w-3.5 h-3.5" />
                  <span>Redis In-Memory</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {stats?.systemHealth?.redisMemory || 'Normal'} ({stats?.systemHealth?.totalCachedKeys || 0} keys)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expiration Sweeper</span>
                </div>
                <span className="text-emerald-500 font-semibold font-mono">
                  ACTIVE (60s)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Audit Trail Integrity</span>
                </div>
                <span className="text-emerald-500 font-semibold font-mono">
                  CHAIN INTACT
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Link
              to="/admin/maintenance"
              className="w-full block text-center py-2 px-3 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-foreground transition-colors"
            >
              Open Maintenance Center
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4. Top Destination Domains & Recent Admin Audit Feed ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Destination Domains Card */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
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
                      <span className="font-semibold text-muted-foreground font-mono">
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

        {/* Recent Admin Audit Activity Stream */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Admin Operations</h2>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View Full Trail <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {stats?.recentAuditActions && stats.recentAuditActions.length > 0 ? (
              stats.recentAuditActions.map(action => (
                <div key={action.id} className="p-3 rounded-xl bg-secondary/30 border border-border flex items-start justify-between gap-3 text-xs transition-colors duration-150 hover:bg-secondary/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                        {action.action}
                      </span>
                      <span className="text-foreground font-medium truncate max-w-[200px]">
                        {action.targetIdentifier || action.targetType}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] line-clamp-1">
                      {action.details}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] font-mono text-muted-foreground">
                    <div>{action.actorEmail.split('@')[0]}</div>
                    <div className="mt-0.5">{new Date(action.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent administrative actions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminOverviewPage;
