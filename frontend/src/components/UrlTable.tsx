// @ts-nocheck
import React, { useState } from 'react';
import {
  ExternalLink,
  Pencil,
  Trash2,
  BarChart2,
  Copy,
  Check,
  Link2,
  AlertCircle,
  Activity,
  Lock,
  QrCode,
  ArrowRight,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import type { UrlEntry } from '../types';
import { getTagColorClasses } from '../utils/tagColors';

interface Props {
  urls: UrlEntry[];
  onDeleted: (index: number) => void;
  onOpenQr?: (hash: string) => void;
  onEdit?: (index: number) => void;
  headerRightNode?: React.ReactNode;
}

const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const truncate = (str: string, max = 55): string =>
  str.length > max ? str.slice(0, max) + '…' : str;

const formatExpiration = (expiresAt: string | null | undefined, isActive: boolean) => {
  if (!isActive) {
    return <span className="text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded-md text-xs font-medium">Expired</span>;
  }
  if (!expiresAt) {
    return <span className="text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs font-medium">Never</span>;
  }
  
  const now = new Date();
  // Backend returns yyyy-MM-dd HH:mm:ss, append Z to parse as UTC.
  // Replace space with T to be safe.
  const expDate = new Date(expiresAt.replace(' ', 'T') + 'Z');
  const diffMs = expDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return <span className="text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded-md text-xs font-medium">Expired</span>;
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  let timeStr = '';
  if (diffDays > 0) {
    timeStr = `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    timeStr = `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    timeStr = `In ${diffMins} min${diffMins > 1 ? 's' : ''}`;
  }
  
  return <span className="text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-xs font-medium">{timeStr}</span>;
};

const UrlTable: React.FC<Props> = ({ urls, onDeleted,  onOpenQr,
  onEdit,
  headerRightNode,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const copyToClipboard = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (index: number) => {
    const hash = extractHash(urls[index].shortUrl);
    setDeleting(index);
    setDeleteError('');
    try {
      await axiosInstance.delete(`/url/${hash}`);
      onDeleted(index);
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Delete failed. Please try again.');
      setDeleteError(backendMessage);
    } finally {
      setDeleting(null);
    }
  };

  const sortedWithIndex = urls.map((entry, i) => ({ entry, originalIndex: i }));

  if (!urls || urls.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center animate-slide-up">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Link2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No links yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Shorten your first URL above and it will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table header controls are now managed by DashboardPage natively, but we keep error display */}
      {deleteError && (
        <div className="mb-4 flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-rose-500 text-sm">{deleteError}</p>
        </div>
      )}

      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden flex flex-col gap-0 divide-y divide-border">
        {sortedWithIndex.map(({ entry, originalIndex }) => (
          <div key={`${entry.shortUrl}-${originalIndex}`} className="px-3 py-2 hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all group flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center bg-card shrink-0 overflow-hidden shadow-sm">
                {/* Fallback globe icon for generic URLs */}
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="flex items-center gap-2">
                  <a href={`${window.location.origin}/${extractHash(entry.shortUrl)}`} target="_blank" rel="noreferrer" className="font-medium text-sm text-foreground hover:underline truncate">
                    {`${window.location.host}/${extractHash(entry.shortUrl)}`}
                  </a>
                  <button onClick={() => copyToClipboard(`${window.location.origin}/${extractHash(entry.shortUrl)}`, originalIndex)} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" title="Copy">
                    {copied === originalIndex ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {entry.hasPassword && <Lock className="w-3 h-3 text-primary shrink-0" title="Password Protected" />}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground truncate flex-1">
                  <ArrowRight className="w-3 h-3 shrink-0 hidden sm:block" />
                  <span className="truncate" title={entry.longUrl}>{entry.longUrl}</span>
                  
                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="hidden md:flex items-center gap-1 shrink-0 ml-1">
                      {entry.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-[#18181B] text-foreground border border-neutral-200/80 dark:border-[#27272A] shadow-sm"
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: tag.color || '#3b82f6' }}
                          />
                          <span>{tag.name}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {formatExpiration(entry.expiresAt, entry.isActive ?? true)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Link to={`/analytics/${extractHash(entry.shortUrl)}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors shadow-sm">
                <BarChart2 className="w-3 h-3 text-primary" />
                {entry.accessed_times ?? 0} clicks
              </Link>
              
              <div className="flex items-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-1">
                {deleteConfirm === originalIndex ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(originalIndex)} disabled={deleting === originalIndex} className="px-2 py-1 bg-red-100 dark:bg-rose-500/20 text-red-600 dark:text-rose-400 rounded text-xs font-medium hover:bg-red-200">
                      {deleting === originalIndex ? '...' : 'Yes'}
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-secondary text-foreground rounded text-xs font-medium hover:bg-secondary/80">No</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onOpenQr && onOpenQr(extractHash(entry.shortUrl))} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-colors" title="QR Code">
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (onEdit) onEdit(originalIndex); }} className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-secondary transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(originalIndex)} className="p-1 text-muted-foreground hover:text-rose-500 rounded hover:bg-secondary transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UrlTable;
