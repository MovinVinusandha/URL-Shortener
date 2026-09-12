import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  SlidersHorizontal, 
  UserPlus, 
  Mail, 
  Save, 
  ShieldCheck, 
  AlertCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  RefreshCw,
  Clock,
  Shield,
  Radio,
  Server,
  Key,
  Globe,
  Database
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { SystemSettingItem, EnvironmentVaultItem, SmtpTestResult } from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type SettingsTab = 'policies' | 'panic' | 'vault' | 'smtp';

const AdminSettingsPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('policies');
  const [settings, setSettings] = useState<Record<string, string>>({
    allow_registration: 'true',
    require_email_verification: 'true',
    max_links_per_user: '1000',
    panic_mode: 'NORMAL',
    default_link_expiration_days: '0',
    safe_browsing_api_key: ''
  });

  const [vaultItems, setVaultItems] = useState<EnvironmentVaultItem[]>([]);
  const [vaultCategory, setVaultCategory] = useState<string>('ALL');
  const [vaultSearch, setVaultSearch] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // SMTP Test State
  const [testEmail, setTestEmail] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<SmtpTestResult | null>(null);

  // Inline editing in Vault
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const isRoot = user?.role === 'ROOT' || user?.role === 'ROLE_ROOT';

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get<SystemSettingItem[]>('/admin/settings');
      const map: Record<string, string> = { ...settings };
      data.forEach((s) => {
        map[s.settingKey.toLowerCase()] = s.settingValue;
      });
      setSettings(map);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVault = async () => {
    try {
      setIsVaultLoading(true);
      const { data } = await axiosInstance.get<EnvironmentVaultItem[]>('/admin/settings/vault');
      setVaultItems(data);
    } catch (err) {
      console.error('Failed to load environment vault', err);
    } finally {
      setIsVaultLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (isRoot) {
      fetchVault();
    }
  }, [refreshTrigger]);

  const handleSaveSetting = async (key: string, value: string, description: string) => {
    try {
      setIsSaving(true);
      await axiosInstance.put(`/admin/settings/${key}`, {
        settingValue: value,
        description
      });
      setSettings((prev) => ({ ...prev, [key.toLowerCase()]: value }));
      toast.success('Setting updated successfully');
      fetchVault();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVaultVariable = async (key: string, value: string) => {
    try {
      setIsSaving(true);
      await axiosInstance.put('/admin/settings/vault', {
        key,
        value
      });
      toast.success(`Updated ${key} and synced to .env & runtime`);
      setEditingKey(null);
      fetchVault();
      fetchSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to update ${key}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid recipient email');
      return;
    }

    try {
      setIsTestingSmtp(true);
      setSmtpResult(null);
      const { data } = await axiosInstance.post<SmtpTestResult>('/admin/settings/test-smtp', {
        recipientEmail: testEmail.trim()
      });
      setSmtpResult(data);
      if (data.success) {
        toast.success('SMTP diagnostic test passed!');
      } else {
        toast.error('SMTP test delivery failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'SMTP diagnostic request failed');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (key: string) => {
    setRevealedSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isRoot) {
    return (
      <div className="p-8 border border-amber-500/20 bg-amber-500/10 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 text-sm max-w-xl mx-auto">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Live system configuration is restricted to ROOT instance owners only.</span>
      </div>
    );
  }

  const currentPanicMode = (settings.panic_mode || 'NORMAL').toUpperCase();

  const filteredVaultItems = vaultItems.filter(item => {
    const matchesCat = vaultCategory === 'ALL' || item.category === vaultCategory;
    const matchesSearch = !vaultSearch || 
      item.key.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(vaultSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* ── Top Header & Tab Strip ───────────────────────────── */}
      <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <SlidersHorizontal className="w-4 h-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Configuration & Environment Vault</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-secondary border border-border text-foreground">
                ROOT ONLY
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage zero-downtime policies, trigger emergency lockdown, test SMTP dispatch, and synchronize .env settings.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-secondary/40 border border-border rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('policies')}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'policies'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'policies' && (
                <motion.div
                  layoutId="settings-active-tab-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Runtime Policies</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('panic')}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'panic'
                  ? 'text-background font-semibold'
                  : currentPanicMode !== 'NORMAL'
                  ? 'text-amber-500 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'panic' && (
                <motion.div
                  layoutId="settings-active-tab-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${currentPanicMode !== 'NORMAL' ? (activeTab === 'panic' ? 'text-background' : 'text-red-500') + ' animate-pulse' : ''}`} />
                <span>Panic Switch</span>
                {currentPanicMode !== 'NORMAL' && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-semibold ${
                    activeTab === 'panic' ? 'bg-background text-foreground' : 'bg-red-500 text-white'
                  }`}>
                    ACTIVE
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'vault' && (
                <motion.div
                  layoutId="settings-active-tab-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Environment Vault</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'smtp'
                  ? 'text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === 'smtp' && (
                <motion.div
                  layoutId="settings-active-tab-pill"
                  className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>SMTP Diagnostics</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Panic Mode Alert Banner ───────────────────── */}
      {currentPanicMode !== 'NORMAL' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          currentPanicMode === 'MAINTENANCE'
            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider">
                Emergency Lockdown Active: {currentPanicMode}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {currentPanicMode === 'MAINTENANCE'
                  ? 'Both link creation and URL redirection are currently halted. Public visitors see maintenance status.'
                  : 'System is read-only. URL redirection is functional, but link creation and registrations are rejected.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSaveSetting('PANIC_MODE', 'NORMAL', 'Restored normal operations')}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-background border border-border text-foreground hover:bg-secondary shrink-0 shadow-xs"
          >
            Deactivate Lockdown
          </button>
        </div>
      )}

      {/* ── TAB 1: RUNTIME POLICIES ──────────────────────────── */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Skeleton width={36} height={36} borderRadius={12} className="shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton width={160} height={15} borderRadius={4} />
                      <Skeleton width={260} height={12} borderRadius={4} />
                    </div>
                  </div>
                  <Skeleton width={110} height={34} borderRadius={12} className="shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Public Registration Policy */}
              <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Public User Registration</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      When disabled, new visitors cannot sign up via the register page. Ideal for private homelab deployments.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextVal = settings.allow_registration === 'true' ? 'false' : 'true';
                    handleSaveSetting('ALLOW_REGISTRATION', nextVal, 'Public user registration toggle');
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
                      Enforce valid email verification before allowing accounts to shorten URLs or access features.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextVal = settings.require_email_verification === 'true' ? 'false' : 'true';
                    handleSaveSetting('REQUIRE_EMAIL_VERIFICATION', nextVal, 'Email verification requirement toggle');
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

              {/* Max Links Quota */}
              <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Max Links Quota per User</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Prevents database exhaustion on self-hosted instances by placing an upper bound on regular member links.
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
                    className="w-24 px-3 py-1.5 text-xs bg-background border border-border rounded-lg font-mono text-center text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'MAX_LINKS_PER_USER',
                        settings.max_links_per_user,
                        'Maximum links per regular user account'
                      )
                    }
                    disabled={isSaving}
                    className="p-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    title="Save quota"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Default Link Expiration Policy */}
              <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Default Link Expiration (Days)</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Automatically applies an expiration date to new links (e.g. 90 or 180 days). Set to 0 for permanent links.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="3650"
                    value={settings.default_link_expiration_days || '0'}
                    onChange={(e) => setSettings({ ...settings, default_link_expiration_days: e.target.value })}
                    className="w-24 px-3 py-1.5 text-xs bg-background border border-border rounded-lg font-mono text-center text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'DEFAULT_LINK_EXPIRATION_DAYS',
                        settings.default_link_expiration_days,
                        'Default forced link expiration policy'
                      )
                    }
                    disabled={isSaving}
                    className="p-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    title="Save default expiration"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Safe Browsing API Key */}
              <div className="p-5 bg-background border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Google Safe Browsing API Key</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Live runtime override for Threat Scanner v4 integration. Updates immediately without container restart.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={settings.safe_browsing_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, safe_browsing_api_key: e.target.value })}
                    className="flex-1 sm:w-64 px-3 py-1.5 text-xs bg-background border border-border rounded-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    onClick={() =>
                      handleSaveSetting(
                        'SAFE_BROWSING_API_KEY',
                        settings.safe_browsing_api_key,
                        'Google Safe Browsing API Key override'
                      )
                    }
                    disabled={isSaving}
                    className="p-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    title="Save API key"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: EMERGENCY PANIC SWITCH ───────────────────── */}
      {activeTab === 'panic' && (
        <div className="space-y-4">
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-foreground">Root Emergency Lockdown Control</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Instantly lock down instance mutations during cyber attacks, zero-day vulnerabilities, or database maintenance without terminating containers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal Mode */}
              <div 
                onClick={() => handleSaveSetting('PANIC_MODE', 'NORMAL', 'Restored normal operations')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentPanicMode === 'NORMAL'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                    : 'border-border hover:border-foreground/30 bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Normal Operations</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${currentPanicMode === 'NORMAL' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Full functionality enabled. Link creation, user registration, API endpoints, and redirects run normally.
                </p>
              </div>

              {/* Read-Only Redirection Mode */}
              <div 
                onClick={() => handleSaveSetting('PANIC_MODE', 'READ_ONLY', 'Activated read-only lockdown')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentPanicMode === 'READ_ONLY'
                    ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                    : 'border-border hover:border-foreground/30 bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Read-Only Lockdown</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${currentPanicMode === 'READ_ONLY' ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Preserves existing link redirects via Redis & DB cache. Freezes new link generation, registrations, and batch campaigns.
                </p>
              </div>

              {/* Full Maintenance Mode */}
              <div 
                onClick={() => handleSaveSetting('PANIC_MODE', 'MAINTENANCE', 'Activated maintenance mode')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentPanicMode === 'MAINTENANCE'
                    ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500/20'
                    : 'border-border hover:border-foreground/30 bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Full Maintenance</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${currentPanicMode === 'MAINTENANCE' ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pauses both link creation and public URL redirection. Displays maintenance response for maintenance windows.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ENVIRONMENT VAULT & .ENV SYNC ─────────────── */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          <div className="p-4 bg-background border border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {['ALL', 'SYSTEM', 'DATABASE', 'ROUTING', 'SECURITY', 'MAIL', 'OAUTH'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setVaultCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                    vaultCategory === cat
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search variables..."
                value={vaultSearch}
                onChange={e => setVaultSearch(e.target.value)}
                className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg w-48 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                onClick={fetchVault}
                disabled={isVaultLoading}
                className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                title="Refresh Vault"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVaultLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {isVaultLoading ? (
            <div className="space-y-2.5 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 bg-background border border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton width={140} height={14} borderRadius={4} />
                      <Skeleton width={60} height={14} borderRadius={4} />
                      <Skeleton width={50} height={14} borderRadius={4} />
                    </div>
                    <Skeleton width="70%" height={12} borderRadius={4} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton width={180} height={28} borderRadius={8} />
                    <Skeleton width={32} height={28} borderRadius={8} />
                    <Skeleton width={32} height={28} borderRadius={8} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredVaultItems.map((item) => {
                const isMasked = item.isSecret && !revealedSecrets[item.key];
                const displayVal = isMasked ? '••••••••••••••••••••' : item.value;
                const isEditing = editingKey === item.key;

                return (
                  <div
                    key={item.key}
                    className="p-4 bg-background border border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground tracking-tight">
                          {item.key}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono bg-secondary border border-border text-muted-foreground uppercase">
                          {item.category}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono border ${
                          item.source === 'DYNAMIC_OVERRIDE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}>
                          {item.source}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type={item.isSecret ? 'password' : 'text'}
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg font-mono text-foreground w-48 sm:w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateVaultVariable(item.key, editingValue)}
                            disabled={isSaving}
                            className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                            title="Save change"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="p-1.5 rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="px-2.5 py-1 rounded-lg bg-secondary/50 border border-border font-mono text-xs text-foreground max-w-xs truncate">
                            {displayVal || <span className="text-muted-foreground italic">(empty)</span>}
                          </div>

                          {item.isSecret && (
                            <button
                              onClick={() => toggleReveal(item.key)}
                              className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                              title={revealedSecrets[item.key] ? 'Mask Secret' : 'Reveal Secret'}
                            >
                              {revealedSecrets[item.key] ? (
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => copyToClipboard(item.key, item.value)}
                            className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                            title="Copy value"
                          >
                            {copiedKey === item.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingKey(item.key);
                              setEditingValue(item.value);
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredVaultItems.length === 0 && (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                  No environment variables found matching the filter criteria.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SMTP DIAGNOSTICS ──────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="space-y-4">
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">SMTP Handshake & Mail Delivery Tester</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Dispatch an end-to-end test verification email to measure connection latency and verify outbound SMTP delivery.
            </p>

            <form onSubmit={handleTestSmtp} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                placeholder="Enter recipient email (e.g. admin@yourdomain.com)"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                required
                className="w-full sm:flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                type="submit"
                disabled={isTestingSmtp}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isTestingSmtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing Delivery...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Test Email
                  </>
                )}
              </button>
            </form>

            {/* Diagnostic Results Banner */}
            {smtpResult && (
              <div className={`mt-4 p-4 rounded-xl border text-xs ${
                smtpResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">
                    {smtpResult.success ? '✓ Delivery Diagnostic Succeeded' : '✗ Delivery Diagnostic Failed'}
                  </span>
                  <span className="font-mono text-[11px] opacity-80">
                    Latency: {smtpResult.latencyMs}ms
                  </span>
                </div>
                <p className="text-[11px] opacity-90">{smtpResult.message}</p>
                <div className="mt-2 text-[10px] font-mono opacity-75">
                  Host: {smtpResult.host}:{smtpResult.port} | Sender: {smtpResult.fromEmail || 'Default'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminSettingsPage;
