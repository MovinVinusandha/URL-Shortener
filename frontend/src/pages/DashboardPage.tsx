import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Link as LinkIcon, AlertTriangle, X, Tag as TagIcon, ChevronDown, Folder as FolderIcon, BarChart2, Search, Copy, QrCode, Edit2, Trash2, CornerDownRight, MoreVertical, Filter, SlidersHorizontal, Activity } from 'lucide-react';
import EditModal from '../components/EditModal';
import CreateLinkModal from '../components/CreateLinkModal';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto, Tag, Folder } from '../types';

/** Helper to extract hash from short URL */
const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

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

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [activeQrHash, setActiveQrHash] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [activeFilterTagId] = useState<number | null>(null);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  
  const [folderToDelete, setFolderToDelete] = useState<{id: number, name: string} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await axiosInstance.delete(`/folders/${folderToDelete.id}`);
      setFolders(folders.filter(f => f.id !== folderToDelete.id));
      if (activeFolderId === folderToDelete.id) setActiveFolderId(null);
      setFolderToDelete(null);
    } catch(err) {
      console.error("Failed to delete folder", err);
    }
  };

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
  const handleShortened = (newEntry: UrlEntry) => {
    setUrls((prev) => {
      const updatedList = [newEntry, ...prev];
      saveToStorage(updatedList);
      return updatedList;
    });
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

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-sans">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-16 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-4 shrink-0 h-screen sticky top-0 z-20">
        <div className="mb-8 flex items-center justify-center w-full px-2">
          <div className="w-8 h-8 flex items-center justify-center bg-black dark:bg-white rounded-lg text-white dark:text-black font-bold">
            <LinkIcon className="w-5 h-5" />
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm font-medium uppercase border border-gray-300 dark:border-slate-600 shadow-sm">
            {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900">
        <header className="h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors">
              Links
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </h1>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
          >
            Create link
          </button>
        </header>

        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between overflow-x-auto text-sm sticky top-16 z-30">
          <div className="flex items-center h-12">
            <Link to="/dashboard" className="flex items-center gap-2 px-4 h-full font-medium text-black dark:text-white border-b-2 border-black dark:border-white">
              <LinkIcon className="w-4 h-4" />
              Links
            </Link>
            <Link to="/analytics" className="flex items-center gap-2 px-4 h-full text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <BarChart2 className="w-4 h-4" />
              Analytics
            </Link>
            <Link to="/folders" className="flex items-center gap-2 px-4 h-full text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <FolderIcon className="w-4 h-4" />
              Folders
            </Link>
            <Link to="/tags" className="flex items-center gap-2 px-4 h-full text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <TagIcon className="w-4 h-4" />
              Tags
            </Link>
          </div>
          <div className="flex items-center gap-4 ml-auto text-xs text-gray-500">
            <span className="flex items-center gap-1" title={`Total Clicks: ${totalClicks}`}>
              <Activity className="w-3.5 h-3.5" />
              {totalClicks}/1K
            </span>
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" />
              {urls.length}/25
            </span>
          </div>
        </div>

        <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 mt-6 px-6">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-sm transition-colors">
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 shadow-sm transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
                Display
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            {/* Search Input Placeholder */}
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full sm:w-auto pl-9 pr-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {loadingAll ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">Loading your links…</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-800">
              {displayedUrls.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No links found.</div>
              ) : (
                displayedUrls.map((url) => (
                  <div key={url.shortUrl} className="group flex items-center p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Favicon */}
                    <div className="shrink-0 mr-4">
                      <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-1">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${url.longUrl}&sz=64`} 
                          alt="Favicon" 
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a href={url.shortUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:underline">
                          {url.shortUrl.replace(/^https?:\/\//, '')}
                        </a>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(url.shortUrl);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            title="Copy link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenQr(extractHash(url.shortUrl))}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            title="QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5 ml-1">
                          <CornerDownRight className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                            {url.longUrl}
                          </span>
                        </div>
                        <span>•</span>
                        <span>
                          {new Date(url.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      {url.tags && url.tags.length > 0 && (
                        <div className="relative group inline-flex items-center mt-2">
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                            style={{ 
                              borderColor: url.tags[0].color ? `${url.tags[0].color}40` : '#e5e7eb',
                              color: url.tags[0].color || '#374151',
                              backgroundColor: url.tags[0].color ? `${url.tags[0].color}10` : '#f9fafb'
                            }}
                          >
                            {url.tags[0].name}
                            {url.tags.length > 1 && ` | +${url.tags.length - 1}`}
                          </span>
                          
                          {/* Tooltip */}
                          {url.tags.length > 1 && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 rounded-lg p-2 gap-2 z-[60] min-w-max">
                              {url.tags.map(t => (
                                <span 
                                  key={t.id} 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                  style={{ 
                                    borderColor: t.color ? `${t.color}40` : '#e5e7eb',
                                    color: t.color || '#374151',
                                    backgroundColor: t.color ? `${t.color}10` : '#f9fafb'
                                  }}
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700">
                        <BarChart2 className="w-4 h-4 text-gray-400" />
                        {url.accessed_times}
                        <span className="hidden sm:inline ml-1 text-gray-400 font-normal">clicks</span>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === url.shortUrl ? null : url.shortUrl)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === url.shortUrl && (
                          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-[60] overflow-hidden">
                            <button
                              onClick={() => {
                                setEditIndex(urls.indexOf(url));
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                if (window.confirm("Are you sure you want to delete this link?")) {
                                  const originalIdx = urls.indexOf(url);
                                  axiosInstance.delete(`/url/${extractHash(url.shortUrl)}`)
                                    .then(() => handleDeleted(originalIdx))
                                    .catch(err => console.error("Failed to delete", err));
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Folder Delete Confirmation Modal ──────────────── */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl relative z-[121] animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Folder</h3>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">"{folderToDelete.name}"</span>? The links inside this folder will NOT be deleted, but will be moved to your main dashboard.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Create Link Modal ────────────────────────────── */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newEntry) => {
          if (newEntry) handleShortened(newEntry);
        }}
        folders={folders}
        tags={tags}
      />
    </div>
  );
};

export default DashboardPage;
