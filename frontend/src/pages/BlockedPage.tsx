import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLogo from '../components/BrandLogo';

const BlockedPage: React.FC = () => {
  const { hash } = useParams<{ hash?: string }>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 relative select-none">
      {/* Background radial accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-background border border-border rounded-2xl p-8 shadow-xl relative z-10 flex flex-col items-center text-center"
      >
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-center">
          <BrandLogo className="w-9 h-9 text-foreground" />
        </div>

        {/* Shield Icon Pill */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-5 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Title & Message */}
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Security Warning: Link Blocked
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          The short link you are attempting to visit has been quarantined by administrators because it was flagged for phishing, malware, or policy violations.
        </p>

        {hash && (
          <div className="w-full bg-secondary/50 border border-border/80 rounded-xl p-3 mb-6 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Target Identifier:</span>
            <span className="font-mono font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border">
              /{hash}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 mb-6 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Redirection was halted to protect your browser and personal information.</span>
        </div>

        {/* Return Button */}
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-opacity shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Safe Homepage</span>
        </Link>
      </motion.div>
    </div>
  );
};

export default BlockedPage;
