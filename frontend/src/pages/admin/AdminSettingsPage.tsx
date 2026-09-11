import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  SlidersHorizontal, 
  UserPlus, 
  Mail, 
  Save, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { SystemSettingItem } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';

const AdminSettingsPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const { user } = useAuth();

  const [settings, setSettings] = useState<Record<string, string>>({
    allow_registration: 'true',
    require_email_verification: 'true',
    max_links_per_user: '1000'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isRoot = user?.role === 'ROOT' || user?.role === 'ROLE_ROOT';

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get<SystemSettingItem[]>('/admin/settings');
      const map: Record<string, string> = { ...settings };
      data.forEach((s) => {
        map[s.settingKey] = s.settingValue;
      });
      setSettings(map);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  const handleSaveSetting = async (key: string, value: string, description: string) => {
    try {
      setIsSaving(true);
      await axiosInstance.put(`/admin/settings/${key}`, {
        settingValue: value,
        description
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isRoot) {
    return (
      <div className="p-8 border border-amber-500/20 bg-amber-500/10 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 text-sm max-w-xl mx-auto">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Live system configuration is restricted to ROOT instance owners only.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header Card ────────────────────────────────────── */}
      <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5 mb-1">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Zero-Downtime Instance Configuration</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Modify runtime policies directly without editing environment files or rebooting Docker containers.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height={90} borderRadius={16} />
          <Skeleton height={90} borderRadius={16} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Public Registration Policy */}
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Public User Registration</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When disabled, new visitors cannot create accounts via the registration page. Ideal for private homelab setups.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const nextVal = settings.allow_registration === 'true' ? 'false' : 'true';
                handleSaveSetting('allow_registration', nextVal, 'Public user registration toggle');
              }}
              disabled={isSaving}
              className={`px-4 py-2 text-xs font-medium rounded-xl border transition-colors shrink-0 ${
                settings.allow_registration === 'true'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
              }`}
            >
              {settings.allow_registration === 'true' ? 'Registration Open' : 'Registration Closed'}
            </button>
          </div>

          {/* Email Verification Requirement */}
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Require Email Verification</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enforce valid email verification before allowing new signups to shorten links or access personal dashboards.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const nextVal = settings.require_email_verification === 'true' ? 'false' : 'true';
                handleSaveSetting('require_email_verification', nextVal, 'Email verification requirement toggle');
              }}
              disabled={isSaving}
              className={`px-4 py-2 text-xs font-medium rounded-xl border transition-colors shrink-0 ${
                settings.require_email_verification === 'true'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
              }`}
            >
              {settings.require_email_verification === 'true' ? 'Enforced' : 'Optional / Disabled'}
            </button>
          </div>

          {/* Max Links Per User Quota */}
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Max Links Quota per User</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Prevent database exhaustion on self-hosted instances by placing an upper limit on standard member accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="100000"
                value={settings.max_links_per_user || '1000'}
                onChange={(e) => setSettings({ ...settings, max_links_per_user: e.target.value })}
                className="w-24 px-2.5 py-1.5 text-xs bg-secondary/50 border border-border rounded-xl font-mono text-center focus:outline-hidden"
              />
              <button
                onClick={() =>
                  handleSaveSetting(
                    'max_links_per_user',
                    settings.max_links_per_user,
                    'Maximum links per regular user account'
                  )
                }
                disabled={isSaving}
                className="p-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                title="Save quota"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
