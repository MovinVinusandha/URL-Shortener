import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Globe, 
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Search,
  Activity,
  Flame,
  Check,
  RefreshCw,
  Network
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import type { 
  BlacklistedDomainItem, 
  BlockedIpItem, 
  SecurityIncident, 
  PaginatedIncidents,
  ThreatScanResult 
} from '../../types';
import type { AdminLayoutContext } from '../../layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type SecurityTab = 'incidents' | 'scanner' | 'blacklists';

const AdminSecurityPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<AdminLayoutContext>();
  const [activeTab, setActiveTab] = useState<SecurityTab>('incidents');

  // ── Incidents State ──
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState<boolean | null>(false); // default to unresolved
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // ── Threat Scanner State ──
  const [testUrl, setTestUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ThreatScanResult | null>(null);

  // ── Domain Blacklist State ──
  const [domainBlacklist, setDomainBlacklist] = useState<BlacklistedDomainItem[]>([]);
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [domainPattern, setDomainPattern] = useState('');
  const [domainReason, setDomainReason] = useState('');
  const [isDomainSubmitting, setIsDomainSubmitting] = useState(false);

  // ── IP Blacklist State ──
  const [blockedIps, setBlockedIps] = useState<BlockedIpItem[]>([]);
  const [isIpLoading, setIsIpLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [ipReason, setIpReason] = useState('');
  const [isIpSubmitting, setIsIpSubmitting] = useState(false);

  // ── Fetchers ──
  const fetchIncidents = async () => {
    try {
      setIsIncidentsLoading(true);
      const params: any = { page: 0, size: 50 };
      if (filterResolved !== null) {
        params.resolved = filterResolved;
      }
      const { data } = await axiosInstance.get<PaginatedIncidents>('/admin/incidents', { params });
      setIncidents(data.content || []);
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setIsIncidentsLoading(false);
    }
  };

  const fetchDomainBlacklist = async () => {
    try {
      setIsDomainLoading(true);
      const { data } = await axiosInstance.get<BlacklistedDomainItem[]>('/admin/blacklist');
      setDomainBlacklist(data || []);
    } catch (err) {
      console.error('Failed to fetch domain blacklist', err);
    } finally {
      setIsDomainLoading(false);
    }
  };

  const fetchBlockedIps = async () => {
    try {
      setIsIpLoading(true);
      const { data } = await axiosInstance.get<BlockedIpItem[]>('/admin/blocked-ips');
      setBlockedIps(data || []);
    } catch (err) {
      console.error('Failed to fetch blocked IPs', err);
    } finally {
      setIsIpLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchDomainBlacklist();
    fetchBlockedIps();
  }, [refreshTrigger, filterResolved]);

  // ── Incident Actions ──
  const handleResolveIncident = async (id: number) => {
    try {
      setResolvingId(id);
      await axiosInstance.post(`/admin/incidents/${id}/resolve`);
      toast.success('Incident marked as resolved');
      fetchIncidents();
    } catch (err) {
      toast.error('Failed to resolve incident');
    } finally {
      setResolvingId(null);
    }
  };

  // ── Scanner Actions ──
  const handleScanTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testUrl.trim()) {
      toast.error('Please enter a URL to scan');
      return;
    }
    try {
      setIsScanning(true);
      setScanResult(null);
      const { data } = await axiosInstance.post<ThreatScanResult>('/admin/threat-scanner/test', {
        url: testUrl.trim()
      });
      setScanResult(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Threat scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const applyPreset = (presetUrl: string) => {
    setTestUrl(presetUrl);
    setScanResult(null);
  };

  // ── Domain Blacklist Actions ──
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainPattern.trim()) {
      toast.error('Please specify a domain pattern');
      return;
    }
    try {
      setIsDomainSubmitting(true);
      await axiosInstance.post('/admin/blacklist', {
        domainPattern: domainPattern.trim(),
        reason: domainReason.trim() || 'Blocked by administrator'
      });
      toast.success(`Domain "${domainPattern.trim()}" blacklisted`);
      setDomainPattern('');
      setDomainReason('');
      fetchDomainBlacklist();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to blacklist domain');
    } finally {
      setIsDomainSubmitting(false);
    }
  };

  const handleDeleteDomain = async (item: BlacklistedDomainItem) => {
    if (!window.confirm(`Remove "${item.domainPattern}" from blacklist?`)) return;
    try {
      await axiosInstance.delete(`/admin/blacklist/${item.id}`);
      toast.success(`"${item.domainPattern}" removed`);
      fetchDomainBlacklist();
    } catch (err) {
      toast.error('Failed to remove domain');
    }
  };

  // ── IP Blacklist Actions ──
  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) {
      toast.error('Please enter an IP address or CIDR block');
      return;
    }
    try {
      setIsIpSubmitting(true);
      await axiosInstance.post('/admin/blocked-ips', {
        ipAddress: ipAddress.trim(),
        reason: ipReason.trim() || 'Blocked by administrator'
      });
      toast.success(`IP "${ipAddress.trim()}" blacklisted`);
      setIpAddress('');
      setIpReason('');
      fetchBlockedIps();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to blacklist IP');
    } finally {
      setIsIpSubmitting(false);
    }
  };

  const handleDeleteIp = async (item: BlockedIpItem) => {
    if (!window.confirm(`Unblock IP "${item.ipAddress}"?`)) return;
    try {
      await axiosInstance.delete(`/admin/blocked-ips/${item.id}`);
      toast.success(`IP "${item.ipAddress}" unblocked`);
      fetchBlockedIps();
    } catch (err) {
      toast.error('Failed to unblock IP');
    }
  };

  const unresolvedCount = incidents.filter(i => !i.isResolved).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* ── Security Suite Header Tabs ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span>Threat Intelligence & Security Hub</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated heuristic threat scanning, visitor protection, bot containment, and perimeter filtering.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-secondary/40 border border-border rounded-xl">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'incidents'
                ? 'text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'incidents' && (
              <motion.div
                layoutId="security-active-tab-pill"
                className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Incidents</span>
              {unresolvedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-red-500 text-white font-mono font-semibold">
                  {unresolvedCount}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'scanner' && (
              <motion.div
                layoutId="security-active-tab-pill"
                className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>URL Scanner</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('blacklists')}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'blacklists'
                ? 'text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'blacklists' && (
              <motion.div
                layoutId="security-active-tab-pill"
                className="absolute inset-0 bg-foreground rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Blacklists</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: INCIDENTS STREAM ─────────────────────────── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Security Incidents</span>
              <span className="text-xs text-muted-foreground">({incidents.length} recorded)</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterResolved(false)}
                className={`px-2.5 py-1 rounded-lg border transition-colors ${
                  filterResolved === false 
                    ? 'bg-secondary text-foreground border-border font-medium' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Open Only
              </button>
              <button
                onClick={() => setFilterResolved(null)}
                className={`px-2.5 py-1 rounded-lg border transition-colors ${
                  filterResolved === null 
                    ? 'bg-secondary text-foreground border-border font-medium' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                All Incidents
              </button>
            </div>
          </div>

          <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Threat Type</th>
                    <th className="py-3 px-4">Details & Target</th>
                    <th className="py-3 px-4">Source / IP</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isIncidentsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4"><Skeleton width={60} height={18} borderRadius={12} /></td>
                        <td className="py-3 px-4"><Skeleton width={110} height={14} borderRadius={4} /></td>
                        <td className="py-3 px-4"><Skeleton width="85%" height={14} borderRadius={4} /></td>
                        <td className="py-3 px-4"><Skeleton width={90} height={14} borderRadius={4} /></td>
                        <td className="py-3 px-4"><Skeleton width={80} height={14} borderRadius={4} /></td>
                        <td className="py-3 px-4 text-right"><Skeleton width={55} height={22} borderRadius={8} className="ml-auto" /></td>
                      </tr>
                    ))
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-1.5">
                          <ShieldCheck className="w-7 h-7 text-emerald-500 opacity-60" />
                          <span className="font-medium text-foreground">No Security Incidents</span>
                          <span className="text-[11px]">All URL scans and network perimeter checks are clean.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    incidents.map((incident) => {
                      const sevBadgeColor = 
                        incident.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        incident.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        incident.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20';

                      return (
                        <tr key={incident.id} className="hover:bg-secondary/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold font-mono rounded-md border ${sevBadgeColor}`}>
                              {incident.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {incident.incidentType}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-foreground line-clamp-1 font-medium text-xs">
                              {incident.details || 'Threat activity detected'}
                            </div>
                            {incident.targetUrl && (
                              <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5" title={incident.targetUrl}>
                                {incident.targetUrl}
                              </div>
                            )}
                            {incident.shortUrl && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Alias: <span className="font-mono text-foreground font-medium">{incident.shortUrl}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            {incident.clientIp && <div className="font-mono">{incident.clientIp}</div>}
                            {incident.userEmail && <div>{incident.userEmail}</div>}
                            {!incident.clientIp && !incident.userEmail && <div>—</div>}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            {new Date(incident.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {incident.isResolved ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                                <Check className="w-3.5 h-3.5" />
                                <span>Resolved</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleResolveIncident(incident.id)}
                                disabled={resolvingId === incident.id}
                                className="px-2.5 py-1 text-[11px] font-medium bg-secondary text-foreground hover:bg-foreground hover:text-background rounded-lg border border-border transition-colors disabled:opacity-50"
                              >
                                {resolvingId === incident.id ? 'Resolving…' : 'Resolve'}
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
          </div>
        </div>
      )}

      {/* ── TAB 2: LIVE URL SCANNER SANDBOX ─────────────────── */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          <div className="p-5 bg-background border border-border rounded-2xl shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span>On-Demand URL Diagnostic Sandbox</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Test any destination URL against Trim's Heuristic Rules (raw IP hosts, executable droppers, homograph spoofing) and Google Safe Browsing API v4.
              </p>
            </div>

            <form onSubmit={handleScanTest} className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/payload.exe or https://domain.xyz"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground font-mono transition-colors"
              />
              <button
                type="submit"
                disabled={isScanning || !testUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5" />
                    <span>Analyze URL</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <span className="text-[11px]">Test Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('https://github.com')}
                className="px-2 py-0.5 rounded-md bg-secondary text-[11px] hover:text-foreground transition-colors"
              >
                Safe URL
              </button>
              <button
                type="button"
                onClick={() => applyPreset('http://192.168.1.10/payload.exe')}
                className="px-2 py-0.5 rounded-md bg-secondary text-[11px] hover:text-foreground transition-colors"
              >
                Executable / Raw IP
              </button>
              <button
                type="button"
                onClick={() => applyPreset('https://paypal-security-verify.xyz/login')}
                className="px-2 py-0.5 rounded-md bg-secondary text-[11px] hover:text-foreground transition-colors"
              >
                Phishing Lure
              </button>
            </div>
          </div>

          {/* Scan Results Presentation */}
          {scanResult && (
            <div className="p-5 bg-background border border-border rounded-2xl shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {scanResult.safe ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {scanResult.safe ? 'URL Verified Clean' : 'Potential Threat Flagged'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Classification: <span className="font-mono font-medium text-foreground">{scanResult.threatType}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                  <div className={`text-base font-bold font-mono ${
                    scanResult.riskScore >= 70 ? 'text-red-500' :
                    scanResult.riskScore >= 40 ? 'text-orange-500' :
                    'text-emerald-500'
                  }`}>
                    {scanResult.riskScore} <span className="text-[10px] text-muted-foreground font-normal">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Engine & Latency info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Inspection Engine</span>
                  <span className="font-medium text-foreground font-mono">{scanResult.engine}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Scan Duration</span>
                  <span className="font-medium text-foreground font-mono">{scanResult.scanDurationMs} ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Automated Action</span>
                  <span className="font-medium text-foreground">
                    {scanResult.safe ? 'Approved for Redirection' : 'Auto-Quarantined'}
                  </span>
                </div>
              </div>

              {/* Threats breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Detected Threat Indicators</h4>
                {scanResult.detectedThreats.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No heuristic or reputation anomalies found. URL passes security policy.</span>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {scanResult.detectedThreats.map((threat, index) => (
                      <li key={index} className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/15 text-xs text-foreground flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{threat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BLACKLISTS (DOMAINS & IPS) ────────────────── */}
      {activeTab === 'blacklists' && (
        <div className="space-y-8">
          {/* Policy Information */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border flex items-start gap-3 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-foreground">Perimeter & Content Policy:</span> Blacklisted domains cannot be shortened or redirected to. Blacklisted IP addresses and CIDR subnets are rejected at the API perimeter with <code className="font-mono text-foreground">403 Forbidden</code>.
            </div>
          </div>

          {/* 1. Prohibited Domain Patterns */}
          <div className="space-y-4">
            <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>Add Domain to Blocklist</span>
              </h2>

              <form onSubmit={handleAddDomain} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Domain (e.g. *.malware.com or spam.biz)"
                    value={domainPattern}
                    onChange={(e) => setDomainPattern(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground font-mono transition-colors"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Reason (e.g. Known credential phishing)"
                    value={domainReason}
                    onChange={(e) => setDomainReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isDomainSubmitting || !domainPattern.trim()}
                    className="w-full h-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isDomainSubmitting ? 'Blocking…' : 'Block'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Prohibited Domain Patterns</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {domainBlacklist.length} {domainBlacklist.length === 1 ? 'rule' : 'rules'} active
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
                    {isDomainLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3 px-4 font-mono"><Skeleton width={130} height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4"><Skeleton width="75%" height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4"><Skeleton width={75} height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4 text-right"><Skeleton width={28} height={28} borderRadius={8} className="ml-auto" /></td>
                        </tr>
                      ))
                    ) : domainBlacklist.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No domains are currently blacklisted.
                        </td>
                      </tr>
                    ) : (
                      domainBlacklist.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/70 transition-colors">
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
                              onClick={() => handleDeleteDomain(item)}
                              className="p-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
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

          {/* 2. Perimeter Blocked IP Addresses */}
          <div className="space-y-4">
            <div className="p-5 bg-background border border-border rounded-2xl shadow-xs">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                <span>Block Client IP or CIDR Subnet</span>
              </h2>

              <form onSubmit={handleAddIp} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="IP or CIDR (e.g. 192.168.1.100 or 10.0.0.0/8)"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground font-mono transition-colors"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Reason (e.g. Automated bot flood / brute force)"
                    value={ipReason}
                    onChange={(e) => setIpReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isIpSubmitting || !ipAddress.trim()}
                    className="w-full h-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isIpSubmitting ? 'Blocking…' : 'Block IP'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-background border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Perimeter Blocked IP Addresses</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {blockedIps.length} {blockedIps.length === 1 ? 'address' : 'addresses'} blocked
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-medium">
                      <th className="py-3 px-4">IP / CIDR</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Blocked On</th>
                      <th className="py-3 px-4 text-right">Unblock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    {isIpLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3 px-4 font-mono"><Skeleton width={110} height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4"><Skeleton width="75%" height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4"><Skeleton width={75} height={14} borderRadius={4} /></td>
                          <td className="py-3 px-4 text-right"><Skeleton width={28} height={28} borderRadius={8} className="ml-auto" /></td>
                        </tr>
                      ))
                    ) : blockedIps.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No IP addresses are currently blocked.
                        </td>
                      </tr>
                    ) : (
                      blockedIps.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {item.ipAddress}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {item.reason || 'Blocked by administrator'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteIp(item)}
                              className="p-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-lg transition-colors"
                              title="Unblock IP"
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
        </div>
      )}
    </motion.div>
  );
};

export default AdminSecurityPage;
