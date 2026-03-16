import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Sparkles, AlertCircle, Clock, Lock, Eye, EyeOff, X, Tag as TagIcon, Trash2, ChevronDown, Check, Folder as FolderIcon, Plus, Layers } from 'lucide-react';
import Navbar from '../components/Navbar';
import UrlTable from '../components/UrlTable';
import EditModal from '../components/EditModal';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto, UrlSend, Tag, Folder } from '../types';
import { TAG_COLORS, getTagColorClasses } from '../utils/tagColors';

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
  expiresAt: d.expiresAt,
  isActive: d.isActive ?? true,
  hasPassword: d.hasPassword,
  tags: d.tags,
  folderId: d.folderId,
  folderName: d.folderName,
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
  
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Inline Shorten Form states
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [expirationPreset, setExpirationPreset] = useState<string>('none');
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [activeQrHash, setActiveQrHash] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeFilterTagId, setActiveFilterTagId] = useState<number | null>(null);
  
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | ''>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

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
            hasPassword: updatedDto.hasPassword,
            tags: updatedDto.tags,
            folderId: updatedDto.folderId,
            folderName: updatedDto.folderName,
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

    const loadTags = async () => {
      try {
        const { data } = await axiosInstance.get<Tag[]>('/tags');
        if (isMounted) {
          setTags(data);
        }
      } catch (err) {
        // Tags might fail if anonymous or not supported yet, ignore gracefully
      }
    };

    const loadFolders = async () => {
      try {
        const { data } = await axiosInstance.get<Folder[]>('/folders');
        if (isMounted) {
          setFolders(data);
        }
      } catch (err) {
        // Ignore gracefully
      }
    };

    if (user && user.role !== 'ROOT' && user.role !== 'ROLE_ROOT') {
      loadTags();
      loadFolders();
    }
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
      expiresAt: newEntry.expiresAt,
      isActive: newEntry.isActive ?? true,
      hasPassword: newEntry.hasPassword,
      tags: newEntry.tags,
      folderId: newEntry.folderId,
      folderName: newEntry.folderName,
    };
    setUrls((prev) => {
      const updatedList = [created, ...prev];
      saveToStorage(updatedList);
      return updatedList;
    });
    setCustomAlias(generateRandomHash());
    setPassword('');
    setExpiresAt('');
    setExpirationPreset('none');
    setSelectedTagIds([]);
    setSelectedFolderId('');
    setLongUrl('');
  };

  const handleExpirationPresetChange = (preset: string) => {
    setExpirationPreset(preset);
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localNow = Date.now() - tzOffset;
    if (preset === 'none') {
      setExpiresAt('');
    } else if (preset === '1hour') {
      setExpiresAt(new Date(localNow + 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === '24hours') {
      setExpiresAt(new Date(localNow + 24 * 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === '7days') {
      setExpiresAt(new Date(localNow + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === 'custom') {
      // Initialize to current time + 1 hour if switching to custom
      setExpiresAt(new Date(localNow + 60 * 60 * 1000).toISOString().substring(0, 16));
    }
  };

  const handleShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setShortenError('');
    setShortenLoading(true);
    try {
      const payload: any = {
        longUrl: longUrl.trim(),
        customAlias: customAlias.trim() || undefined,
        password: password.trim() || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        folderId: selectedFolderId !== '' ? selectedFolderId : undefined
      };
      
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString().substring(0, 19);
      }

      const { data } = await axiosInstance.post<UrlSend>('/shorten', payload);
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

  const handleCreateTag = async () => {
    const name = tagSearchQuery.trim();
    if (!name) return;
    setIsCreatingTag(true);
    try {
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const { data } = await axiosInstance.post<Tag>('/tags', { name, color: randomColor.name });
      setTags([...tags, data]);
      setSelectedTagIds([...selectedTagIds, data.id]);
      setTagSearchQuery('');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setShortenError("A tag with this name already exists.");
      } else {
        console.error("Failed to create tag", err);
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/tags/${tagId}`);
      setTags(tags.filter(t => t.id !== tagId));
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
      if (activeFilterTagId === tagId) setActiveFilterTagId(null);
    } catch (err) {
      console.error("Failed to delete tag", err);
    }
  };

  const handleOpenQr = async (hash: string) => {
    setIsQrModalOpen(true);
    setIsQrLoading(true);
    setActiveQrHash(hash);
    try {
      const response = await axiosInstance.get(`/url/${hash}/qr`, { responseType: 'blob' });
      const imageUrl = URL.createObjectURL(response.data);
      setQrImageUrl(imageUrl);
    } catch (err) {
      console.error("Failed to load QR code", err);
    } finally {
      setIsQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setIsQrModalOpen(false);
    if (qrImageUrl) {
      URL.revokeObjectURL(qrImageUrl);
    }
    setQrImageUrl(null);
    setActiveQrHash(null);
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

  const displayedUrls = urls.filter(u => 
    (activeFolderId === null || u.folderId === activeFolderId) &&
    (activeFilterTagId === null || u.tags?.some(t => t.id === activeFilterTagId))
  );

  const totalClicks = displayedUrls.reduce((acc, u) => acc + (u.accessed_times ?? 0), 0);
  const topClicks = displayedUrls.length ? Math.max(...displayedUrls.map((u) => u.accessed_times ?? 0)) : 0;

  return (
    <div className="page-bg">
      <Navbar />

      {/* Subtle background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{displayedUrls.length}</p>
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
          <div className="card p-6 animate-slide-up relative z-40 overflow-visible">
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

              {/* Expiration UI */}
              <div className="flex flex-col gap-2 mt-2 animate-fade-in">
                <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                  <Clock className="w-4 h-4 text-violet-500" />
                  Expiration (Optional)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: '1hour', label: '1 Hour' },
                    { id: '24hours', label: '24 Hours' },
                    { id: '7days', label: '7 Days' },
                    { id: 'custom', label: 'Custom' },
                  ].map((preset) => {
                    const isActive = expirationPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleExpirationPresetChange(preset.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900'
                            : 'bg-transparent text-slate-600 border border-slate-200 hover:border-slate-300 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                
                {expirationPreset === 'custom' && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="input-field text-sm max-w-sm"
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16)}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Password Protection UI */}
              <div className="flex flex-col gap-2 mt-2 animate-fade-in">
                <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                  <Lock className="w-4 h-4 text-violet-500" />
                  Password Protection (Optional)
                </div>
                <div className="flex items-center max-w-sm relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-sm pr-10"
                    placeholder="Enter a secret password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Users will need to enter this password to access the link.
                </p>
              </div>

              {/* Folder UI */}
              <div className="flex flex-col gap-2 mt-2 animate-fade-in relative z-40">
                <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                  <FolderIcon className="w-4 h-4 text-violet-500" />
                  Folder (Optional)
                </div>
                <div className="relative w-full max-w-sm">
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="input-field text-sm appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">No Folder</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Tags UI */}
              <div className="flex flex-col gap-2 mt-2 animate-fade-in relative z-50">
                <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                  <TagIcon className="w-4 h-4 text-violet-500" />
                  Tags (Optional)
                </div>
                
                {/* Combobox Wrapper */}
                <div className="relative w-full max-w-sm">
                  {/* Combobox Trigger */}
                  <div 
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="input-field min-h-[42px] py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer pr-8"
                  >
                    {selectedTagIds.length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500 text-sm ml-1 py-1">Select tags...</span>
                    ) : (
                      selectedTagIds.map(id => {
                        const tag = tags.find(t => t.id === id);
                        if (!tag) return null;
                        const colors = getTagColorClasses(tag.color);
                        return (
                          <span
                            key={tag.id}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTagIds(prev => prev.filter(tId => tId !== tag.id));
                            }}
                          >
                            {tag.name}
                            <X className="w-3 h-3 hover:opacity-70" />
                          </span>
                        );
                      })
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Combobox Dropdown */}
                  {isTagDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 z-[60] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-md max-h-60 overflow-y-auto animate-fade-in">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Search or create tag..."
                        className="w-full bg-slate-50 dark:bg-slate-800 text-sm px-3 py-2 rounded-lg outline-none text-slate-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto p-1">
                      {tagSearchQuery.trim() && !tags.some(t => t.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={handleCreateTag}
                          disabled={isCreatingTag}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          {isCreatingTag ? (
                            <span className="w-4 h-4 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
                          ) : (
                            <TagIcon className="w-4 h-4 text-slate-400" />
                          )}
                          <span>Create <span className="font-semibold">"{tagSearchQuery}"</span></span>
                        </button>
                      )}

                      {tags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tag => {
                        const colors = getTagColorClasses(tag.color);
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <div
                            key={tag.id}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group cursor-pointer"
                            onClick={() => {
                              setSelectedTagIds(prev => 
                                isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {tag.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTag(tag.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                              title="Delete Tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {tags.length === 0 && !tagSearchQuery.trim() && (
                        <p className="text-center text-xs text-slate-500 py-3">No tags found. Type to create one.</p>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── Filter Bar ────────────────────────────────────── */}
        {tags.length > 0 && (
          <div className="mt-8 mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide animate-fade-in">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-2 flex-shrink-0">Filter by Tag:</span>
            <button
              onClick={() => setActiveFilterTagId(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex-shrink-0 ${
                activeFilterTagId === null
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveFilterTagId(tag.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border flex-shrink-0 ${
                  activeFilterTagId === tag.id
                    ? 'border-transparent text-white'
                    : 'border-slate-200 bg-transparent hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
                style={activeFilterTagId === tag.id ? { backgroundColor: tag.color || '#6366f1' } : {}}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* ── URL Table ────────────────────────────────────── */}
        {loadingAll ? (
          <div className="card p-12 flex flex-col items-center justify-center animate-slide-up relative z-10">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 dark:text-slate-400 text-sm">Loading your links…</p>
          </div>
        ) : (
          <div className="relative z-10">
            <UrlTable
              urls={displayedUrls}
              onDeleted={handleDeleted}
              onOpenQr={handleOpenQr}
              onEdit={(idx) => {
                setEditIndex(urls.indexOf(displayedUrls[idx]));
              }}
              headerRightNode={
                <div className="relative z-50 flex items-center">
                  <button
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    <FolderIcon className="w-3.5 h-3.5 text-violet-500" />
                    Folder: {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Unknown' : 'All Links'}
                    <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
                  </button>

                  {isFolderDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-fade-in z-[100]">
                      <div className="p-1">
                        <button
                          onClick={() => { setActiveFolderId(null); setIsFolderDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                            activeFolderId === null ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Layers className="w-4 h-4 text-slate-400" />
                          All Links
                        </button>
                      </div>
                      <div className="p-1 border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto scrollbar-hide">
                        {folders.map(folder => (
                          <div key={folder.id} className="relative group">
                            <button
                              onClick={() => { setActiveFolderId(folder.id); setIsFolderDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                                activeFolderId === folder.id ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <FolderIcon className="w-4 h-4 text-slate-400" />
                              <span className="truncate pr-6">{folder.name}</span>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete folder "${folder.name}"? Your links will not be deleted.`)) {
                                  try {
                                    await axiosInstance.delete(`/folders/${folder.id}`);
                                    setFolders(folders.filter(f => f.id !== folder.id));
                                    if (activeFolderId === folder.id) setActiveFolderId(null);
                                  } catch (err) {
                                    console.error("Failed to delete folder", err);
                                  }
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        {isCreatingFolder ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (!newFolderName.trim()) return;
                                  try {
                                    const { data } = await axiosInstance.post<Folder>('/folders', { name: newFolderName.trim() });
                                    setFolders([...folders, data]);
                                    setNewFolderName('');
                                    setIsCreatingFolder(false);
                                  } catch(err) {
                                    console.error("Failed to create folder", err);
                                  }
                                } else if (e.key === 'Escape') {
                                  setIsCreatingFolder(false);
                                  setNewFolderName('');
                                }
                              }}
                              className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2 text-xs focus:outline-none focus:border-violet-500"
                              placeholder="Folder name..."
                            />
                            <button
                              onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 font-medium flex items-center gap-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Create new folder
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        )}
      </main>

      {/* ── QR Code Modal ────────────────────────────────── */}
      {isQrModalOpen && (
        <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center animate-fade-in px-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl w-80 text-center relative animate-slide-up">
            <button
              onClick={closeQrModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">QR Code</h3>
            
            {isQrLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <span className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">Generating QR...</p>
              </div>
            ) : qrImageUrl ? (
              <div className="flex flex-col items-center">
                <img src={qrImageUrl} alt="QR Code" className="mx-auto rounded-lg mb-4 border border-gray-200 dark:border-slate-700 w-48 h-48 bg-white" />
                <a
                  href={qrImageUrl}
                  download={`qr-${activeQrHash}.png`}
                  className="bg-black text-white dark:bg-white dark:text-black font-medium w-full rounded-md py-2 text-sm transition-transform hover:scale-[1.02]"
                >
                  Download PNG
                </a>
              </div>
            ) : (
              <div className="py-8 text-sm text-red-500">Failed to generate QR code.</div>
            )}
            
            <button
              onClick={closeQrModal}
              className="mt-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editIndex !== null && (
        <EditModal
          entry={urls[editIndex]}
          onClose={() => setEditIndex(null)}
          onUpdated={(updatedEntry) => {
            handleUpdated(editIndex, updatedEntry);
            setEditIndex(null);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
