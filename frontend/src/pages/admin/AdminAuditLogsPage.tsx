import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Hash, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Info, 
  ExternalLink,
  Lock,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axiosInstance from '../../api/axiosInstance';
import type { AdminAuditLogItem, PaginatedAuditLogs, AuditChainVerification } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import CustomSelect from '../../components/CustomSelect';

const ACTION_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  LINK_QUARANTINED: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  BULK_LINK_QUARANTINED: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  LINK_UNQUARANTINED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  LINK_DELETED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  BULK_LINK_DELETED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  USER_SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  USER_UNSUSPENDED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  USER_ROLE_CHANGED: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  DOMAIN_BLOCKED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  DOMAIN_UNBLOCKED: { bg: 'bg-neutral-500/10', text: 'text-muted-foreground', border: 'border-border' },
  IP_BLOCKED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  IP_UNBLOCKED: { bg: 'bg-neutral-500/10', text: 'text-muted-foreground', border: 'border-border' },
  SETTING_UPDATED: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
  INCIDENT_RESOLVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  CACHE_EVICT_KEY: { bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/20' },
  CACHE_FLUSH_URLS: { bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/20' },
  CACHE_FLUSH_ALL: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  CACHE_WARM_UP: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  LINKS_PURGE_DEACTIVATE: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  LINKS_PURGE_HARD: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  CLICK_EVENTS_PRUNED: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
};

const AdminAuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const isRoot = user?.role === 'ROOT' || user?.role === 'ROLE_ROOT';
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();

  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');
  const [actorEmailFilter, setActorEmailFilter] = useState('');

  // Chain Verification State
  const [verification, setVerification] = useState<AuditChainVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Detail Modal
  const [activeModalEntry, setActiveModalEntry] = useState<AdminAuditLogItem | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        page,
        size: 15,
        search: search.trim() || undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        targetType: targetTypeFilter !== 'ALL' ? targetTypeFilter : undefined,
        actorEmail: actorEmailFilter.trim() || undefined,
        sortBy: 'id',
        sortDir: 'DESC'
      };

      const { data } = await axiosInstance.get<PaginatedAuditLogs>('/admin/audit-logs', { params });
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err: any) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    if (!isRoot) return;
    try {
      setIsVerifying(true);
      const { data } = await axiosInstance.get<AuditChainVerification>('/admin/audit-logs/verify');
      setVerification(data);
      if (data.valid) {
        toast.success(`Cryptographic chain verified (${data.totalVerified} entries intact)`);
      } else {
        toast.error(`Chain broken at ID ${data.tamperedEntryId}! Possible tampering detected.`);
      }
    } catch (err: any) {
      toast.error('Failed to verify cryptographic chain');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportJson = async () => {
    try {
      toast.loading('Exporting audit trail...', { id: 'export' });
      const response = await axiosInstance.get('/admin/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trim-audit-log-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit trail downloaded', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export audit logs', { id: 'export' });
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter, targetTypeFilter, refreshTrigger]);

  useEffect(() => {
    if (isRoot) {
      verifyIntegrity();
    }
  }, [refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchAuditLogs();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* ── 1. Header & Verification Status ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Immutable Audit Trail</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              SHA-256 Chained
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tamper-evident, append-only chronological record of all administrative actions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isRoot && (
            <button
              onClick={verifyIntegrity}
              disabled={isVerifying}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-secondary/40 text-foreground transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              title="Cryptographically verify SHA-256 previous-hash chain"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              <span>{isVerifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}</span>
            </button>
          )}

          {isRoot && (
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Trail (JSON)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Cryptographic Chain Status Banner ─────────────── */}
      {verification && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            verification.valid
              ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            {verification.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="font-semibold flex items-center gap-2">
                <span>{verification.valid ? 'Cryptographic Chain Valid & Intact' : 'CRITICAL: Broken Audit Chain Detected'}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({verification.totalVerified} entries validated)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {verification.valid
                  ? `Latest block hash: ${verification.latestHash.slice(0, 16)}...${verification.latestHash.slice(-8)}`
                  : verification.failureReason}
              </p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground shrink-0 self-end sm:self-center">
            Validated at {new Date(verification.verifiedAt).toLocaleTimeString()}
          </div>
        </motion.div>
      )}

      {/* ── 3. Filters & Exploration Bar ────────────────────── */}
      <div className="p-4 bg-background border border-border rounded-2xl shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across target identifier, description, actor email, or hash..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>

          {/* Action Filter */}
          <CustomSelect
            value={actionFilter}
            onChange={(val) => { setActionFilter(val); setPage(0); }}
            options={[
              { value: 'ALL', label: 'All Actions' },
              { value: 'LINK_QUARANTINED', label: 'Link Quarantined' },
              { value: 'BULK_LINK_QUARANTINED', label: 'Bulk Link Quarantined' },
              { value: 'LINK_UNQUARANTINED', label: 'Link Restored' },
              { value: 'LINK_DELETED', label: 'Link Deleted' },
              { value: 'BULK_LINK_DELETED', label: 'Bulk Link Deleted' },
              { value: 'USER_SUSPENDED', label: 'User Suspended' },
              { value: 'USER_UNSUSPENDED', label: 'User Restored' },
              { value: 'USER_ROLE_CHANGED', label: 'User Role Changed' },
              { value: 'DOMAIN_BLOCKED', label: 'Domain Blocked' },
              { value: 'IP_BLOCKED', label: 'IP Blocked' },
              { value: 'SETTING_UPDATED', label: 'Setting Updated' },
              { value: 'INCIDENT_RESOLVED', label: 'Incident Resolved' },
              { value: 'CACHE_WARM_UP', label: 'Cache Warm Up' },
              { value: 'CACHE_FLUSH_URLS', label: 'Flush URL Cache' },
              { value: 'CACHE_FLUSH_ALL', label: 'Flush Entire Redis' },
              { value: 'LINKS_PURGE_DEACTIVATE', label: 'Links Deactivated' },
              { value: 'LINKS_PURGE_HARD', label: 'Links Hard Purged' },
              { value: 'CLICK_EVENTS_PRUNED', label: 'Click Events Pruned' },
            ]}
            className="w-full md:w-auto"
            menuClassName="w-56"
          />

          {/* Target Type Filter */}
          <CustomSelect
            value={targetTypeFilter}
            onChange={(val) => { setTargetTypeFilter(val); setPage(0); }}
            options={[
              { value: 'ALL', label: 'All Targets' },
              { value: 'LINK', label: 'Links' },
              { value: 'USER', label: 'Users' },
              { value: 'DOMAIN', label: 'Domains' },
              { value: 'IP', label: 'Perimeter IPs' },
              { value: 'SETTING', label: 'Settings' },
              { value: 'INCIDENT', label: 'Incidents' },
              { value: 'REDIS', label: 'Redis Cache' },
              { value: 'URL_STORE', label: 'URL Store' },
              { value: 'ANALYTICS_STORE', label: 'Analytics Store' },
            ]}
            className="w-full md:w-auto"
            menuClassName="w-48"
          />

          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {/* ── 4. Main Audit Table ──────────────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                <th className="py-3 px-4 w-12 font-mono text-center">ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4 text-right font-mono">Hash Preview</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1.5">
                      <FileText className="w-7 h-7 text-muted-foreground opacity-50" />
                      <span className="font-medium text-foreground">No Audit Records Found</span>
                      <span className="text-[11px]">No entries match your current search and filter criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const style = ACTION_COLOR_MAP[log.action] || {
                    bg: 'bg-secondary/60',
                    text: 'text-foreground',
                    border: 'border-border'
                  };

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setActiveModalEntry(log)}
                      className="hover:bg-secondary dark:hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-muted-foreground text-center">
                        #{log.id}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground/60" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actor Email & Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground/60" />
                          <span className="font-medium text-foreground">{log.actorEmail}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border uppercase">
                            {log.actorRole}
                          </span>
                        </div>
                      </td>

                      {/* Target Identifier */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                        <span className="text-muted-foreground text-[10px] uppercase font-sans mr-1">
                          [{log.targetType}]
                        </span>
                        <span>{log.targetIdentifier || '—'}</span>
                      </td>

                      {/* Details Summary */}
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {log.details || '—'}
                      </td>

                      {/* Hash Preview */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap text-muted-foreground group-hover:text-primary transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          <Hash className="w-3 h-3 opacity-60" />
                          <span>{log.entryHash.slice(0, 8)}...</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────── */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-secondary/20">
          <div>
            Showing <span className="font-semibold text-foreground">{logs.length}</span> of{' '}
            <span className="font-semibold text-foreground">{totalElements.toLocaleString()}</span> logged actions
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isLoading}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Detailed Forensic Entry Modal ─────────────────── */}
      <AnimatePresence>
        {activeModalEntry && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Audit Entry #{activeModalEntry.id} Forensic Details
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModalEntry(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-mono">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 border border-border rounded-xl">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Action</span>
                    <div className="font-semibold text-foreground mt-0.5">{activeModalEntry.action}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Timestamp</span>
                    <div className="text-foreground mt-0.5">{new Date(activeModalEntry.createdAt).toISOString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Actor</span>
                    <div className="text-foreground mt-0.5">{activeModalEntry.actorEmail} ({activeModalEntry.actorRole})</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Actor IP</span>
                    <div className="text-foreground mt-0.5">{activeModalEntry.actorIp || 'Internal / N/A'}</div>
                  </div>
                </div>

                {/* Target & Description */}
                <div>
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Target & Summary</span>
                  <div className="mt-1 p-3 bg-secondary/20 border border-border rounded-xl text-foreground font-sans">
                    <span className="font-mono font-semibold">[{activeModalEntry.targetType}] {activeModalEntry.targetIdentifier}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{activeModalEntry.details}</p>
                  </div>
                </div>

                {/* Structured Payload JSON */}
                {activeModalEntry.metadataJson && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Structured Payload</span>
                    <pre className="mt-1 p-3 bg-secondary/40 border border-border rounded-xl text-[11px] overflow-x-auto text-foreground">
                      {JSON.stringify(JSON.parse(activeModalEntry.metadataJson), null, 2)}
                    </pre>
                  </div>
                )}

                {/* Cryptographic Chain Hashes */}
                <div className="space-y-2 p-3 bg-secondary/20 border border-border rounded-xl">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Previous Entry Hash</span>
                    <div className="text-[11px] text-muted-foreground break-all">{activeModalEntry.prevHash}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans uppercase">Entry SHA-256 Hash</span>
                    <div className="text-[11px] text-primary font-semibold break-all">{activeModalEntry.entryHash}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
                <button
                  onClick={() => setActiveModalEntry(null)}
                  className="px-4 py-1.5 text-xs font-medium rounded-xl bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminAuditLogsPage;
