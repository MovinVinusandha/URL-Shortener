import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Sparkles, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import UrlTable from '../components/UrlTable';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto, UrlSend } from '../types';

/** Helper to extract hash from short URL */
const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const generateRandomHash = () => Math.random().toString(36).substring(2, 8);

const mapDtoToEntry = (d: UrlDto): UrlEntry => ({
  longUrl: d.longUrl,
  shortUrl: d.shortUrl,
  accessed_times: d.accessed_times ?? 0,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

/**
 * DashboardPage (protected — route: /dashboard)
 *
 * Persistence Strategy:
 *  1. ADMIN/ROOT users: GET /url/all returns full server list on mount.
 *  2. Regular users: Backend lacks user-specific list endpoint. We store URLs in
 *     user-scoped localStorage (`user_urls_${user.id || user.email}`).
 *  3. On mount for regular users, cached URLs are loaded from localStorage AND
 *     background-synced via GET /url/{hash} to update live click counts (accessed_times).
 *  4. Adding (POST /shorten), Editing (PUT /url/{hash}), and Deleting (DELETE /url/{hash})
 *     update both React state and localStorage.
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  
  // Inline Shorten Form states
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');

  const urlsRef = useRef(urls);

  urlsRef.current = urls;

  // Scoped key based on logged in user's ID or email to prevent cross-account leak
  const storageKey = user ? `user_urls_${user.id ?? user.email}` : null;

  /** Save URLs to localStorage for regular users */
  const saveToStorage = useCallback(
    (newUrls: UrlEntry[]) => {
      if (storageKey && !isAdmin) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newUrls));
        } catch {
          // Ignore quota / storage disabled errors
        }
      }
    },
    [storageKey, isAdmin]
  );

  /** Refresh live click counts via GET /url/{hash} for each entry */
  const syncClickCounts = useCallback(async (entries: UrlEntry[]): Promise<UrlEntry[]> => {
    if (entries.length === 0) return entries;

    const updatedUrls = await Promise.all(
      entries.map(async (entry) => {
        try {
          const hash = extractHash(entry.shortUrl);
          const { data: updatedDto } = await axiosInstance.get<any>(`/url/${hash}`);
          
          const freshClicks = updatedDto.accessed_times ?? updatedDto.accessedTimes ?? updatedDto.clicks ?? 0;
          
          return {
            ...entry,
            longUrl: updatedDto.longUrl,
            accessed_times: freshClicks,
            updatedAt: updatedDto.updatedAt,
          };
        } catch (err: any) {
          if (err.response?.status === 404) {
            console.warn(`URL ${entry.shortUrl} was deleted remotely. Removing from local cache.`);
            return null;
          }
          console.error(`Failed to refresh stats for ${entry.shortUrl}`, err);
          return entry;
        }
      })
    );
    
    return updatedUrls.filter((u): u is UrlEntry => u !== null);
  }, []);

  useEffect(() => {
    setCustomAlias(generateRandomHash());
  }, []);

  // Initial load logic on mount / user change
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoadingAll(true);

      // STEP 1: Try Admin endpoint GET /url/all
      try {
        const { data } = await axiosInstance.get<UrlDto[]>('/url/all');
        if (isMounted) {
          setIsAdmin(true);
          const serverUrls = data.map(mapDtoToEntry);
          setUrls(serverUrls);
          setLoadingAll(false);

          // Background refresh so click counts stay live while the dashboard is open
          syncClickCounts(serverUrls).then((freshUrls) => {
            if (isMounted) {
              setUrls(freshUrls);
            }
          });
          return;
        }
      } catch {
        // 403 Forbidden = Regular User (NO server-side list endpoint)
        if (isMounted) {
          setIsAdmin(false);
        }
      }

      // STEP 2: Regular User — Load from user-scoped localStorage
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const cached: UrlEntry[] = JSON.parse(raw);
            if (isMounted && Array.isArray(cached)) {
              setUrls(cached);
            }

            // Background sync: Fetch latest click counts via GET /url/{hash}
            const freshUrls = await syncClickCounts(cached);
            if (isMounted) {
              setUrls(freshUrls);
              localStorage.setItem(storageKey, JSON.stringify(freshUrls));
            }
          }
        } catch {
          // If storage parsing fails, start empty
        }
      }

      if (isMounted) {
        setLoadingAll(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [storageKey, syncClickCounts]);

  // Periodically refresh click counts while the dashboard is visible
  useEffect(() => {
    if (urls.length === 0) return;

    let cancelled = false;

    const refreshCounts = async () => {
      const freshUrls = await syncClickCounts(urlsRef.current);
      if (!cancelled) {
        setUrls(freshUrls);
        saveToStorage(freshUrls);
      }
    };

    const intervalId = window.setInterval(refreshCounts, 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCounts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [urls.length, syncClickCounts, saveToStorage]);

  /** Called when ShortenForm successfully shortens a URL */
  const handleShortened = (newEntry: UrlSend) => {
    const created: UrlEntry = {
      longUrl: newEntry.longUrl,
      shortUrl: newEntry.shortUrl,
      accessed_times: 0,
      createdAt: newEntry.createdAt,
    };
    setUrls((prev) => {
      const updatedList = [created, ...prev];
      saveToStorage(updatedList);
      return updatedList;
    });
    setCustomAlias(generateRandomHash());
  };

  const handleShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setShortenError('');
    setShortenLoading(true);
    try {
      const { data } = await axiosInstance.post<UrlSend>('/shorten', { 
        longUrl: longUrl.trim(),
        customAlias: customAlias.trim() || undefined
      });
      handleShortened(data);
      setLongUrl('');
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        setShortenError('This custom alias is already taken. Please choose another one.');
      } else {
        setShortenError(err.response?.data?.message || 'Failed to shorten URL. Please try again.');
      }
    } finally {
      setShortenLoading(false);
    }
  };

  /** Called when EditModal saves an update */
  const handleUpdated = (index: number, updated: UrlEntry) => {
    setUrls((prev) => {
      const updatedList = prev.map((u, i) => (i === index ? updated : u));
      saveToStorage(updatedList);
      return updatedList;
    });
  };

  /** Called when UrlTable confirms a delete */
  const handleDeleted = (index: number) => {
    setUrls((prev) => {
      const updatedList = prev.filter((_, i) => i !== index);
      saveToStorage(updatedList);
      return updatedList;
    });
  };

  const totalClicks = urls.reduce((acc, u) => acc + (u.accessed_times ?? 0), 0);
  const topClicks = urls.length ? Math.max(...urls.map((u) => u.accessed_times ?? 0)) : 0;

  return (
    <div className="page-bg">
      <Navbar />

      {/* Subtle background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Greeting ─────────────────────────────────────── */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Good to see you,{' '}
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              {user?.name?.split(' ')[0] ?? 'there'}
            </span>{' '}
            👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            {isAdmin
              ? 'You have admin access — all links are visible below.'
              : 'Shorten a URL below. Your links are saved automatically to your account dashboard.'}
          </p>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        {urls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-slide-up">
            <div className="card p-5">
              <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Total Links
              </p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{urls.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Total Clicks
              </p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{totalClicks}</p>
            </div>
            <div className="col-span-2 md:col-span-1 card p-5">
              <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Top Link Clicks
              </p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{topClicks}</p>
            </div>
          </div>
        )}

        {/* ── Shorten form ─────────────────────────────────── */}
        {user?.role !== 'ROOT' && user?.role !== 'ROLE_ROOT' && (
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-white font-semibold">Shorten a URL</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Paste a long URL and customize your short link
                </p>
              </div>
            </div>

            {shortenError && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">{shortenError}</p>
              </div>
            )}

            <form onSubmit={handleShortenSubmit} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="shorten-input"
                    type="url"
                    required
                    value={longUrl}
                    onChange={(e) => { setLongUrl(e.target.value); setShortenError(''); }}
                    className="input-field pl-10"
                    placeholder="https://your-very-long-url.com/with/many/path/segments"
                  />
                </div>
                <button
                  id="shorten-submit"
                  type="submit"
                  disabled={shortenLoading}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  {shortenLoading ? (
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
              </div>
              
              {/* Custom Alias Input */}
              <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
                <div className="flex items-center w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-violet-500 dark:focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-3 py-2.5 text-sm font-medium border-r border-slate-200 dark:border-slate-700 whitespace-nowrap select-none">
                    {window.location.host}/
                  </div>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => { setCustomAlias(e.target.value); setShortenError(''); }}
                    className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm outline-none w-full"
                    placeholder="custom-alias"
                    pattern="[a-zA-Z0-9-_]+"
                    title="Only alphanumeric characters, hyphens, and underscores are allowed."
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 self-start sm:self-center">
                  Leave the generated hash or enter a custom alias.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ── URL Table ────────────────────────────────────── */}
        {loadingAll ? (
          <div className="card p-12 flex flex-col items-center justify-center animate-slide-up">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 dark:text-slate-400 text-sm">Loading your links…</p>
          </div>
        ) : (
          <UrlTable
            urls={urls}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
