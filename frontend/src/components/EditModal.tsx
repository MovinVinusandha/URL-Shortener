import React, { useState } from 'react';
import { X, Link2, AlertCircle } from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import type { UrlEntry, UrlUpdateDto } from '../types';

interface Props {
  entry: UrlEntry;
  onClose: () => void;
  onUpdated: (updatedEntry: UrlEntry) => void;
}

/** Extracts the hash/slug from the end of a short URL string */
const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const EditModal: React.FC<Props> = ({ entry, onClose, onUpdated }) => {
  const [longUrl, setLongUrl] = useState(entry.longUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim() || longUrl === entry.longUrl) {
      onClose();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const hash = extractHash(entry.shortUrl);
      const { data } = await axiosInstance.put<UrlUpdateDto>(`/url/${hash}`, {
        longUrl: longUrl.trim(),
      });
      onUpdated({
        ...entry,
        longUrl: data.longUrl,
        shortUrl: data.shortUrl,
        updatedAt: data.updatedAt,
      });
      onClose();
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Failed to update the URL. Please try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-lg p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white font-semibold">Edit URL</h2>
              <p className="text-slate-400 dark:text-slate-400 text-xs mt-0.5">
                Hash:{' '}
                <code className="text-violet-600 dark:text-violet-400 font-mono">
                  {extractHash(entry.shortUrl)}
                </code>
              </p>
            </div>
          </div>
          <button
            id="edit-modal-close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current short URL reference */}
        <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
          <p className="text-slate-400 text-xs mb-1 font-medium">Short URL</p>
          <a
            href={entry.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm break-all transition-colors"
          >
            {entry.shortUrl}
          </a>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="edit-long-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              New destination URL
            </label>
            <input
              id="edit-long-url"
              type="url"
              required
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="input-field"
              placeholder="https://new-destination.com"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              id="edit-cancel"
              type="button"
              onClick={onClose}
              className="flex-1 btn-ghost"
            >
              Cancel
            </button>
            <button
              id="edit-save"
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
