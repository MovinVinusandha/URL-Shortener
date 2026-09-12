import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Wrench, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../components/BrandLogo';
import axiosInstance from '../api/axiosInstance';
import type { PublicAuthConfig } from '../types';
import { toast } from 'react-hot-toast';

const getRootDomain = (): string => {
  const hostname = window.location.hostname;
  if (hostname.startsWith('app.')) {
    return hostname.substring(4);
  }
  return hostname;
};

const MaintenancePage: React.FC = () => {
  const { hash } = useParams<{ hash?: string }>();
  const [isChecking, setIsChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    checkedAt: Date;
    isMaintenance: boolean;
    mode: string;
  } | null>(null);

  const rootDomain = getRootDomain();
  const port = window.location.port && window.location.port !== '80' && window.location.port !== '443' 
    ? `:${window.location.port}` 
    : '';
  const rootUrl = `${window.location.protocol}//${rootDomain}${port}`;

  const checkMaintenanceStatus = async () => {
    try {
      setIsChecking(true);
      const { data } = await axiosInstance.get<PublicAuthConfig>('/auth/config');
      const isMaint = data.systemMode === 'MAINTENANCE';
      setStatusResult({
        checkedAt: new Date(),
        isMaintenance: isMaint,
        mode: data.systemMode || 'NORMAL'
      });

      if (!isMaint) {
        toast.success('Maintenance completed! Normal operations have resumed.');
      } else {
        toast('System maintenance is still in progress.', {
          icon: '⏳',
        });
      }
    } catch (err) {
      toast.error('Unable to reach server status endpoint.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-12 relative select-none font-sans">
      {/* Background subtle mesh */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Subtle radial accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl relative z-10 flex flex-col items-center text-center"
      >
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-center">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo className="w-9 h-9 text-foreground" />
          </Link>
        </div>

        {/* Minimalist Icon Pill */}
        <div className="w-14 h-14 rounded-2xl bg-secondary border border-border text-foreground flex items-center justify-center mb-5 shadow-xs">
          <Wrench className="w-6 h-6 stroke-[1.75]" />
        </div>

        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border border-border text-[11px] font-medium text-muted-foreground mb-4">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span>Under Maintenance</span>
        </div>

        {/* Clean Minimal Title */}
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-6">
          Platform Maintenance in Progress
        </h1>

        {/* Short Link Target Box (If hash was provided) */}
        {hash && (
          <div className="w-full bg-secondary/50 border border-border rounded-xl p-3 mb-6 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Target Identifier:</span>
            <span className="font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border">
              /{hash}
            </span>
          </div>
        )}

        {/* Live Status Diagnostic Card (Upon User Checking) */}
        <AnimatePresence>
          {statusResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`w-full p-3.5 rounded-xl border text-xs text-left mb-6 flex items-center justify-between gap-3 ${
                !statusResult.isMaintenance
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-foreground'
                  : 'bg-secondary border-border text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {!statusResult.isMaintenance ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-medium text-xs truncate">
                    {!statusResult.isMaintenance ? 'Platform is Online' : 'Maintenance Active'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Checked at {statusResult.checkedAt.toLocaleTimeString()} · Mode: {statusResult.mode}
                  </div>
                </div>
              </div>

              {!statusResult.isMaintenance && hash ? (
                <a
                  href={`${rootUrl}/${hash}`}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>Visit Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check System Status Action Button */}
        <button
          type="button"
          onClick={checkMaintenanceStatus}
          disabled={isChecking}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking Platform Status…' : 'Check System Status'}</span>
        </button>
      </motion.div>
    </div>
  );
};

export default MaintenancePage;
