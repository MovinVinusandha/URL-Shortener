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
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axiosInstance from '../../api/axiosInstance';
import type { MaintenanceOverview, CleanupResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';

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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wrench className="w-5 h-5" />
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Redis Memory</span>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Activity className="w-3 h-3" /> v{overview?.redisVersion || '7.x'}
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
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">URL Cache Keys</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
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
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cache Hit Ratio</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Database Storage</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
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
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: 'CACHE', label: 'Cache Sweeper & Warm-Up', icon: Zap },
          { id: 'LINKS', label: 'Dormant Link Garbage Collector', icon: Trash2 },
          { id: 'CLICKS', label: 'Click Events Data Retention', icon: Clock },
          { id: 'STORAGE', label: 'Database Storage Breakdown', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cache Pre-Warm */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cache Warm-Up Engine</h3>
                <p className="text-xs text-muted-foreground">Pre-populate Redis with top-performing links to prevent initial cache misses</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-accent/30 border border-border/50 text-xs text-muted-foreground">
              Queries the highest accessed active URLs from the database and inserts them directly into Redis with standard TTL.
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-foreground whitespace-nowrap">Warm Top URLs:</label>
              <select
                value={warmUpCount}
                onChange={e => setWarmUpCount(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
              >
                <option value={20}>Top 20 URLs</option>
                <option value={50}>Top 50 URLs</option>
                <option value={100}>Top 100 URLs</option>
                <option value={250}>Top 250 URLs</option>
              </select>

              <button
                onClick={handleWarmUp}
                disabled={isWarmingUp}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Flame className={`w-3.5 h-3.5 ${isWarmingUp ? 'animate-bounce' : ''}`} />
                {isWarmingUp ? 'Warming...' : 'Execute Warm-Up'}
              </button>
            </div>
          </div>

          {/* Selective Key Eviction */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Single Key Eviction</h3>
                <p className="text-xs text-muted-foreground">Targeted invalidation for a specific short hash or cache key</p>
              </div>
            </div>

            <form onSubmit={handleEvictKey} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. abcd12 or urls::abcd12"
                value={evictKeyInput}
                onChange={e => setEvictKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isEvictingKey || !evictKeyInput.trim()}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isEvictingKey ? 'Evicting...' : 'Evict Key'}
              </button>
            </form>
          </div>

          {/* URL Bulk Flush */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Flush URL Cache (`urls::*`)</h3>
                <p className="text-xs text-muted-foreground">Evicts all cached short link mappings without affecting active user sessions</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Useful when updating routing domain configurations or clearing stale redirects en masse.
            </p>

            <button
              onClick={handleFlushUrls}
              disabled={isFlushingUrls}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushingUrls ? 'animate-spin' : ''}`} />
              Flush All URL Caches
            </button>
          </div>

          {/* Full Redis Flush (ROOT Only) */}
          <div className={`p-5 rounded-xl border bg-card shadow-sm space-y-4 ${
            isRoot ? 'border-red-500/30' : 'border-border opacity-70'
          }`}>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Purge Entire Redis Store (FLUSHDB)
                  {!isRoot && (
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                      Root Required
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Destructive operational action that empties the entire selected Redis database</p>
              </div>
            </div>

            <p className="text-xs text-red-500/80">
              Warning: All cached tokens, link lookups, and active connection state will be dropped immediately.
            </p>

            <button
              onClick={handleFlushAll}
              disabled={!isRoot || isFlushingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isFlushingAll ? 'Purging...' : 'Flush Entire Redis DB'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'LINKS' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trash2 className="w-4 h-4" />
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
                <select
                  value={cleanupType}
                  onChange={e => setCleanupType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="DORMANT">Dormant (0 Clicks & Inactive)</option>
                  <option value="EXPIRED">Expired (expiresAt &lt; Now)</option>
                  <option value="INACTIVE">Deactivated Links</option>
                </select>
              </div>

              {/* Days Inactive */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Inactivity Age Threshold</label>
                <select
                  value={daysThreshold}
                  onChange={e => setDaysThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value={7}>Older than 7 days</option>
                  <option value={30}>Older than 30 days</option>
                  <option value={90}>Older than 90 days</option>
                  <option value={180}>Older than 180 days</option>
                  <option value={365}>Older than 365 days (1 Year)</option>
                </select>
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Dry-Run Preview
              </button>

              <button
                onClick={handleExecuteLinkCleanup}
                disabled={isLinkActionLoading}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  hardDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
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
              className="p-4 rounded-xl border border-border bg-card/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {linkCleanupResult.dryRun ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Dry-Run Preview
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                      <span key={hash} className="text-xs font-mono px-2 py-0.5 rounded bg-background border border-border">
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
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">High-Volume Click Events Pruning</h3>
                <p className="text-xs text-muted-foreground">Reclaim disk space by pruning old granular click event logs while keeping aggregate URL statistics accurate</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-accent/40 border border-border/60 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Info className="w-4 h-4 text-primary shrink-0" />
                Zero Analytics Loss for Summary Counters
              </div>
              <p>
                Total click counts displayed on user dashboards and link tables are stored in the <span className="font-mono text-foreground">statistics</span> table and will <strong>not</strong> be diminished. Only raw device/browser/IP telemetry older than the selected threshold will be pruned.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Pruning Age Threshold</label>
                <select
                  value={clickDaysOlderThan}
                  onChange={e => setClickDaysOlderThan(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono"
                >
                  <option value={30}>Older than 30 days</option>
                  <option value={60}>Older than 60 days</option>
                  <option value={90}>Older than 90 days (Recommended)</option>
                  <option value={180}>Older than 180 days</option>
                  <option value={365}>Older than 365 days (1 Year)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 ml-auto mt-5">
                <button
                  onClick={handlePreviewClickPruning}
                  disabled={isClickActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Preview Candidates
                </button>

                <button
                  onClick={handleExecuteClickPruning}
                  disabled={isClickActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-colors"
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
              className="p-4 rounded-xl border border-border bg-card/70 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {clickPruneResult.dryRun ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <HardDrive className="w-4 h-4" />
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
                <tr className="border-b border-border bg-accent/40 text-muted-foreground font-medium">
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
                      <tr key={tbl.tableName} className="hover:bg-accent/20 transition-colors">
                        <td className="py-2 px-4 text-foreground font-sans font-medium flex items-center gap-2">
                          <Database className="w-3 h-3 text-muted-foreground" />
                          {tbl.tableName}
                        </td>
                        <td className="py-2 px-4 text-right text-muted-foreground">
                          {tbl.rowCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-2 px-4 text-right text-foreground font-semibold">
                          {tbl.sizeMb.toFixed(3)} MB
                        </td>
                        <td className="py-2 px-4 text-right text-muted-foreground">
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
