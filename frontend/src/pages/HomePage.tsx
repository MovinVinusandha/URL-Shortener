import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Shield,
  BarChart2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import type { UrlSend } from '../types';

interface ShortenedResult {
  shortUrl: string;
  longUrl: string;
}

const HomePage: React.FC = () => {
  const { token } = useAuth();

  const [longUrl, setLongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortenedResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await axiosInstance.post<UrlSend>('/shorten', {
        longUrl: longUrl.trim(),
      });
      setResult({ shortUrl: data.shortUrl, longUrl: data.longUrl });
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Failed to shorten URL. Please try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-violet-400" />,
      title: 'Instant shortening',
      desc: 'Generate a short link in milliseconds — no account required.',
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-indigo-400" />,
      title: 'Click analytics',
      desc: 'Track how many times each link was clicked from your dashboard.',
    },
    {
      icon: <Shield className="w-6 h-6 text-cyan-400" />,
      title: 'Secure & reliable',
      desc: 'JWT-protected management with persistent storage via PostgreSQL.',
    },
  ];

  return (
    <div className="page-bg">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-60 -right-60 w-[700px] h-[700px] bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-violet-500/5 dark:bg-violet-500/10 blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Fast · Free · No signup needed
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-5 animate-slide-up">
            Shorten any URL{' '}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              in one click
            </span>
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up leading-relaxed">
            Paste your long URL below and get a short, shareable link instantly — no account required.
            Sign in to manage, edit, and track all your links from a powerful dashboard.
          </p>

          {/* ── Shorten Form ─────────────────────────────────── */}
          <div className="max-w-2xl mx-auto animate-slide-up">
            <form
              onSubmit={handleShorten}
              className="flex flex-col sm:flex-row gap-3 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/30"
            >
              <div className="flex-1 relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="home-shorten-input"
                  type="url"
                  required
                  value={longUrl}
                  onChange={(e) => { setLongUrl(e.target.value); setResult(null); setError(''); }}
                  className="w-full bg-transparent pl-12 pr-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none"
                  placeholder="Paste your long URL here…"
                />
              </div>
              <button
                id="home-shorten-submit"
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 sm:rounded-xl"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Shortening…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Shorten it
                  </>
                )}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3 text-left animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Result card */}
            {result && (
              <div className="mt-4 card p-4 text-left animate-slide-up">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                  Your short link is ready 🎉
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-violet-600 dark:text-violet-400 font-semibold text-base hover:underline flex items-center gap-1.5 min-w-0"
                  >
                    <span className="truncate">{result.shortUrl}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                  <button
                    id="home-copy-btn"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 truncate">
                  → {result.longUrl}
                </p>
              </div>
            )}

            {/* CTA to dashboard */}
            {token ? (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Go to your{' '}
                <Link to="/dashboard" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                  dashboard
                </Link>{' '}
                to manage, edit, and track all your links.
              </p>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                <Link to="/register" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                  Create a free account
                </Link>{' '}
                to manage, edit, and track your links.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="card p-6 hover:-translate-y-1 transition-transform duration-200 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 group-hover:border-violet-300 dark:group-hover:border-violet-700 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold mb-1.5">{f.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      {!token && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-center shadow-2xl shadow-violet-500/20">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 relative">
              Ready to manage your links?
            </h2>
            <p className="text-violet-100 mb-8 relative">
              Create a free account to get click analytics, edit links, and access your full dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors shadow-lg"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Link2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white font-semibold text-sm">
              Snip<span className="text-violet-500 dark:text-violet-400">URL</span>
            </span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Powered by Spring Boot · Vite · React · Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
