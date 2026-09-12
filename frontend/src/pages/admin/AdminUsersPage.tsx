import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { AdminUser, PaginatedAdminUsers } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';

const AdminUsersPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isRoot = currentUser?.role === 'ROOT' || currentUser?.role === 'ROLE_ROOT';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = {
        page,
        size: 15,
        search: searchTerm.trim() || undefined
      };
      const { data } = await axiosInstance.get<PaginatedAdminUsers>('/admin/users', { params });
      setUsers(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load users', err);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleToggleSuspend = async (user: AdminUser) => {
    const actionName = user.isSuspended ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} account "${user.username || user.email}"?`)) {
      return;
    }
    try {
      await axiosInstance.post(`/admin/users/${user.publicId}/suspend`, {
        reason: user.isSuspended ? null : 'Suspended for platform policy violation'
      });
      toast.success(`Account ${user.isSuspended ? 'reactivated' : 'suspended'} successfully`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update account status');
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: 'USER' | 'ADMIN') => {
    if (user.role === newRole) return;
    try {
      await axiosInstance.put(`/admin/users/${user.publicId}/role`, { role: newRole });
      toast.success(`Role for ${user.username} updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Search & Filter Controls ───────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-background border border-border p-3 rounded-2xl shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by username, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </form>

        <span className="text-xs text-muted-foreground">
          {totalElements} registered accounts
        </span>
      </div>

      {/* ── Users Data Table ───────────────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Links</th>
                <th className="py-3 px-4 text-center">Total Clicks</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3 px-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.email === currentUser?.email;
                  const isRootUser = u.role === 'ROOT';

                  return (
                    <tr key={u.id} className="hover:bg-secondary/70 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold uppercase text-[10px] border border-border">
                            {u.username ? u.username.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate max-w-[160px] flex items-center gap-1.5">
                              <span>{u.username || 'User'}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.2 rounded border border-border">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge / Selector */}
                      <td className="py-3 px-4">
                        {isRoot && !isRootUser && !isSelf ? (
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u, e.target.value as 'USER' | 'ADMIN')}
                              className="text-xs bg-background text-foreground border border-border rounded-lg pl-2 pr-6 py-1 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer transition-colors"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.role === 'ROOT' 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                              : u.role === 'ADMIN'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {u.isSuspended ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20"
                            title={u.suspendedReason || 'Suspended'}
                          >
                            <UserX className="w-2.5 h-2.5" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <UserCheck className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </td>

                      {/* Link Count */}
                      <td className="py-3 px-4 text-center font-medium text-foreground">
                        {u.linkCount.toLocaleString()}
                      </td>

                      {/* Click Count */}
                      <td className="py-3 px-4 text-center font-semibold text-foreground">
                        {u.totalClicks.toLocaleString()}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {!isRootUser && !isSelf && (
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                              u.isSuspended
                                ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                                : 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                            }`}
                          >
                            {u.isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
};

export default AdminUsersPage;
