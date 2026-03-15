import React, { useState } from 'react';
import {
  ExternalLink,
  Pencil,
  Trash2,
  BarChart2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  AlertCircle,
  Activity,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import EditModal from './EditModal';
import type { UrlEntry } from '../types';

interface Props {
  urls: UrlEntry[];
  onUpdated: (index: number, entry: UrlEntry) => void;
  onDeleted: (index: number) => void;
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
  
  return <span className="text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-500/20 px-2 py-1 rounded-md text-xs font-medium">{timeStr}</span>;
};

const UrlTable: React.FC<Props> = ({ urls, onUpdated, onDeleted }) => {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
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

  const sortedWithIndex = [...urls]
    .map((entry, i) => ({ entry, originalIndex: i }))
    .sort((a, b) => {
      const dateA = new Date(a.entry.createdAt.replace(' ', 'T') + 'Z').getTime();
      const dateB = new Date(b.entry.createdAt.replace(' ', 'T') + 'Z').getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  if (urls.length === 0) {
    return (
      <div className="card p-12 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1">No links yet</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Shorten your first URL above to see it here.
        </p>
      </div>
    );
  }

  return (
    <>
      {editIndex !== null && (
        <EditModal
          entry={urls[editIndex]}
          onClose={() => setEditIndex(null)}
          onUpdated={(updated) => {
            onUpdated(editIndex, updated);
            setEditIndex(null);
          }}
        />
      )}

      <div className="card overflow-hidden animate-slide-up">
        {/* Table header controls */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-violet-500 dark:text-violet-400" />
            <h2 className="text-slate-900 dark:text-white font-semibold">Your Links</h2>
            <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold">
              {urls.length}
            </span>
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-medium transition-colors"
            title="Toggle sort order"
          >
            Date
            {sortAsc
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {deleteError && (
          <div className="mx-6 mt-4 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{deleteError}</p>
          </div>
        )}

        {/* ── Desktop table ─────────────────────────────── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {['Original URL', 'Short URL', 'Clicks', 'Status / Expires', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sortedWithIndex.map(({ entry, originalIndex }) => (
                <tr
                  key={`${entry.shortUrl}-${originalIndex}`}
                  className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Original URL */}
                  <td className="px-6 py-4 max-w-xs">
                    <p
                      className="text-slate-700 dark:text-slate-200 text-sm truncate"
                      title={entry.longUrl}
                    >
                      {truncate(entry.longUrl)}
                    </p>
                  </td>

                  {/* Short URL */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={entry.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        {truncate(entry.shortUrl, 30)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {entry.hasPassword && (
                        <div title="Password Protected" className="flex items-center justify-center p-1 bg-violet-100 dark:bg-violet-500/20 rounded-md ml-1 text-violet-600 dark:text-violet-400">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                      <button
                        onClick={() => copyToClipboard(entry.shortUrl, originalIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        title="Copy to clipboard"
                      >
                        {copied === originalIndex
                          ? <Check className="w-4 h-4 text-emerald-500" />
                          : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>

                  {/* Clicks */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                      <BarChart2 className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                      {entry.accessed_times ?? 0}
                    </span>
                  </td>

                  {/* Status / Expires */}
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatExpiration(entry.expiresAt, entry.isActive ?? true)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/analytics/${extractHash(entry.shortUrl)}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                        title="View Analytics"
                      >
                        <Activity className="w-4 h-4" />
                      </Link>

                      <button
                        id={`edit-btn-${originalIndex}`}
                        onClick={() => { setEditIndex(originalIndex); setDeleteConfirm(null); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                        title="Edit URL"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {deleteConfirm === originalIndex ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`confirm-delete-btn-${originalIndex}`}
                            onClick={() => handleDelete(originalIndex)}
                            disabled={deleting === originalIndex}
                            className="px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            {deleting === originalIndex ? (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                Deleting…
                              </span>
                            ) : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`delete-btn-${originalIndex}`}
                          onClick={() => { setDeleteConfirm(originalIndex); setDeleteError(''); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                          title="Delete URL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ──────────────────────────────── */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
          {sortedWithIndex.map(({ entry, originalIndex }) => (
            <div key={`mob-${entry.shortUrl}-${originalIndex}`} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700 dark:text-slate-200 text-sm truncate" title={entry.longUrl}>
                    {truncate(entry.longUrl, 45)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      {truncate(entry.shortUrl, 35)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {entry.hasPassword && (
                      <div title="Password Protected" className="flex items-center justify-center p-0.5 bg-violet-100 dark:bg-violet-500/20 rounded-md text-violet-600 dark:text-violet-400">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-200">
                  <BarChart2 className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                  {entry.accessed_times ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {formatExpiration(entry.expiresAt, entry.isActive ?? true)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(entry.shortUrl, originalIndex)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    {copied === originalIndex
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditIndex(originalIndex)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/analytics/${extractHash(entry.shortUrl)}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                    title="View Analytics"
                  >
                    <Activity className="w-4 h-4" />
                  </Link>
                  {deleteConfirm === originalIndex ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(originalIndex)}
                        disabled={deleting === originalIndex}
                        className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium"
                      >
                        {deleting === originalIndex ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(originalIndex)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default UrlTable;
