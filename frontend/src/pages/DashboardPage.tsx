import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, Link, useSearchParams } from 'react-router-dom';
import { X, BarChart2, Search, Copy, QrCode, Edit2, Trash2, CornerDownRight, MoreVertical, Filter, SlidersHorizontal, ChevronDown, ArrowUpDown, Check, ArrowDownWideNarrow, Tag, ChevronLeft } from 'lucide-react';
import EditModal from '../components/EditModal';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto } from '../types';

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

  const { triggerRefresh, setNavStats, tags, activeFolderId } = useOutletContext<DashboardLayoutContext>();

  const [activeFilterTagId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortBy, setSortBy] = useState('dateCreated');
  const [sortOrder, setSortOrder] = useState('desc');
  const [displayProps, setDisplayProps] = useState({ destinationUrl: true, tags: true, clicks: true, createdAt: true });
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [selectedFilterTags, setSelectedFilterTags] = useState<number[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  
  const displayRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tagFromUrl = searchParams.get('tag');
    if (tagFromUrl && tags.length > 0) {
      const tagToFilter = tags.find(t => t.name.toLowerCase() === tagFromUrl.toLowerCase());
      if (tagToFilter) {
        setSelectedFilterTags([tagToFilter.id]);
      }
    }
  }, [searchParams, tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (displayRef.current && !displayRef.current.contains(event.target as Node)) {
        setIsDisplayOpen(false);
        setIsSortMenuOpen(false);
      } else if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setActiveFilter('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    // Tags and Folders are now loaded by DashboardLayout
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
  const handleShortened = useCallback((newEntry: UrlEntry) => {
    setUrls((prev) => {
      const updatedList = [newEntry, ...prev];
      saveToStorage(updatedList);
      return updatedList;
    });
  }, [saveToStorage]);

  useEffect(() => {
    if (triggerRefresh) {
      handleShortened(triggerRefresh);
    }
  }, [triggerRefresh, handleShortened]);

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

  const sortedUrls = React.useMemo(() => {
    return [...urls].sort((a, b) => {
      if (sortBy === 'dateCreated') {
        return sortOrder === 'asc' 
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() 
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'totalClicks') {
        return sortOrder === 'asc' 
          ? (a.accessed_times || 0) - (b.accessed_times || 0) 
          : (b.accessed_times || 0) - (a.accessed_times || 0);
      }
      return 0;
    });
  }, [urls, sortBy, sortOrder]);

  const displayedUrls = sortedUrls.filter(u => 
    (activeFolderId === null || u.folderId === activeFolderId) &&
    (activeFilterTagId === null || u.tags?.some(t => t.id === activeFilterTagId))
  ).filter(u => {
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      u.shortUrl.toLowerCase().includes(query) || 
      u.longUrl.toLowerCase().includes(query)
    );
  }).filter(u => {
    if (selectedFilterTags.length === 0) return true;
    return u.tags?.some(tag => selectedFilterTags.includes(tag.id));
  });

  const totalClicks = displayedUrls.reduce((acc, u) => acc + (u.accessed_times ?? 0), 0);

  useEffect(() => {
    setNavStats({ totalClicks, linkCount: displayedUrls.length });
  }, [totalClicks, displayedUrls.length, setNavStats]);

  return (
    <>

        <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 mt-6 px-6">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-colors ${selectedFilterTags.length > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {selectedFilterTags.length > 0 && <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-1.5 py-0.5 rounded-full leading-none">{selectedFilterTags.length}</span>}
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {isFilterOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-lg shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 focus:outline-none z-[60] overflow-hidden">
                    {activeFilter === 'none' ? (
                      <>
                        <div className="p-2">
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="Filter..." 
                              className="block w-full pl-3 pr-8 py-2 border-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <kbd className="inline-flex items-center border border-gray-200 dark:border-slate-700 rounded px-1.5 text-xs font-medium text-gray-400 bg-gray-50 dark:bg-slate-800">F</kbd>
                            </div>
                          </div>
                        </div>
                        <div className="py-1 p-1">
                          <button 
                            onClick={() => setActiveFilter('tag')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-colors group"
                          >
                            <div className="flex items-center">
                              <Tag className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                              Tag
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-gray-500">T</span>
                          </button>
                        </div>
                      </>
                    ) : activeFilter === 'tag' ? (
                      <>
                        <div className="p-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                          <button 
                            onClick={() => { setActiveFilter('none'); setTagSearch(''); }} 
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text"
                              value={tagSearch}
                              onChange={e => setTagSearch(e.target.value)}
                              placeholder="Search tags..." 
                              className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(t => (
                            <label key={t.id} className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={selectedFilterTags.includes(t.id)}
                                onChange={() => {
                                  setSelectedFilterTags(prev => 
                                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                  )
                                }}
                                className="rounded border-gray-300 dark:border-slate-600 text-black dark:text-white focus:ring-black dark:focus:ring-white mr-3 bg-white dark:bg-slate-900"
                              />
                              <span className="flex-1 flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full" 
                                  style={{ backgroundColor: t.color || '#374151' }}
                                />
                                {t.name}
                              </span>
                            </label>
                          ))}
                          {tags.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No tags found</div>}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Active Filters Pills */}
              {selectedFilterTags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <div key={tag.id} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#374151' }} />
                    {tag.name}
                    <button 
                      onClick={() => setSelectedFilterTags(prev => prev.filter(id => id !== tag.id))}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              <div className="relative" ref={displayRef}>
                <button 
                  onClick={() => setIsDisplayOpen(!isDisplayOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Display
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                
                {isDisplayOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-gray-100 dark:ring-slate-800 border border-gray-200 dark:border-slate-800 w-[320px] z-50 flex flex-col">
                    {/* Ordering Section */}
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm font-medium">
                        <ArrowUpDown className="h-4 w-4 text-gray-500" />
                        Ordering
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="p-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                          title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                        >
                          <ArrowUpDown className={`h-4 w-4 transform transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className="relative" ref={sortMenuRef}>
                          <button 
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className="flex items-center justify-between w-36 px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {sortBy === 'dateCreated' ? 'Date created' : 'Total clicks'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>
                          
                          {isSortMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-gray-100 dark:ring-slate-800 border border-gray-200 dark:border-slate-800 z-[60] overflow-hidden py-1">
                              <button
                                onClick={() => { setSortBy('dateCreated'); setIsSortMenuOpen(false); }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ArrowDownWideNarrow className="w-4 h-4 text-gray-500" />
                                  Date created
                                </span>
                                {sortBy === 'dateCreated' && <Check className="w-4 h-4 text-gray-900 dark:text-white" />}
                              </button>
                              
                              <button
                                onClick={() => { setSortBy('totalClicks'); setIsSortMenuOpen(false); }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ArrowDownWideNarrow className="w-4 h-4 text-gray-500" />
                                  Total clicks
                                </span>
                                {sortBy === 'totalClicks' && <Check className="w-4 h-4 text-gray-900 dark:text-white" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Display Properties Section */}
                    <div className="p-4 flex flex-col gap-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Properties</h3>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 text-xs border border-transparent rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-medium cursor-not-allowed">
                          Short link
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, destinationUrl: !prev.destinationUrl }))}
                          className={`px-2 py-1 text-xs border rounded-md font-medium transition-colors ${displayProps.destinationUrl ? 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          Destination URL
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, clicks: !prev.clicks }))}
                          className={`px-2 py-1 text-xs border rounded-md font-medium transition-colors ${displayProps.clicks ? 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          Analytics
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, createdAt: !prev.createdAt }))}
                          className={`px-2 py-1 text-xs border rounded-md font-medium transition-colors ${displayProps.createdAt ? 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          Created Date
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, tags: !prev.tags }))}
                          className={`px-2 py-1 text-xs border rounded-md font-medium transition-colors ${displayProps.tags ? 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          Tags
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by short link or URL" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                        {displayProps.destinationUrl && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5 ml-1">
                            <CornerDownRight className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                              {url.longUrl}
                            </span>
                          </div>
                        )}
                        {displayProps.destinationUrl && displayProps.createdAt && <span>•</span>}
                        {displayProps.createdAt && (
                          <span>
                            {new Date(url.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      
                      {displayProps.tags && url.tags && url.tags.length > 0 && (
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
                      {displayProps.clicks && (
                        <Link to={`/analytics/${extractHash(url.shortUrl)}`} className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700">
                          <BarChart2 className="w-4 h-4 text-gray-400" />
                          {url.accessed_times}
                          <span className="hidden sm:inline ml-1 text-gray-400 font-normal">clicks</span>
                        </Link>
                      )}
                      
                      <div className="relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === url.shortUrl ? null : url.shortUrl)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === url.shortUrl && (
                          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-[60] overflow-hidden">
                            <Link
                              to={`/analytics/${extractHash(url.shortUrl)}`}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <BarChart2 className="w-4 h-4" />
                              View Analytics
                            </Link>
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
    </>
  );
};

export default DashboardPage;
