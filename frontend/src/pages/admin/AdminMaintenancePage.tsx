import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Wrench, 
  Database, 
  Zap, 
  Trash2, 
  RefreshCw, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  Info,
  Layers,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axiosInstance from '../../api/axiosInstance';
import type { MaintenanceOverview, CleanupResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import CustomSelect from '../../components/CustomSelect';

const AdminMaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const isRoot = user?.role === 'ROOT' || user?.role === 'ROLE_ROOT';
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();

  const [overview, setOverview] = useState<MaintenanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache Actions State
  const [evictKeyInput, setEvictKeyInput] = useState('');
  const [isEvictingKey, setIsEvictingKey] = useState(false);
  const [isFlushingUrls, setIsFlushingUrls] = useState(false);
  const [isFlushingAll, setIsFlushingAll] = useState(false);
  const [warmUpCount, setWarmUpCount] = useState(50);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Link Garbage Collection State
  const [cleanupType, setCleanupType] = useState<'EXPIRED' | 'INACTIVE' | 'DORMANT'>('DORMANT');
  const [daysThreshold, setDaysThreshold] = useState<number>(30);
  const [hardDelete, setHardDelete] = useState(false);
  const [linkCleanupResult, setLinkCleanupResult] = useState<CleanupResult | null>(null);
  const [isLinkActionLoading, setIsLinkActionLoading] = useState(false);

  // Click Pruning State
  const [clickDaysOlderThan, setClickDaysOlderThan] = useState<number>(90);
  const [clickPruneResult, setClickPruneResult] = useState<CleanupResult | null>(null);
  const [isClickActionLoading, setIsClickActionLoading] = useState(false);

  // Active Tab
  const [activeSection, setActiveSection] = useState<'CACHE' | 'LINKS' | 'CLICKS' | 'STORAGE'>('CACHE');

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get<MaintenanceOverview>('/admin/maintenance/overview');
      setOverview(data);
    } catch (err: any) {
      toast.error('Failed to load maintenance telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [refreshTrigger]);

  // ── Cache Actions ────────────────────────────────────────────────────────
  const handleEvictKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evictKeyInput.trim()) return;
    try {
      setIsEvictingKey(true);
      const { data } = await axiosInstance.post('/admin/maintenance/cache/evict-key', { key: evictKeyInput.trim() });
      toast.success(data.message || 'Key evicted successfully');
      setEvictKeyInput('');
      fetchOverview();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to evict key');
    } finally {
      setIsEvictingKey(false);
    }
  };

  const handleFlushUrls = async () => {
    if (!window.confirm('Are you sure you want to flush all short URL cache keys (urls::*)?')) return;
    try {
      setIsFlushingUrls(true);
      const { data } = await axiosInstance.post('/admin/maintenance/cache/flush-urls');
      toast.success(data.message || 'URL cache cleared');
      fetchOverview();
    } catch (err: any) {
      toast.error('Failed to flush URL cache');
    } finally {
      setIsFlushingUrls(false);
    }
  };

  const handleFlushAll = async () => {
    if (!window.confirm('DANGER: This will flush the entire Redis database (FLUSHDB). All cached sessions and temporary data will be purged. Proceed?')) return;
    try {
      setIsFlushingAll(true);
      const { data } = await axiosInstance.post('/admin/maintenance/cache/flush-all');
      toast.success(data.message || 'Entire Redis cache purged');
      fetchOverview();
    } catch (err: any) {
      toast.error('Failed to purge Redis cache');
    } finally {
      setIsFlushingAll(false);
    }
  };

  const handleWarmUp = async () => {
    try {
      setIsWarmingUp(true);
      const { data } = await axiosInstance.post('/admin/maintenance/cache/warm-up', { topCount: warmUpCount });
      toast.success(data.message || 'Cache pre-warmed successfully');
      fetchOverview();
    } catch (err: any) {
      toast.error('Failed to pre-warm cache');
    } finally {
      setIsWarmingUp(false);
    }
  };

  // ── Link Garbage Collection ──────────────────────────────────────────────
  const handlePreviewLinkCleanup = async () => {
    try {
      setIsLinkActionLoading(true);
      const payload = { cleanupType, daysThreshold, hardDelete };
      const { data } = await axiosInstance.post<CleanupResult>('/admin/maintenance/links/preview', payload);
      setLinkCleanupResult(data);
    } catch (err: any) {
      toast.error('Failed to preview link cleanup');
    } finally {
      setIsLinkActionLoading(false);
    }
  };

  const handleExecuteLinkCleanup = async () => {
    const actionName = hardDelete ? 'PERMANENTLY DELETE' : 'DEACTIVATE';
    if (!window.confirm(`Are you sure you want to ${actionName} matching links? This action will be audited.`)) return;
    try {
      setIsLinkActionLoading(true);
      const payload = { cleanupType, daysThreshold, hardDelete };
      const { data } = await axiosInstance.post<CleanupResult>('/admin/maintenance/links/cleanup', payload);
      setLinkCleanupResult(data);
      toast.success(data.message || 'Cleanup completed');
      fetchOverview();
    } catch (err: any) {
      toast.error('Failed to execute link cleanup');
    } finally {
      setIsLinkActionLoading(false);
    }
  };

  // ── Click Pruning ────────────────────────────────────────────────────────
  const handlePreviewClickPruning = async () => {
    try {
      setIsClickActionLoading(true);
      const payload = { daysOlderThan: clickDaysOlderThan, dryRun: true };
      const { data } = await axiosInstance.post<CleanupResult>('/admin/maintenance/clicks/preview', payload);
      setClickPruneResult(data);
    } catch (err: any) {
      toast.error('Failed to preview click pruning');
    } finally {
      setIsClickActionLoading(false);
    }
  };

  const handleExecuteClickPruning = async () => {
    if (!window.confirm(`DANGER: Are you sure you want to permanently prune click events older than ${clickDaysOlderThan} days? Aggregate URL stats remain safe.`)) return;
    try {
      setIsClickActionLoading(true);
      const payload = { daysOlderThan: clickDaysOlderThan, dryRun: false };
      const { data } = await axiosInstance.post<CleanupResult>('/admin/maintenance/clicks/prune', payload);
      setClickPruneResult(data);
      toast.success(data.message || 'Click events pruned successfully');
      fetchOverview();
    } catch (err: any) {
      toast.error('Failed to prune click events');
    } finally {
      setIsClickActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
              <Wrench className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                System Maintenance & Data Retention
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                In-memory Redis cache hygiene, dormant link garbage collection, and raw click event archival
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchOverview}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          Refresh Metrics
        </button>
      </div>

      {/* ── Telemetry Health Cards ───────────────────────────────────── */}
      {isLoading && !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} height={100} className="rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Redis Memory */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Redis Memory</span>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                <Activity className="w-3 h-3 text-emerald-500" /> v{overview?.redisVersion || '7.x'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {overview?.usedMemoryHuman || '0B'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Peak: <span className="font-mono text-foreground">{overview?.peakMemoryHuman || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Cached URLs */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">URL Cache Keys</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                urls::*
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {overview?.urlKeysCount?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Total Keys: <span className="font-mono text-foreground">{overview?.totalKeys?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Cache Hit Ratio */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cache Hit Ratio</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                Keyspace
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {overview?.hitRatioPercentage || 0}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Hits: {overview?.keyspaceHits?.toLocaleString()} | Misses: {overview?.keyspaceMisses?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Total DB Size */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Database Storage</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                MySQL 8.0
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {overview?.totalDatabaseSizeMb || 0} MB
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Across {overview?.tables?.length || 0} relational tables
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Navigation Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-secondary/40 border border-border rounded-xl w-fit">
        {[
          { id: 'CACHE', label: 'Cache Sweeper', icon: Zap },
          { id: 'LINKS', label: 'Dormant Link Garbage Collector', icon: Trash2 },
          { id: 'CLICKS', label: 'Click Retention', icon: Clock },
          { id: 'STORAGE', label: 'Database Storage', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeSection === 'CACHE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cache Pre-Warm */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cache Warm-Up Engine</h3>
                <p className="text-xs text-muted-foreground">Pre-populate Redis with top-performing links to prevent cold cache latency</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border text-xs text-muted-foreground leading-relaxed">
              Queries the highest accessed active URLs from MySQL and inserts them directly into Redis with standard TTL.
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="text-xs font-medium text-foreground whitespace-nowrap">Warm Top URLs:</label>
              <CustomSelect
                value={warmUpCount}
                onChange={val => setWarmUpCount(Number(val))}
                options={[
                  { value: 20, label: 'Top 20 URLs' },
                  { value: 50, label: 'Top 50 URLs' },
                  { value: 100, label: 'Top 100 URLs' },
                  { value: 250, label: 'Top 250 URLs' },
                ]}
                className="w-40 font-mono"
              />

              <button
                onClick={handleWarmUp}
                disabled={isWarmingUp}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Flame className={`w-3.5 h-3.5 ${isWarmingUp ? 'animate-bounce' : ''}`} />
                {isWarmingUp ? 'Warming...' : 'Execute Warm-Up'}
              </button>
            </div>
          </div>

          {/* Selective Key Eviction */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Single Key Eviction</h3>
                <p className="text-xs text-muted-foreground">Targeted invalidation for a specific short hash or Redis cache key</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Remove cached metadata immediately if a target redirect was modified or requires immediate cache refresh.
            </p>

            <form onSubmit={handleEvictKey} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="e.g. abcd12 or urls::abcd12"
                value={evictKeyInput}
                onChange={e => setEvictKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                type="submit"
                disabled={isEvictingKey || !evictKeyInput.trim()}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                {isEvictingKey ? 'Evicting...' : 'Evict Key'}
              </button>
            </form>
          </div>

          {/* URL Bulk Flush */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Flush URL Cache (`urls::*`)</h3>
                  <p className="text-xs text-muted-foreground">Evicts all cached short link mappings without affecting active user sessions</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Useful when updating routing domain configurations or clearing stale redirects en masse.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleFlushUrls}
                disabled={isFlushingUrls}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingUrls ? 'animate-spin' : ''}`} />
                Flush All URL Caches
              </button>
            </div>
          </div>

          {/* Full Redis Flush (ROOT Only) */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Purge Entire Redis Store (FLUSHDB)
                    {!isRoot && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Root Required
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">Destructive operational action that empties the entire selected Redis database</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Warning: All cached tokens, link lookups, and active connection state will be dropped immediately.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleFlushAll}
                disabled={!isRoot || isFlushingAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isFlushingAll ? 'Purging...' : 'Flush Entire Redis DB'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'LINKS' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Dormant & Expired Link Garbage Collector</h3>
                <p className="text-xs text-muted-foreground">Scan and safely clean up dead, expired, or zero-activity short URLs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Cleanup Type Selection */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Target Link Category</label>
                <CustomSelect
                  value={cleanupType}
                  onChange={val => setCleanupType(val as any)}
                  options={[
                    { value: 'DORMANT', label: 'Dormant (0 Clicks & Inactive)' },
                    { value: 'EXPIRED', label: 'Expired (expiresAt < Now)' },
                    { value: 'INACTIVE', label: 'Deactivated Links' },
                  ]}
                  size="md"
                  className="w-full"
                />
              </div>

              {/* Days Inactive */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Inactivity Age Threshold</label>
                <CustomSelect
                  value={daysThreshold}
                  onChange={val => setDaysThreshold(Number(val))}
                  options={[
                    { value: 7, label: 'Older than 7 days' },
                    { value: 30, label: 'Older than 30 days' },
                    { value: 90, label: 'Older than 90 days' },
                    { value: 180, label: 'Older than 180 days' },
                    { value: 365, label: 'Older than 365 days (1 Year)' },
                  ]}
                  size="md"
                  className="w-full"
                />
              </div>

              {/* Action Mode */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Purge Method</label>
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="purgeMode"
                      checked={!hardDelete}
                      onChange={() => setHardDelete(false)}
                      className="accent-primary"
                    />
                    Soft Deactivate
                  </label>
                  <label className="flex items-center gap-2 text-xs text-red-500 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="purgeMode"
                      checked={hardDelete}
                      onChange={() => setHardDelete(true)}
                      className="accent-red-500"
                    />
                    Hard Delete
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={handlePreviewLinkCleanup}
                disabled={isLinkActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                Dry-Run Preview
              </button>

              <button
                onClick={handleExecuteLinkCleanup}
                disabled={isLinkActionLoading}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  hardDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {hardDelete ? 'Execute Hard Purge' : 'Execute Deactivation'}
              </button>
            </div>
          </div>

          {/* Preview Results Banner */}
          {linkCleanupResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {linkCleanupResult.dryRun ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                      Dry-Run Preview
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Executed
                    </span>
                  )}
                  <span className="text-xs font-semibold text-foreground">
                    {linkCleanupResult.affectedCount} matching URLs found
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(linkCleanupResult.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{linkCleanupResult.message}</p>

              {linkCleanupResult.sampleAffectedUrls && linkCleanupResult.sampleAffectedUrls.length > 0 && (
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Sample Matched Hashes:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {linkCleanupResult.sampleAffectedUrls.map(hash => (
                      <span key={hash} className="text-xs font-mono px-2 py-0.5 rounded bg-secondary border border-border text-foreground">
                        /{hash}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {activeSection === 'CLICKS' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">High-Volume Click Events Pruning</h3>
                <p className="text-xs text-muted-foreground">Reclaim disk space by pruning old granular click event logs while keeping aggregate URL statistics accurate</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Info className="w-4 h-4 text-primary shrink-0" />
                Zero Analytics Loss for Summary Counters
              </div>
              <p>
                Total click counts displayed on user dashboards and link tables are stored in the <span className="font-mono text-foreground">statistics</span> table and will <strong>not</strong> be diminished. Only raw device/browser/IP telemetry older than the selected threshold will be pruned.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <div className="w-full sm:w-auto">
                <label className="text-xs font-medium text-foreground block mb-1.5">Pruning Age Threshold</label>
                <CustomSelect
                  value={clickDaysOlderThan}
                  onChange={val => setClickDaysOlderThan(Number(val))}
                  options={[
                    { value: 30, label: 'Older than 30 days' },
                    { value: 60, label: 'Older than 60 days' },
                    { value: 90, label: 'Older than 90 days (Recommended)' },
                    { value: 180, label: 'Older than 180 days' },
                    { value: 365, label: 'Older than 365 days (1 Year)' },
                  ]}
                  size="md"
                  className="w-full sm:w-64 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 sm:ml-auto sm:mt-5">
                <button
                  onClick={handlePreviewClickPruning}
                  disabled={isClickActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  Preview Candidates
                </button>

                <button
                  onClick={handleExecuteClickPruning}
                  disabled={isClickActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Execute Click Prune
                </button>
              </div>
            </div>
          </div>

          {/* Click Prune Results Banner */}
          {clickPruneResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {clickPruneResult.dryRun ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                      Dry-Run Preview
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Pruned
                    </span>
                  )}
                  <span className="text-xs font-semibold text-foreground">
                    {clickPruneResult.affectedCount} raw click event records
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(clickPruneResult.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{clickPruneResult.message}</p>
            </motion.div>
          )}
        </div>
      )}

      {activeSection === 'STORAGE' && (
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-secondary text-foreground border border-border">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Relational Storage Telemetry</h3>
                <p className="text-xs text-muted-foreground">Disk space breakdown by table in the MySQL <span className="font-mono text-foreground">url_shortener</span> database</p>
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-foreground">
              Total: {overview?.totalDatabaseSizeMb || 0} MB
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
                  <th className="py-2.5 px-4">Table Name</th>
                  <th className="py-2.5 px-4 text-right">Row Count</th>
                  <th className="py-2.5 px-4 text-right">Size (MB)</th>
                  <th className="py-2.5 px-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {overview?.tables && overview.tables.length > 0 ? (
                  overview.tables.map(tbl => {
                    const pct = overview.totalDatabaseSizeMb > 0
                      ? ((tbl.sizeMb / overview.totalDatabaseSizeMb) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={tbl.tableName} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-2.5 px-4 text-foreground font-sans font-medium flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-muted-foreground" />
                          {tbl.tableName}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">
                          {tbl.rowCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-2.5 px-4 text-right text-foreground font-semibold">
                          {tbl.sizeMb.toFixed(3)} MB
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground font-sans">
                      No table metrics available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenancePage;
