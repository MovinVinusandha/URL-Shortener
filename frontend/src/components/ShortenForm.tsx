import React, { useState } from 'react';
import { Link2, Sparkles, AlertCircle } from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import type { UrlSend } from '../types';

interface Props {
  onShorten: (entry: UrlSend) => void;
}

const ShortenForm: React.FC<Props> = ({ onShorten }) => {
  const [longUrl, setLongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setError('');
    setLoading(true);
    try {
      // Exact backend endpoint: POST /shorten (public — no auth needed)
      const { data } = await axiosInstance.post<UrlSend>('/shorten', { longUrl: longUrl.trim() });
      onShorten(data);
      setLongUrl('');
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Failed to shorten URL. Please try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-slate-900 dark:text-white font-semibold">Shorten a URL</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Paste a long URL and get a short link instantly
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            id="shorten-input"
            type="url"
            required
            value={longUrl}
            onChange={(e) => { setLongUrl(e.target.value); setError(''); }}
            className="input-field pl-10"
            placeholder="https://your-very-long-url.com/with/many/path/segments"
          />
        </div>
        <button
          id="shorten-submit"
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Shortening…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Shorten
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ShortenForm;
