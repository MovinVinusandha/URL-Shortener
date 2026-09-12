import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  ShieldAlert, 
  RotateCcw, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Lock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  Clock,
  Filter,
  UserX,
  Globe,
  X,
  Calendar,
  CheckSquare,
  Square,
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { AdminLink, PaginatedAdminLinks, AdminLinkTriageSummary } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import { DateRangePicker, type DateRangeValue } from '../../components/DateRangePicker';
import CustomSelect from '../../components/CustomSelect';

type TriageTab = 'needs_review' | 'spikes' | 'all';
type TimePreset = '1h' | '24h' | '7d' | '30d' | 'all' | 'custom';

const AdminLinksPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Navigation & Query State ──
  const [activeTab, setActiveTab] = useState<TriageTab>('needs_review');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ type: 'preset', value: 'all' });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [domainFilter, setDomainFilter] = useState('');
  const [clickThreshold, setClickThreshold] = useState<number | null>(null);

  // ── Data & Pagination State ──
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [triageSummary, setTriageSummary] = useState<AdminLinkTriageSummary | null>(null);

  // ── Selection State for Bulk Actions ──
  const [selectedHashes, setSelectedHashes] = useState<string[]>([]);

  // ── Modal States ──
  const [quarantineModalOpen, setQuarantineModalOpen] = useState(false);
  const [targetLinkForQuarantine, setTargetLinkForQuarantine] = useState<AdminLink | null>(null);
  const [isBulkQuarantine, setIsBulkQuarantine] = useState(false);
  const [quarantineReason, setQuarantineReason] = useState('');

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<{ publicId: string; email: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [blockDomainModalOpen, setBlockDomainModalOpen] = useState(false);
  const [domainToBlock, setDomainToBlock] = useState('');
  const [blockDomainReason, setBlockDomainReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // ── Compute Time Range based on DateRangeValue ──
  const computeTimeRange = (val: DateRangeValue): { start?: string; end?: string } => {
    if (val.type === 'custom') {
      return {
        start: val.start ? val.start.toISOString() : undefined,
        end: val.end ? val.end.toISOString() : undefined
      };
    }
    const now = new Date();
    if (val.value === '1h') {
      const past = new Date(now.getTime() - 60 * 60 * 1000);
      return { start: past.toISOString() };
    }
    if (val.value === '24h') {
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { start: past.toISOString() };
    }
    if (val.value === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: past.toISOString() };
    }
    if (val.value === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: past.toISOString() };
    }
    return {};
  };

  // ── Fetch Triage Summary ──
  const fetchTriageSummary = async () => {
    try {
      const { data } = await axiosInstance.get<AdminLinkTriageSummary>('/admin/links/triage-summary');
      setTriageSummary(data);
    } catch (err) {
      console.error('Failed to fetch triage summary', err);
    }
  };

  // ── Fetch Links ──
  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const timeRange = computeTimeRange(dateRange);

      let effectiveStatus: string = activeTab;
      if (activeTab === 'all') {
        effectiveStatus = 'all';
      }

      const params: Record<string, any> = {
        page,
        size: 15,
        search: searchTerm.trim() || undefined,
        status: effectiveStatus,
        startDate: timeRange.start,
        endDate: timeRange.end,
        minClicks: clickThreshold !== null ? clickThreshold : (activeTab === 'spikes' ? 500 : undefined),
        domain: domainFilter.trim() || undefined,
        sortBy: activeTab === 'spikes' ? 'clicks' : 'createdAt',
        sortDir: 'DESC'
      };

      const { data } = await axiosInstance.get<PaginatedAdminLinks>('/admin/links', { params });
      setLinks(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load admin links', err);
      toast.error('Failed to load links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTriageSummary();
  }, [refreshTrigger]);

  useEffect(() => {
    fetchLinks();
  }, [page, activeTab, dateRange, clickThreshold, domainFilter, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLinks();
  };

  // ── Copy Link ──
  const handleCopy = (url: string, hash: string) => {
    navigator.clipboard.writeText(url);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast.success('Link copied to clipboard');
  };

  // ── Selection Controls ──
  const toggleSelectAll = () => {
    if (selectedHashes.length === links.length && links.length > 0) {
      setSelectedHashes([]);
    } else {
      setSelectedHashes(links.map(l => l.shortUrl));
    }
  };

  const toggleSelectHash = (hash: string) => {
    setSelectedHashes(prev => 
      prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
    );
  };

  // ── Single & Bulk Quarantine Actions ──
  const openSingleQuarantine = (link: AdminLink) => {
    setTargetLinkForQuarantine(link);
    setIsBulkQuarantine(false);
    setQuarantineReason(link.quarantineReason || 'Flagged for security policy violation');
    setQuarantineModalOpen(true);
  };

  const openBulkQuarantine = () => {
    setIsBulkQuarantine(true);
    setTargetLinkForQuarantine(null);
    setQuarantineReason('Bulk quarantine by administrator');
    setQuarantineModalOpen(true);
  };

  const handleQuarantineConfirm = async () => {
    try {
      setIsSubmitting(true);
      if (isBulkQuarantine) {
        await axiosInstance.post('/admin/links/bulk-quarantine', {
          hashes: selectedHashes,
          reason: quarantineReason.trim() || 'Bulk quarantine'
        });
        toast.success(`Quarantined ${selectedHashes.length} links`);
        setSelectedHashes([]);
      } else if (targetLinkForQuarantine) {
        await axiosInstance.post(`/admin/links/${targetLinkForQuarantine.shortUrl}/quarantine`, {
          reason: quarantineReason.trim()
        });
        toast.success(`/${targetLinkForQuarantine.shortUrl} quarantined`);
      }
      setQuarantineModalOpen(false);
      fetchLinks();
      fetchTriageSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to quarantine link(s)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnquarantine = async (link: AdminLink) => {
    try {
      await axiosInstance.post(`/admin/links/${link.shortUrl}/unquarantine`);
      toast.success(`/${link.shortUrl} restored and active`);
      fetchLinks();
      fetchTriageSummary();
    } catch (err: any) {
      toast.error('Failed to unquarantine link');
    }
  };

  // ── Single & Bulk Delete Actions ──
  const handleDeleteSingle = async (link: AdminLink) => {
    if (!window.confirm(`Permanently delete /${link.shortUrl}?`)) return;
    try {
      await axiosInstance.delete(`/admin/links/${link.shortUrl}`);
      toast.success(`/${link.shortUrl} permanently removed`);
      setSelectedHashes(prev => prev.filter(h => h !== link.shortUrl));
      fetchLinks();
      fetchTriageSummary();
    } catch (err: any) {
      toast.error('Failed to delete link');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently delete all ${selectedHashes.length} selected links? This cannot be undone.`)) {
      return;
    }
    try {
      setIsSubmitting(true);
      await axiosInstance.post('/admin/links/bulk-delete', {
        hashes: selectedHashes
      });
      toast.success(`Deleted ${selectedHashes.length} links`);
      setSelectedHashes([]);
      fetchLinks();
      fetchTriageSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete selected links');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Suspend Creator Modal ──
  const openSuspendCreatorModal = (link: AdminLink) => {
    if (!link.userPublicId) {
      toast.error('Cannot suspend anonymous link creator');
      return;
    }
    setUserToSuspend({ publicId: link.userPublicId, email: link.userEmail });
    setSuspendReason('Malicious link campaign / Terms violation');
    setSuspendModalOpen(true);
  };

  const handleSuspendConfirm = async () => {
    if (!userToSuspend) return;
    try {
      setIsSubmitting(true);
      await axiosInstance.post(`/admin/users/${userToSuspend.publicId}/suspend`, {
        reason: suspendReason.trim()
      });
      toast.success(`User ${userToSuspend.email} suspended`);
      setSuspendModalOpen(false);
      fetchLinks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to suspend creator');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Block Target Domain Modal ──
  const openBlockDomainModal = (longUrl: string) => {
    try {
      const url = new URL(longUrl);
      setDomainToBlock(url.hostname.replace(/^www\./, ''));
    } catch {
      setDomainToBlock('');
    }
    setBlockDomainReason('Blacklisted directly from Links Moderation Hub');
    setBlockDomainModalOpen(true);
  };

  const handleBlockDomainConfirm = async () => {
    if (!domainToBlock.trim()) return;
    try {
      setIsSubmitting(true);
      await axiosInstance.post('/admin/links/block-domain', {
        domainPattern: domainToBlock.trim(),
        reason: blockDomainReason.trim() || 'Blocked domain'
      });
      toast.success(`Domain "${domainToBlock.trim()}" blacklisted`);
      setBlockDomainModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to blacklist domain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      {/* ── 1. Triage KPI Summary Cards ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setActiveTab('needs_review'); setDateRange({ type: 'preset', value: 'all' }); setPage(0); }}
          className={`p-3.5 rounded-2xl border border-border text-left transition-all cursor-pointer ${
            activeTab === 'needs_review'
              ? 'bg-secondary'
              : 'bg-card hover:bg-secondary/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {triageSummary ? triageSummary.needsAttentionCount : '—'}
          </div>
          <span className="text-[10px] text-muted-foreground">Quarantined + 24h Queue</span>
        </button>

        <button
          onClick={() => { setActiveTab('spikes'); setDateRange({ type: 'preset', value: 'all' }); setPage(0); }}
          className={`p-3.5 rounded-2xl border border-border text-left transition-all cursor-pointer ${
            activeTab === 'spikes'
              ? 'bg-secondary'
              : 'bg-card hover:bg-secondary/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Traffic Spikes</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {triageSummary ? triageSummary.spikeCount : '—'}
          </div>
          <span className="text-[10px] text-muted-foreground">&gt; 500 Clicks Surge</span>
        </button>

        <button
          onClick={() => { setActiveTab('all'); setDateRange({ type: 'preset', value: '24h' }); setPage(0); }}
          className={`p-3.5 rounded-2xl border border-border text-left transition-all cursor-pointer ${
            dateRange.type === 'preset' && dateRange.value === '24h' && activeTab === 'all'
              ? 'bg-secondary'
              : 'bg-card hover:bg-secondary/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Created Last 24h</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {triageSummary ? triageSummary.createdLast24hCount : '—'}
          </div>
          <span className="text-[10px] text-muted-foreground">Fresh Instance Activity</span>
        </button>

        <button
          onClick={() => { setActiveTab('all'); setDateRange({ type: 'preset', value: 'all' }); setPage(0); }}
          className={`p-3.5 rounded-2xl border border-border text-left transition-all cursor-pointer ${
            activeTab === 'all' && dateRange.type === 'preset' && dateRange.value === 'all'
              ? 'bg-secondary'
              : 'bg-card hover:bg-secondary/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Database</span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {triageSummary ? triageSummary.totalLinks.toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-muted-foreground">All Registered Links</span>
        </button>
      </div>

      {/* ── 2. Moderation Navigation & Slicing Bar ───────────── */}
      <div className="p-4 bg-background border border-border rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Triage Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-secondary/40 border border-border rounded-xl w-fit">
            <button
              onClick={() => { setActiveTab('needs_review'); setPage(0); }}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'needs_review'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'needs_review' && (
                <motion.div
                  layoutId="links-active-triage-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Needs Review</span>
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('spikes'); setPage(0); }}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'spikes'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'spikes' && (
                <motion.div
                  layoutId="links-active-triage-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Traffic Spikes</span>
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('all'); setPage(0); }}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'all' && (
                <motion.div
                  layoutId="links-active-triage-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>All Links (Search)</span>
              </span>
            </button>
          </div>

          {/* Date Range Picker with Calendar */}
          <div className="flex items-center">
            <DateRangePicker 
              value={dateRange} 
              onChange={(val) => { setDateRange(val); setPage(0); }}
              align="right"
            />
          </div>
        </div>

        {/* Smart Search and Exploration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by hash, long URL, domain, user email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground font-mono placeholder:font-sans transition-colors"
            />
          </form>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Filter domain (e.g. *.xyz)"
              value={domainFilter}
              onChange={(e) => { setDomainFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground font-mono transition-colors"
            />
          </div>

          <div className="sm:col-span-3">
            <CustomSelect
              value={clickThreshold === null ? '' : clickThreshold}
              onChange={(val) => {
                setClickThreshold(val === '' ? null : Number(val));
                setPage(0);
              }}
              options={[
                { value: '', label: 'Any Traffic Volume' },
                { value: 100, label: '> 100 Clicks' },
                { value: 500, label: '> 500 Clicks (Surge)' },
                { value: 5000, label: '> 5,000 Clicks (Viral)' },
                { value: 0, label: '0 Clicks (Dead / Stale)' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Bulk Action Floating / Sticky Toolbar ─────────── */}
      <AnimatePresence>
        {selectedHashes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3 bg-foreground text-background rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 font-medium">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedHashes.length} {selectedHashes.length === 1 ? 'link' : 'links'} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openBulkQuarantine}
                className="px-3 py-1.5 rounded-xl bg-background/20 hover:bg-background/30 text-background font-medium transition-colors flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Quarantine Selected</span>
              </button>

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>

              <button
                onClick={() => setSelectedHashes([])}
                className="p-1 text-background/70 hover:text-background rounded-lg"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. Main Moderation Table ────────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-muted-foreground hover:text-foreground"
                    title={selectedHashes.length === links.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedHashes.length > 0 && selectedHashes.length === links.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Short Link</th>
                <th className="py-3 px-4">Original Destination</th>
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4 text-center">Traffic</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3 px-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1.5">
                      <ShieldCheck className="w-7 h-7 text-emerald-500 opacity-60" />
                      <span className="font-medium text-foreground">Queue is Clear</span>
                      <span className="text-[11px]">No links found matching current triage parameters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const isSelected = selectedHashes.includes(link.shortUrl);
                  return (
                    <tr 
                      key={link.id} 
                      className={`hover:bg-secondary/70 transition-colors ${
                        isSelected ? 'bg-secondary/80' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectHash(link.shortUrl)}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                      </td>

                      {/* Short Link Hash */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {link.isPasswordProtected && (
                            <span title="Password protected">
                              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                          <span>/{link.shortUrl}</span>
                          <button
                            onClick={() => handleCopy(link.fullShortUrl, link.shortUrl)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                            title="Copy full short link"
                          >
                            {copiedHash === link.shortUrl ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Original Destination URL */}
                      <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={link.longUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground hover:underline inline-flex items-center gap-1 truncate max-w-full font-mono text-[11px]"
                          >
                            <span className="truncate">{link.longUrl}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                          <button
                            onClick={() => openBlockDomainModal(link.longUrl)}
                            className="text-[10px] text-muted-foreground hover:text-amber-500 p-0.5 rounded"
                            title="Block this destination domain"
                          >
                            <Globe className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Creator Info & Quick Suspend */}
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div>
                            <div className="font-medium text-foreground truncate max-w-[130px]">
                              {link.username || 'Anonymous'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                              {link.userEmail}
                            </div>
                          </div>
                          {link.userPublicId && (
                            <button
                              onClick={() => openSuspendCreatorModal(link)}
                              className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                              title="Suspend Creator Account"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Traffic Metric & Spike Indicator */}
                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                          {link.totalClicks > 500 && (
                            <span title="High Traffic Spike">
                              <Flame className="w-3 h-3 text-orange-500" />
                            </span>
                          )}
                          <span>{link.totalClicks.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {link.isQuarantined ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20"
                            title={link.quarantineReason || 'Quarantined'}
                          >
                            <ShieldAlert className="w-2.5 h-2.5" /> Quarantined
                          </span>
                        ) : !link.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-500/10 text-muted-foreground border border-border">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Moderation Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {link.isQuarantined ? (
                            <button
                              onClick={() => handleUnquarantine(link)}
                              className="p-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Restore link"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Restore</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openSingleQuarantine(link)}
                              className="p-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Quarantine link"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Quarantine</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSingle(link)}
                            className="p-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-lg transition-colors"
                            title="Delete link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page + 1} of {Math.max(1, totalPages)} ({totalElements} matching links)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isLoading}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Quarantine Modal (Single & Bulk) ──────────────── */}
      <AnimatePresence>
        {quarantineModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {isBulkQuarantine ? `Quarantine ${selectedHashes.length} Links` : 'Quarantine Short Link'}
                  </h3>
                  <p className="text-xs text-muted-foreground">Stop all incoming visitor traffic immediately</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {isBulkQuarantine 
                  ? `Quarantining ${selectedHashes.length} links will immediately halt redirection for all selected targets. Visitors will be redirected to the safety warning interstitial.`
                  : `Quarantining /${targetLinkForQuarantine?.shortUrl} will immediately halt redirection and invalidate caches.`}
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-medium text-foreground">Reason for Quarantine</label>
                <input
                  type="text"
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  placeholder="e.g. Phishing campaign, malware dropper, high-velocity bot spam"
                  className="w-full px-3 py-2 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setQuarantineModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuarantineConfirm}
                  disabled={isSubmitting || !quarantineReason.trim()}
                  className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Quarantining…' : 'Confirm Quarantine'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. Creator Suspension Confirmation Modal ─────────── */}
      <AnimatePresence>
        {suspendModalOpen && userToSuspend && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Suspend Creator Account</h3>
                  <p className="text-xs text-muted-foreground">Mandatory Safety Guardrail</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                You are about to suspend user <span className="font-semibold text-foreground">{userToSuspend.email}</span>. This will immediately revoke all active login sessions and block the user from creating or managing links.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-medium text-foreground">Suspension Reason</label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Terms violation, malicious campaign creator"
                  className="w-full px-3 py-2 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setSuspendModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspendConfirm}
                  disabled={isSubmitting || !suspendReason.trim()}
                  className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Suspending…' : 'Confirm Suspension'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. Block Target Domain Modal ────────────────────── */}
      <AnimatePresence>
        {blockDomainModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Blacklist Destination Domain</h3>
                  <p className="text-xs text-muted-foreground">Block future shortening &amp; redirection across instance</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-medium text-foreground">Domain Pattern</label>
                  <input
                    type="text"
                    value={domainToBlock}
                    onChange={(e) => setDomainToBlock(e.target.value)}
                    placeholder="e.g. badsite.com or *.malware.xyz"
                    className="w-full px-3 py-2 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono mt-1 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Reason</label>
                  <input
                    type="text"
                    value={blockDomainReason}
                    onChange={(e) => setBlockDomainReason(e.target.value)}
                    placeholder="e.g. Known malicious origin"
                    className="w-full px-3 py-2 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 mt-1 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setBlockDomainModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockDomainConfirm}
                  disabled={isSubmitting || !domainToBlock.trim()}
                  className="px-4 py-2 text-xs font-medium bg-foreground text-background hover:opacity-90 rounded-xl transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Blacklisting…' : 'Blacklist Domain'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminLinksPage;
