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
  ChevronRight
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { AdminLink, PaginatedAdminLinks } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';

const AdminLinksPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [links, setLinks] = useState<AdminLink[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [isLoading, setIsLoading] = useState(true);

  // Quarantine Modal State
  const [quarantineModalOpen, setQuarantineModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<AdminLink | null>(null);
  const [quarantineReason, setQuarantineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        page,
        size: 15,
        search: searchTerm.trim() || undefined
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
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
    fetchLinks();
  }, [page, searchTerm, statusFilter, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLinks();
  };

  const handleCopy = (url: string, hash: string) => {
    navigator.clipboard.writeText(url);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast.success('Link copied to clipboard');
  };

  const openQuarantineModal = (link: AdminLink) => {
    setSelectedLink(link);
    setQuarantineReason('Flagged for security policy violation');
    setQuarantineModalOpen(true);
  };

  const handleQuarantineConfirm = async () => {
    if (!selectedLink) return;
    try {
      setIsSubmitting(true);
      await axiosInstance.post(`/admin/links/${selectedLink.shortUrl}/quarantine`, {
        reason: quarantineReason
      });
      toast.success(`/${selectedLink.shortUrl} quarantined successfully`);
      setQuarantineModalOpen(false);
      fetchLinks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to quarantine link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnquarantine = async (link: AdminLink) => {
    try {
      await axiosInstance.post(`/admin/links/${link.shortUrl}/unquarantine`);
      toast.success(`/${link.shortUrl} restored and active`);
      fetchLinks();
    } catch (err: any) {
      toast.error('Failed to unquarantine link');
    }
  };

  const handleDelete = async (link: AdminLink) => {
    if (!window.confirm(`Are you sure you want to permanently delete /${link.shortUrl}?`)) {
      return;
    }
    try {
      await axiosInstance.delete(`/admin/links/${link.shortUrl}`);
      toast.success(`/${link.shortUrl} permanently removed`);
      fetchLinks();
    } catch (err: any) {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Search & Filter Controls ───────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-background border border-border p-3 rounded-2xl shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by hash, destination, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-muted-foreground">
            {totalElements} total links
          </span>
        </div>
      </div>

      {/* ── Links Data Table ───────────────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                <th className="py-3 px-4">Short Link</th>
                <th className="py-3 px-4">Original Destination</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-center">Clicks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-3 px-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No links found matching your criteria.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-secondary/30 transition-colors">
                    {/* Short Link Hash */}
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
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
                      <a
                        href={link.longUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground hover:underline inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <span className="truncate">{link.longUrl}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                      </a>
                    </td>

                    {/* Owner Email / Username */}
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="font-medium text-foreground truncate max-w-[140px]">
                        {link.username || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        {link.userEmail}
                      </div>
                    </td>

                    {/* Click Count */}
                    <td className="py-3 px-4 text-center font-semibold text-foreground">
                      {link.totalClicks.toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
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

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {link.isQuarantined ? (
                          <button
                            onClick={() => handleUnquarantine(link)}
                            className="p-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Restore link"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Restore</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openQuarantineModal(link)}
                            className="p-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Quarantine link"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Quarantine</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(link)}
                          className="p-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ──────────────────────────────── */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page + 1} of {Math.max(1, totalPages)}
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

      {/* ── Quarantine Confirmation Modal ───────────────────── */}
      <AnimatePresence>
        {quarantineModalOpen && selectedLink && (
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
                  <h3 className="text-sm font-semibold text-foreground">Quarantine Short Link</h3>
                  <p className="text-xs text-muted-foreground">Stop all incoming visitor traffic</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Quarantining <span className="font-mono font-medium text-foreground">/{selectedLink.shortUrl}</span> will immediately halt redirection. Visitors will see the branded security warning page.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-medium text-foreground">Reason for Quarantine</label>
                <input
                  type="text"
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  placeholder="e.g. Phishing report, malware URL, spam campaign"
                  className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
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
    </div>
  );
};

export default AdminLinksPage;
