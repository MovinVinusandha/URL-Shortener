import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Download,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder as FolderIcon,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Info,
  X,
  Sparkles,
  Link2,
  CornerDownRight,
  Copy,
  Check,
  Activity,
  Zap,
  Sliders,
  Clock,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  FileText,
  MousePointerClick,
  Layers,
  Globe
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import type { UrlEntry } from '../types';
import toast from 'react-hot-toast';

export interface LinkCheckItem {
  id: string;
  slug: string;
  url: string;
  folderName?: string;
  status: 'PENDING' | 'CHECKING' | 'NORMAL' | 'ABNORMAL' | 'NETWORK_ERROR';
  statusCode?: number;
  durationMs?: number;
  error?: string;
  redirectUrl?: string;
}

// Chart color palette adhering strictly to Analytics tab blues & variants (cyan/sky, indigo/magenta, royal blue)
const CHART_BLUE_PALETTE = ['#0099ff', '#38bdf8', '#818cf8', '#6366f1', '#a855f7', '#0ea5e9'];
const LATENCY_BLUE_COLORS = ['#38bdf8', '#0099ff', '#818cf8', '#6366f1'];

const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const getRootDomain = () => {
  const hostname = window.location.hostname;
  if (hostname.startsWith('app.')) {
    return hostname.substring(4);
  }
  return hostname;
};

export const LinkCheckPage: React.FC = () => {
  const outletCtx = useOutletContext<DashboardLayoutContext | undefined>();
  const folders = outletCtx?.folders || [];

  const rootDomain = getRootDomain();
  const displayDomain = rootDomain + (window.location.port && window.location.port !== '80' && window.location.port !== '443' ? ':' + window.location.port : '');
  const protocol = window.location.protocol;

  // Data state
  const [links, setLinks] = useState<UrlEntry[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState<number>(8);
  const [batchSize, setBatchSize] = useState<number>(6);

  // Single Check Input
  const [customUrl, setCustomUrl] = useState('');
  const [isCheckingSingle, setIsCheckingSingle] = useState(false);

  // Execution state
  const [checkItems, setCheckItems] = useState<LinkCheckItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<string>('abnormal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetailItem, setSelectedDetailItem] = useState<LinkCheckItem | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Pagination state (Matching Events stream table footer)
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  // Reset pagination when active filter tab or search changes
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery]);

  // Close folder dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(e.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Links
  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await axiosInstance.get<UrlEntry[]>('/url/all');
      setLinks(res.data);
      initializeCheckItems(res.data, selectedFolderId);
    } catch (err: any) {
      toast.error('Failed to load short links');
    } finally {
      setIsLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const initializeCheckItems = (rawLinks: UrlEntry[], folderFilter: string) => {
    const filtered = rawLinks.filter((l) => {
      if (folderFilter === 'all') return true;
      if (folderFilter === 'none') return !l.folderId;
      return l.folderId?.toString() === folderFilter;
    });

    const items: LinkCheckItem[] = filtered.map((l) => ({
      id: l.shortUrl,
      slug: extractHash(l.shortUrl),
      url: l.longUrl,
      folderName: l.folderName || undefined,
      status: 'PENDING',
    }));

    setCheckItems(items);
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    setIsFolderDropdownOpen(false);
    if (!isRunning) {
      initializeCheckItems(links, folderId);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = checkItems.length;
    let checked = 0;
    let normal = 0;
    let abnormal = 0;
    let networkError = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    checkItems.forEach((item) => {
      if (item.status !== 'PENDING' && item.status !== 'CHECKING') {
        checked++;
      }
      if (item.status === 'NORMAL') normal++;
      else if (item.status === 'ABNORMAL') abnormal++;
      else if (item.status === 'NETWORK_ERROR') networkError++;

      if (item.durationMs != null && item.durationMs > 0) {
        totalLatency += item.durationMs;
        latencyCount++;
      }
    });

    const pending = total - checked;
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    const healthScore = checked > 0 ? Math.round((normal / checked) * 100) : 100;

    return { total, checked, normal, abnormal, networkError, pending, avgLatency, healthScore };
  }, [checkItems]);

  // Dynamic status code histogram data
  const statusCodeData = useMemo(() => {
    const counts = new Map<string, number>();
    checkItems.forEach((item) => {
      if (item.statusCode && item.statusCode > 0) {
        const codeKey = `${item.statusCode}`;
        counts.set(codeKey, (counts.get(codeKey) || 0) + 1);
      } else if (item.status === 'NETWORK_ERROR') {
        counts.set('ERR', (counts.get('ERR') || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([code, count]) => ({
      code,
      count,
    }));
  }, [checkItems]);

  // Latency bucket data
  const latencyData = useMemo(() => {
    const buckets = [
      { range: '< 100ms', count: 0 },
      { range: '100 - 300ms', count: 0 },
      { range: '300 - 600ms', count: 0 },
      { range: '600ms +', count: 0 },
    ];
    checkItems.forEach((item) => {
      if (item.durationMs != null && item.durationMs > 0) {
        if (item.durationMs < 100) buckets[0].count++;
        else if (item.durationMs <= 300) buckets[1].count++;
        else if (item.durationMs <= 600) buckets[2].count++;
        else buckets[3].count++;
      }
    });
    return buckets;
  }, [checkItems]);

  // Start Check Engine
  const startCheck = async () => {
    if (isRunning) return;
    if (checkItems.length === 0) {
      toast.error('No links to check. Select a folder or reload links.');
      return;
    }

    setIsRunning(true);
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    const queue = [...checkItems];
    const effectiveBatchSize = Math.max(1, Math.min(batchSize, 10));
    const effectiveTimeout = Math.max(1, Math.min(timeoutSec, 60));

    // Reset items
    setCheckItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: 'PENDING',
        statusCode: undefined,
        durationMs: undefined,
        error: undefined,
      }))
    );

    let currentIndex = 0;

    try {
      while (currentIndex < queue.length) {
        if (abortCtrl.signal.aborted) break;

        const currentBatch = queue.slice(currentIndex, currentIndex + effectiveBatchSize);
        const batchIds = new Set(currentBatch.map((b) => b.id));

        setCheckItems((prev) =>
          prev.map((item) => (batchIds.has(item.id) ? { ...item, status: 'CHECKING' } : item))
        );

        try {
          const res = await axiosInstance.post<{
            results: Array<{
              id: string;
              slug: string;
              url: string;
              statusCode: number;
              status: 'NORMAL' | 'ABNORMAL' | 'NETWORK_ERROR';
              durationMs: number;
              error?: string;
              redirectUrl?: string;
            }>;
          }>(
            '/links/check',
            {
              items: currentBatch.map((b) => ({ id: b.id, slug: b.slug, url: b.url })),
              timeoutSeconds: effectiveTimeout,
            },
            { signal: abortCtrl.signal }
          );

          const resultMap = new Map(res.data.results.map((r) => [r.id, r]));

          setCheckItems((prev) =>
            prev.map((item) => {
              const resData = resultMap.get(item.id);
              if (resData) {
                return {
                  ...item,
                  status: resData.status,
                  statusCode: resData.statusCode,
                  durationMs: resData.durationMs,
                  error: resData.error,
                  redirectUrl: resData.redirectUrl,
                };
              }
              return item;
            })
          );
        } catch (err: any) {
          if (axios.isCancel(err) || abortCtrl.signal.aborted) {
            break;
          }
          setCheckItems((prev) =>
            prev.map((item) =>
              batchIds.has(item.id)
                ? { ...item, status: 'NETWORK_ERROR', error: err.message || 'Batch request failed' }
                : item
            )
          );
        }

        currentIndex += effectiveBatchSize;
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const stopCheck = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    toast('Check stopped', { icon: '⏹️' });
  };

  const clearResults = () => {
    if (isRunning) stopCheck();
    initializeCheckItems(links, selectedFolderId);
    toast.success('Results cleared');
  };

  const reloadLinks = () => {
    if (isRunning) stopCheck();
    fetchLinks();
    toast.success('Links reloaded');
  };

  // Quick Single URL Check
  const handleCheckSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    setIsCheckingSingle(true);
    try {
      const res = await axiosInstance.post('/links/check/single', {
        id: 'custom-' + Date.now(),
        slug: 'direct',
        url: customUrl.trim(),
      });

      const newItem: LinkCheckItem = {
        id: res.data.id,
        slug: res.data.slug || 'direct',
        url: res.data.url,
        status: res.data.status,
        statusCode: res.data.statusCode,
        durationMs: res.data.durationMs,
        error: res.data.error,
        redirectUrl: res.data.redirectUrl,
      };

      setCheckItems((prev) => [newItem, ...prev]);
      setCustomUrl('');
      toast.success(`Result: ${res.data.status} (${res.data.statusCode || 'ERR'})`);
    } catch (err: any) {
      toast.error('Failed to verify URL');
    } finally {
      setIsCheckingSingle(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    if (checkItems.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Slug', 'Destination URL', 'Folder', 'Status', 'Status Code', 'Duration (ms)', 'Error'];
    const rows = checkItems.map((item) => [
      `"${item.slug.replace(/"/g, '""')}"`,
      `"${item.url.replace(/"/g, '""')}"`,
      `"${(item.folderName || '').replace(/"/g, '""')}"`,
      `"${item.status}"`,
      item.statusCode ?? '',
      item.durationMs ?? '',
      `"${(item.error || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-check-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported to CSV');
  };

  // Filtered rows for table
  const filteredItems = useMemo(() => {
    return checkItems.filter((item) => {
      if (activeTab === 'abnormal') {
        if (item.status === 'NORMAL' || item.status === 'PENDING') return false;
      } else if (activeTab === 'normal') {
        if (item.status !== 'NORMAL') return false;
      } else if (activeTab === 'network-error') {
        if (item.status !== 'NETWORK_ERROR') return false;
      } else if (activeTab.startsWith('code-')) {
        const code = activeTab.replace('code-', '');
        if (code === 'ERR') {
          if (item.status !== 'NETWORK_ERROR') return false;
        } else {
          if (item.statusCode?.toString() !== code) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSlug = item.slug.toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        const matchError = item.error?.toLowerCase().includes(q);
        if (!matchSlug && !matchUrl && !matchError) return false;
      }

      return true;
    });
  }, [checkItems, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = page * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const progressPercent = metrics.total > 0 ? Math.round((metrics.checked / metrics.total) * 100) : 0;

  const getSelectedFolderLabel = () => {
    if (selectedFolderId === 'all') return 'All Folders';
    if (selectedFolderId === 'none') return 'Uncategorized links';
    const found = folders.find((f) => f.id?.toString() === selectedFolderId);
    return found ? found.name : 'Selected Folder';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Top Primary Control Bar (Matching Analytics Tab Buttons & Inputs) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left side: Quick single URL test */}
          <form onSubmit={handleCheckSingle} className="relative flex items-center">
            <input
              type="url"
              placeholder="Test URL..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-48 sm:w-64 bg-background dark:bg-black text-foreground border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <Link2 className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              disabled={isCheckingSingle || !customUrl.trim()}
              className="ml-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isCheckingSingle ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
            </button>
          </form>

          {/* Right side: Folder scope, settings, and actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Folder Scope Selector (Exact Analytics Style Pill) */}
            <div className="relative" ref={folderDropdownRef}>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-medium bg-secondary/40 text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
              >
                <FolderIcon className="w-3.5 h-3.5 text-primary" />
                <span className="max-w-[120px] truncate">{getSelectedFolderLabel()}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              {isFolderDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border shadow-xl rounded-xl p-1.5 z-50 flex flex-col gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleFolderChange('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedFolderId === 'all'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>All Folders</span>
                    {selectedFolderId === 'all' && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFolderChange('none')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedFolderId === 'none'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>Uncategorized links</span>
                    {selectedFolderId === 'none' && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFolderChange(f.id.toString())}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFolderId === f.id.toString()
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
                      {selectedFolderId === f.id.toString() && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                isSettingsOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title="Configure timeout & batch size"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Action Buttons matching Analytics & System Buttons */}
            {!isRunning ? (
              <button
                onClick={startCheck}
                disabled={checkItems.length === 0 || isLoadingLinks}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Check</span>
              </button>
            ) : (
              <button
                onClick={stopCheck}
                className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current text-muted-foreground" />
                <span>Stop</span>
              </button>
            )}

            <button
              onClick={reloadLinks}
              disabled={isRunning || isLoadingLinks}
              className="p-1.5 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              title="Reload Links"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingLinks ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={clearResults}
              disabled={isRunning || metrics.checked === 0}
              className="p-1.5 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              title="Clear Results"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Expanded Export CSV Button */}
            <button
              onClick={exportCSV}
              disabled={checkItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium bg-secondary/40 text-foreground hover:bg-secondary transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              title="Export CSV Report"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ── Optional Collapsible Settings Bar ────────────────────────── */}
        {isSettingsOpen && (
          <div className="bg-background border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Timeout (seconds)</span>
                <span className="text-[11px] text-muted-foreground">Default 8s</span>
              </div>
              <input
                type="number"
                min="1"
                max="60"
                value={timeoutSec}
                disabled={isRunning}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full bg-background dark:bg-black text-foreground border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Concurrent Batch Size</span>
                <span className="text-[11px] text-muted-foreground">Default 6 (max 10)</span>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={batchSize}
                disabled={isRunning}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full bg-background dark:bg-black text-foreground border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* ── Unified Master Card (Inheriting Analytics Tab Top Banner) ── */}
        <div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col w-full shadow-xs">
          
          {/* Integrated Metric Header Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
            {/* Column 1: Total Links */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Total Inspected
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                {metrics.checked} <span className="text-xs text-muted-foreground font-normal">/ {metrics.total}</span>
              </div>
            </div>

            {/* Column 2: Health Score */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Link Health
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1 flex items-baseline gap-2">
                <span>{metrics.healthScore}%</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({metrics.normal} reachable)
                </span>
              </div>
            </div>

            {/* Column 3: Abnormal Links */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Issues Found
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                {metrics.abnormal + metrics.networkError}{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  ({metrics.abnormal} broken, {metrics.networkError} net err)
                </span>
              </div>
            </div>

            {/* Column 4: Average Latency */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Avg Response Speed
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                {metrics.avgLatency} <span className="text-xs text-muted-foreground font-normal">ms</span>
              </div>
            </div>
          </div>

          {/* Progress Bar & Scan Status */}
          <div className="px-6 py-4 border-b border-border bg-secondary/15 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Inspection Progress</span>
                {isRunning && (
                  <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                    <RotateCw className="w-3 h-3 animate-spin" /> Checking in parallel...
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px]">
                {metrics.checked} of {metrics.total} links ({progressPercent}%)
              </span>
            </div>

            {/* Proportional Traffic/Status Share Bar */}
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
              {metrics.normal > 0 && (
                <div
                  className="h-full bg-[#0099ff] transition-all duration-300"
                  style={{ width: `${(metrics.normal / (metrics.total || 1)) * 100}%` }}
                  title={`Healthy: ${metrics.normal}`}
                />
              )}
              {metrics.abnormal > 0 && (
                <div
                  className="h-full bg-[#818cf8] transition-all duration-300"
                  style={{ width: `${(metrics.abnormal / (metrics.total || 1)) * 100}%` }}
                  title={`Broken: ${metrics.abnormal}`}
                />
              )}
              {metrics.networkError > 0 && (
                <div
                  className="h-full bg-[#38bdf8] transition-all duration-300"
                  style={{ width: `${(metrics.networkError / (metrics.total || 1)) * 100}%` }}
                  title={`Network Error: ${metrics.networkError}`}
                />
              )}
            </div>
          </div>

          {/* Graphical Analytics Charts Area */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Code Distribution Histogram */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-primary" /> Status Code Distribution
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">{statusCodeData.length} unique codes</span>
              </div>

              <div className="h-36 w-full">
                {statusCodeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No response data yet. Click &quot;Start Check&quot; to begin.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusCodeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis
                        dataKey="code"
                        tick={{ fill: '#71717A', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#71717A', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover text-popover-foreground border border-border rounded-xl p-2.5 text-xs shadow-xl min-w-[130px]">
                                <span className="font-semibold text-foreground">Status {d.code}:</span>{' '}
                                <span className="font-mono text-muted-foreground">{d.count} links</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statusCodeData.map((_, idx) => (
                          <Cell
                            key={`code-cell-${idx}`}
                            fill={CHART_BLUE_PALETTE[idx % CHART_BLUE_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Latency Speed Distribution Bars */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#38bdf8]" /> Latency Profile
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Avg {metrics.avgLatency} ms</span>
              </div>

              <div className="space-y-2 py-1">
                {latencyData.map((item, idx) => {
                  const totalWithLatency = metrics.checked - metrics.networkError || 1;
                  const pct = Math.round((item.count / totalWithLatency) * 100);
                  const barColor = LATENCY_BLUE_COLORS[idx % LATENCY_BLUE_COLORS.length];
                  return (
                    <div key={item.range} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-mono">{item.range}</span>
                        <span className="font-mono text-foreground font-medium">{item.count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Results Container (Inheriting Analytics Page Breakdown Table Design) ── */}
        <div className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden shadow-xs">
          
          {/* Table Header Row */}
          <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/15 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-semibold text-xs text-foreground">Link Verification Results</h3>
            </div>

            {/* Live in-table Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter by slug or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background dark:bg-black text-foreground border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Dedicated Status Tabs (Identical to Analytics Page Subheader Tabs) */}
          <div className="h-12 border-b border-border bg-background px-4 flex items-center overflow-x-auto scrollbar-none gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('abnormal')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'abnormal'
                  ? 'bg-secondary text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Abnormal</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded-full">
                {metrics.abnormal + metrics.networkError}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-secondary text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>All Links</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded-full">
                {metrics.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('normal')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'normal'
                  ? 'bg-secondary text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Healthy</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded-full">
                {metrics.normal}
              </span>
            </button>

            {statusCodeData.map((item) => {
              const isTabActive = activeTab === `code-${item.code}`;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setActiveTab(`code-${item.code}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
                    isTabActive
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <span className="font-mono">{item.code}</span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded-full">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Analytics-styled Table List */}
          <div className="flex flex-col flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
                <span className="text-xs font-semibold text-foreground">No links to display</span>
                <span className="text-[11px] text-muted-foreground max-w-xs">
                  {activeTab === 'abnormal'
                    ? 'No broken links detected. Switch to "All Links" to inspect your short links or run "Start Check".'
                    : 'No links match your current filter.'}
                </span>
              </div>
            ) : (
              paginatedItems.map((item, idx) => {
                const isNormal = item.status === 'NORMAL';
                const isAbnormal = item.status === 'ABNORMAL';
                const isNetErr = item.status === 'NETWORK_ERROR';
                const isChecking = item.status === 'CHECKING';
                const fullShortUrl = `${protocol}//${displayDomain}/${item.slug}`;
                const globalIndex = page * pageSize + idx + 1;

                return (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between px-4 py-3 border-b border-dashed border-border last:border-b-0 hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all relative overflow-hidden gap-4"
                  >
                    {/* Background proportion line inherited from Analytics tables */}
                    {item.durationMs != null && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-primary/10 dark:bg-primary/15 z-0 rounded-r-md transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(Math.round((item.durationMs / 1000) * 100), 2))}%` }}
                      />
                    )}

                    {/* Left: Index, Favicon, Slug & Destination URL */}
                    <div className="flex items-center gap-3 z-10 min-w-0 flex-1">
                      <span className="text-[11px] text-muted-foreground w-6 text-right shrink-0 font-mono select-none">
                        {globalIndex}
                      </span>

                      <div className="w-6 h-6 rounded-full border border-border bg-secondary overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${item.url}&sz=64`}
                          alt="Favicon"
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <a
                            href={fullShortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-foreground truncate hover:underline"
                          >
                            {displayDomain}/{item.slug}
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(fullShortUrl);
                              setCopiedSlug(item.slug);
                              toast.success('Link copied');
                              setTimeout(() => setCopiedSlug(null), 2000);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                            title="Copy link"
                          >
                            {copiedSlug === item.slug ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>

                          {item.statusCode && item.statusCode > 0 ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium shrink-0 ${
                                isNormal
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {item.statusCode}
                            </span>
                          ) : isNetErr ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                              ERR
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-0.5 min-w-0">
                          <CornerDownRight className="w-3 h-3 shrink-0 opacity-60" />
                          <span className="truncate block" title={item.url}>
                            {item.url}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Latency, Result Status, Action Buttons */}
                    <div className="flex items-center gap-2.5 z-10 shrink-0 text-xs pl-2">
                      {isChecking ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary font-mono shrink-0">
                          <RotateCw className="w-3 h-3 animate-spin" /> Checking
                        </span>
                      ) : item.durationMs != null ? (
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-16 text-right">
                          {item.durationMs} ms
                        </span>
                      ) : null}

                      {/* Action buttons matching Analytics style */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 text-foreground text-xs font-medium hover:bg-secondary transition-colors cursor-pointer shadow-xs shrink-0"
                        title="Visit destination URL"
                      >
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        <span className="hidden sm:inline">Original</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 text-foreground text-xs font-medium hover:bg-secondary transition-colors cursor-pointer shadow-xs shrink-0"
                        title="Inspect details"
                      >
                        <Info className="w-3 h-3 text-muted-foreground" />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls inside Box Footer (Matching Events Stream Table Bottom Function) */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground shrink-0 bg-background">
            <span>
              {filteredItems.length === 0
                ? 'Viewing 0 of 0 links'
                : `Viewing ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filteredItems.length)} of ${filteredItems.length} links`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded-md border border-border hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= filteredItems.length}
                className="p-1 rounded-md border border-border hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Detail Inspection Modal ───────────────────────────────────── */}
        {selectedDetailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-popover border border-border rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Link Check Detail</h3>
                </div>
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Short Link Slug</span>
                  <span className="font-mono text-foreground font-semibold bg-secondary px-2 py-0.5 rounded border border-border inline-block mt-0.5">
                    {selectedDetailItem.slug}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">Destination URL</span>
                  <a
                    href={selectedDetailItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline break-all mt-0.5 inline-block"
                  >
                    {selectedDetailItem.url}
                  </a>
                </div>

                {selectedDetailItem.redirectUrl && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Redirects To</span>
                    <span className="font-mono text-foreground break-all mt-0.5 inline-block">
                      {selectedDetailItem.redirectUrl}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-secondary/40 border border-border rounded-lg p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Status Code</span>
                    <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                      {selectedDetailItem.statusCode || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-secondary/40 border border-border rounded-lg p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Duration</span>
                    <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                      {selectedDetailItem.durationMs != null ? `${selectedDetailItem.durationMs} ms` : 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedDetailItem.error && (
                  <div>
                    <span className="text-rose-500 font-semibold block text-[11px]">Error Description</span>
                    <div className="mt-1 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg font-mono text-[11px] break-all">
                      {selectedDetailItem.error}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LinkCheckPage;
