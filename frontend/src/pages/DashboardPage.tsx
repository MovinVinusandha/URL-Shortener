import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, AlertTriangle, X, Tag as TagIcon, ChevronDown, Folder as FolderIcon, BarChart2 } from 'lucide-react';
import UrlTable from '../components/UrlTable';
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
  const [activeFilterTagId, setActiveFilterTagId] = useState<number | null>(null);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  
  const [folderToDelete, setFolderToDelete] = useState<{id: number, name: string} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    <div className="bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 min-h-screen flex">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-16 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-4 shrink-0 h-screen sticky top-0 z-20">
        <div className="mb-8 flex items-center justify-center w-full px-2">
          <div className="w-8 h-8 flex items-center justify-center bg-violet-600 rounded-lg text-white font-bold">
            U
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-medium">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950">
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

        <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-0 flex items-center justify-between overflow-x-auto text-sm sticky top-16 z-10">
          <div className="flex items-center gap-0 h-10">
            <button 
              onClick={() => setActiveFolderId(null)}
              className={`flex items-center gap-2 px-4 h-full font-medium ${activeFolderId === null ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
            >
              <Link2 className="w-4 h-4" />
              All Links
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-2"></div>
            {folders.map(folder => (
              <button 
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={`flex items-center gap-2 px-4 h-full font-medium whitespace-nowrap ${activeFolderId === folder.id ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
              >
                <FolderIcon className="w-4 h-4" />
                {folder.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1" title={`Total Clicks: ${totalClicks}`}>
                <BarChart2 className="w-3.5 h-3.5" />
                {totalClicks}
              </span>
              <span className="flex items-center gap-1" title={`Total Links: ${displayedUrls.length}`}>
                <Link2 className="w-3.5 h-3.5" />
                {displayedUrls.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button 
                onClick={() => setActiveFilterTagId(null)}
                className={`flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-medium transition-colors shadow-sm ${activeFilterTagId === null ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <TagIcon className="w-3.5 h-3.5" />
                All Tags
              </button>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setActiveFilterTagId(tag.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-medium transition-colors shadow-sm ${activeFilterTagId === tag.id ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  style={activeFilterTagId === tag.id ? { borderColor: tag.color || '#8b5cf6' } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#8b5cf6' }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {loadingAll ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 flex flex-col items-center justify-center animate-slide-up">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">Loading your links…</p>
            </div>
          ) : (
            <UrlTable
              urls={displayedUrls}
              onDeleted={handleDeleted}
              onOpenQr={handleOpenQr}
              onEdit={(idx) => {
                setEditIndex(urls.indexOf(displayedUrls[idx]));
              }}
            />
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
        folders={folders}
        tags={tags}
        onShortened={handleShortened}
        onTagCreated={(newTag) => setTags([...tags, newTag])}
        onFolderCreated={(newFolder) => setFolders([...folders, newFolder])}
      />
    </div>
  );
};

export default DashboardPage;
