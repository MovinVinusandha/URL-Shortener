import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Globe, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { BlacklistedDomainItem } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';

const AdminSecurityPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [blacklist, setBlacklist] = useState<BlacklistedDomainItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [pattern, setPattern] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBlacklist = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get<BlacklistedDomainItem[]>('/admin/blacklist');
      setBlacklist(data || []);
    } catch (err) {
      console.error('Failed to fetch blacklist', err);
      toast.error('Failed to load blacklist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, [refreshTrigger]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) {
      toast.error('Please specify a domain pattern');
      return;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.post('/admin/blacklist', {
        domainPattern: pattern.trim(),
        reason: reason.trim() || 'Blocked by administrator'
      });
      toast.success(`Domain "${pattern.trim()}" blacklisted`);
      setPattern('');
      setReason('');
      fetchBlacklist();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to blacklist domain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: BlacklistedDomainItem) => {
    if (!window.confirm(`Remove "${item.domainPattern}" from blacklist?`)) {
      return;
    }
    try {
      await axiosInstance.delete(`/admin/blacklist/${item.id}`);
      toast.success(`"${item.domainPattern}" removed from blacklist`);
      fetchBlacklist();
    } catch (err) {
      toast.error('Failed to remove domain');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Security Policy Info Banner ─────────────────────── */}
      <div className="p-4 rounded-2xl bg-secondary/40 border border-border flex items-start gap-3 text-xs text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground">Anti-Abuse Engine:</span> Blacklisted domains and wildcards (e.g. <code className="font-mono text-foreground">*.badsite.com</code> or <code className="font-mono text-foreground">phishing.xyz</code>) cannot be shortened by any user. Existing links targeting these domains are also blocked from redirecting.
        </div>
      </div>

      {/* ── Add New Blacklist Domain Form ──────────────────── */}
      <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <span>Add Domain to Blocklist</span>
        </h2>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Domain (e.g. *.malware.com or spam.biz)"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-mono"
            />
          </div>
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Reason (e.g. Known credential phishing)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || !pattern.trim()}
              className="w-full h-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Blocking…' : 'Block'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Blacklisted Domains Table ──────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Prohibited Domain Patterns</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {blacklist.length} {blacklist.length === 1 ? 'rule' : 'rules'} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                <th className="py-3 px-4">Pattern</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Added On</th>
                <th className="py-3 px-4 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="py-3 px-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  </tr>
                ))
              ) : blacklist.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
                      <span>No domains are currently blacklisted.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                blacklist.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {item.domainPattern}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.reason || 'Blocked by administrator'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-lg transition-colors"
                        title="Remove domain rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSecurityPage;
