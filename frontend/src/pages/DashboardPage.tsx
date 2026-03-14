import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import ShortenForm from '../components/ShortenForm';
import UrlTable from '../components/UrlTable';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto, UrlSend } from '../types';

/** Helper to extract hash from short URL */
const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

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

    return Promise.all(
      entries.map(async (entry) => {
        try {
          const hash = extractHash(entry.shortUrl);
          const { data: updatedDto } = await axiosInstance.get<UrlDto>(`/url/${hash}`);
          return {
            ...entry,
            longUrl: updatedDto.longUrl,
            accessed_times: updatedDto.accessed_times ?? 0,
            updatedAt: updatedDto.updatedAt,
          };
        } catch {
          return entry;
        }
      })
    );
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
        <ShortenForm onShorten={handleShortened} />

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
