import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOutletContext, Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { X, BarChart2, Activity, Search, Copy, QrCode, Edit2, Trash2, CornerDownRight, MoreVertical, Filter, SlidersHorizontal, ChevronDown, ArrowUpDown, Check, ArrowDownWideNarrow, Tag, ChevronLeft, CheckCircle2, XCircle, Lock, Folder as FolderIcon, Link as LinkIcon, Layers, FolderPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import CreateLinkModal from '../components/CreateLinkModal';
import { QrCodeModal } from '../components/QrCodeModal';
import { CampaignGroupCard } from '../components/CampaignGroupCard';
import { groupUrlsByCampaign, extractUtmParams, formatChannelName } from '../utils/utmExtractor';
import ClickArrowIcon from '../components/icons/ClickArrowIcon';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry, UrlDto } from '../types';
import Skeleton from 'react-loading-skeleton';
import { toast } from 'react-hot-toast';

/** Helper to extract hash from short URL */
const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

/** Helper to get actual root domain dynamically */
const getRootDomain = () => {
  const hostname = window.location.hostname;
  if (hostname.startsWith('app.')) {
    return hostname.substring(4);
  }
  return hostname;
};
const rootDomain = getRootDomain();
const displayDomain = rootDomain + (window.location.port && window.location.port !== '80' && window.location.port !== '443' ? ':' + window.location.port : '');
const protocol = window.location.protocol;

const mapDtoToEntry = (d: UrlDto): UrlEntry => ({
  longUrl: d.longUrl,
  shortUrl: d.shortUrl,
  accessed_times: d.accessed_times ?? 0,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  expiresAt: d.expiresAt,
  isActive: d.isActive ?? (d as any).active ?? true,
  hasPassword: d.hasPassword ?? (d as any).password ?? false,
  tags: d.tags,
  folderId: d.folderId,
  folderName: d.folderName,
});

/**
 * DashboardPage (protected — route: /dashboard)
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { folderSlug } = useParams<{ folderSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  
  const [editingUrl, setEditingUrl] = useState<UrlEntry | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [activeQrHash, setActiveQrHash] = useState<string | null>(null);

  const { triggerRefresh, tags = [], folders = [], activeFolderId, setActiveFolderId, openCreateModal } = useOutletContext<DashboardLayoutContext>() || {};

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState('dateCreated');
  const [sortOrder, setSortOrder] = useState('desc');
  const [displayProps, setDisplayProps] = useState({ destinationUrl: true, tags: true, clicks: true, createdAt: true, campaignCreatedAt: false, status: true, password: true });
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isToolbarFolderOpen, setIsToolbarFolderOpen] = useState(false);
  const [toolbarFolderSearch, setToolbarFolderSearch] = useState('');
  const toolbarFolderRef = useRef<HTMLDivElement>(null);

  const [activeFilter, setActiveFilter] = useState('none');
  const [selectedFilterTags, setSelectedFilterTags] = useState<number[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedLinkType, setSelectedLinkType] = useState<'all' | 'standalone' | 'campaign'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  
  const [isTagPillPopoverOpen, setIsTagPillPopoverOpen] = useState(false);
  const [tagPillSearch, setTagPillSearch] = useState('');
  const tagPillPopoverRef = useRef<HTMLDivElement>(null);

  const [isCampaignPillPopoverOpen, setIsCampaignPillPopoverOpen] = useState(false);
  const [campaignPillSearch, setCampaignPillSearch] = useState('');
  const campaignPillPopoverRef = useRef<HTMLDivElement>(null);

  const [isLinkTypePillPopoverOpen, setIsLinkTypePillPopoverOpen] = useState(false);
  const linkTypePillPopoverRef = useRef<HTMLDivElement>(null);

  const [isFolderPillPopoverOpen, setIsFolderPillPopoverOpen] = useState(false);
  const [folderPillSearch, setFolderPillSearch] = useState('');
  const folderPillPopoverRef = useRef<HTMLDivElement>(null);

  const [isLinkPillPopoverOpen, setIsLinkPillPopoverOpen] = useState(false);
  const [linkPillSearch, setLinkPillSearch] = useState('');
  const linkPillPopoverRef = useRef<HTMLDivElement>(null);

  const [filterSearch, setFilterSearch] = useState('');

  const displayRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const currentFolder = folderSlug
    ? folders.find(f => (f.slug && f.slug.toLowerCase() === folderSlug.toLowerCase()) || f.name.toLowerCase() === folderSlug.toLowerCase() || f.name.toLowerCase().replace(/\s+/g, '-') === folderSlug.toLowerCase())
    : null;

  useEffect(() => {
    const tagIdParam = searchParams.get('tagId');
    let nextTags: number[] = [];
    if (tagIdParam) {
      nextTags = tagIdParam.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
    } else {
      const tagFromUrl = searchParams.get('tag');
      if (tagFromUrl && tags.length > 0) {
        const tagToFilter = tags.find(t => t.name.toLowerCase() === tagFromUrl.toLowerCase());
        if (tagToFilter && tagToFilter.id > 0) {
          nextTags = [tagToFilter.id];
        }
      }
    }
    setSelectedFilterTags(prev => {
      if (prev.length === nextTags.length && prev.every((v, i) => v === nextTags[i])) {
        return prev;
      }
      return nextTags;
    });

    const campaignParam = searchParams.get('campaign');
    setSelectedCampaign(campaignParam || null);

    const linkTypeParam = searchParams.get('linkType');
    if (linkTypeParam === 'standalone' || linkTypeParam === 'campaign') {
      setSelectedLinkType(linkTypeParam);
    } else {
      setSelectedLinkType('all');
    }

    // If no view param is present in URL, restore saved view preference from localStorage
    if (!searchParams.has('view')) {
      try {
        const savedView = localStorage.getItem('trim_dashboard_view_mode');
        if (savedView === 'campaigns') {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', 'campaigns');
            return next;
          }, { replace: true });
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams.toString(), tags]);

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

      if (tagPillPopoverRef.current && !tagPillPopoverRef.current.contains(event.target as Node)) {
        setIsTagPillPopoverOpen(false);
      }

      if (campaignPillPopoverRef.current && !campaignPillPopoverRef.current.contains(event.target as Node)) {
        setIsCampaignPillPopoverOpen(false);
      }

      if (linkTypePillPopoverRef.current && !linkTypePillPopoverRef.current.contains(event.target as Node)) {
        setIsLinkTypePillPopoverOpen(false);
      }

      if (toolbarFolderRef.current && !toolbarFolderRef.current.contains(event.target as Node)) {
        setIsToolbarFolderOpen(false);
      }

      if (linkPillPopoverRef.current && !linkPillPopoverRef.current.contains(event.target as Node)) {
        setIsLinkPillPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const urlsRef = useRef(urls);

  urlsRef.current = urls;

  // Scoped key based on logged in user's ID or email, or guest fallback
  const storageKey = user ? `user_urls_${user.id ?? user.email}` : 'guest_urls';

  /** Save URLs to localStorage for regular users */
  const saveToStorage = useCallback(
    (newUrls: UrlEntry[]) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newUrls));
        } catch {
          // Ignore quota / storage disabled errors
        }
      }
    },
    [storageKey]
  );

  /** Refresh live click counts via single bulk GET /url/all or individual fallback */
  const syncClickCounts = useCallback(async (entries: UrlEntry[]): Promise<UrlEntry[]> => {
    if (entries.length === 0) return entries;

    if (user) {
      try {
        const { data: allDtos } = await axiosInstance.get<UrlDto[]>('/url/all');
        const dtoMap = new Map<string, UrlDto>();
        allDtos.forEach(dto => {
          dtoMap.set(extractHash(dto.shortUrl).toLowerCase(), dto);
        });

        return entries.map(entry => {
          const hash = extractHash(entry.shortUrl).toLowerCase();
          const updatedDto = dtoMap.get(hash);
          if (!updatedDto) return entry;
          const freshClicks = updatedDto.accessed_times ?? (updatedDto as any).accessedTimes ?? (updatedDto as any).clicks ?? 0;
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
        });
      } catch (err) {
        console.error('Failed bulk refresh stats', err);
      }
    }

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
  }, [user]);


  const refreshDashboardData = async () => {
    if (user) {
      let url = '/url/all';
      if (folderSlug) {
        url = `/url/folder/slug/${folderSlug}`;
      }
      try {
        const { data: serverUrls } = await axiosInstance.get<UrlDto[]>(url);
        const mapped = serverUrls.map(mapDtoToEntry);
        setUrls(mapped);
        saveToStorage(mapped);
      } catch (err) {
        console.error('Failed to reload dashboard data', err);
      }
    }
  };

  // Initial load logic on mount / user change / folderSlug change
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoadingAll(true);

      try {
        if (user) {
          let url = '/url/all';
          if (folderSlug) {
            url = `/url/folder/slug/${folderSlug}`;
          }
          const { data: serverUrls } = await axiosInstance.get<UrlDto[]>(url);

          if (isMounted) {
            const mapped = serverUrls.map(mapDtoToEntry);
            setUrls(mapped);
            saveToStorage(mapped);
          }
        } else {
          // Anonymous user: fallback to localStorage cache
          if (storageKey && isMounted) {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const cached = JSON.parse(raw);
              if (Array.isArray(cached)) {
                setUrls(cached);
                syncClickCounts(cached).then(fresh => {
                  if (isMounted) {
                    setUrls(fresh);
                    saveToStorage(fresh);
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load URLs", err);
        // For anonymous users only, fallback to local storage
        if (!user && storageKey && isMounted) {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const cached = JSON.parse(raw);
              if (Array.isArray(cached)) {
                setUrls(cached);
              }
            }
          } catch (e) {
            // If storage parsing fails, start empty
          }
        } else if (user && isMounted) {
          setUrls([]);
        }
      } finally {
        if (isMounted) {
          setLoadingAll(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [storageKey, triggerRefresh, folderSlug, searchQuery, user]);

  // Periodically refresh click counts while the dashboard is visible
  useEffect(() => {
    if (import.meta.env.MODE === 'test' || urls.length === 0) return;

    let cancelled = false;

    const refreshCounts = async () => {
      const freshUrls = await syncClickCounts(urlsRef.current);
      if (!cancelled) {
        setUrls(freshUrls);
        saveToStorage(freshUrls);
      }
    };

    const intervalId = window.setInterval(refreshCounts, 3_000);
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

  /** Called when ShortenForm or batch campaign successfully shortens or updates URLs */
  const handleShortened = useCallback((incoming: any) => {
    if (!incoming) return;
    const incomingEntries: UrlEntry[] = Array.isArray(incoming)
      ? incoming.map((item: any) => (item.accessed_times !== undefined ? item : mapDtoToEntry(item)))
      : [incoming.accessed_times !== undefined ? incoming : mapDtoToEntry(incoming)];

    setUrls((prev) => {
      let updatedList = [...prev];
      for (const entry of incomingEntries) {
        const hashToFind = extractHash(entry.shortUrl);
        const existingIdx = updatedList.findIndex(u => extractHash(u.shortUrl) === hashToFind);
        if (existingIdx !== -1) {
          updatedList[existingIdx] = entry;
        } else {
          updatedList = [entry, ...updatedList];
        }
      }

      saveToStorage(updatedList);
      return updatedList;
    });
  }, [saveToStorage]);

  useEffect(() => {
    if (triggerRefresh) {
      handleShortened(triggerRefresh);
    }
  }, [triggerRefresh, handleShortened]);

  const activeQrUrl = useMemo(() => {
    if (!activeQrHash) return '';
    const entry = urls.find(u => extractHash(u.shortUrl) === activeQrHash);
    if (entry) return entry.shortUrl;
    return `${protocol}//${displayDomain}/${activeQrHash}`;
  }, [activeQrHash, urls]);

  const handleOpenQr = (hash: string) => {
    setActiveQrHash(hash);
    setIsQrModalOpen(true);
  };

  const closeQrModal = () => {
    setIsQrModalOpen(false);
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

  const hashParam = searchParams.get('hash');

  const viewMode: 'all' | 'campaigns' = searchParams.get('view') === 'campaigns' ? 'campaigns' : 'all';

  const handleSetViewMode = useCallback((mode: 'all' | 'campaigns') => {
    try {
      localStorage.setItem('trim_dashboard_view_mode', mode);
    } catch {
      // ignore
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (mode === 'campaigns') {
        next.set('view', 'campaigns');
      } else {
        next.delete('view');
      }
      return next;
    });
  }, [setSearchParams]);

  const displayedUrls = sortedUrls.filter(u => {
    if (currentFolder) {
      const isDefault = currentFolder.name.toLowerCase() === 'links';
      if (!isDefault) {
        return u.folderId === currentFolder.id;
      }
    }
    return true;
  }).filter(u => {
    if (hashParam) {
      return extractHash(u.shortUrl).toLowerCase() === hashParam.toLowerCase();
    }
    return true;
  }).filter(u => {
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      u.shortUrl.toLowerCase().includes(query) || 
      u.longUrl.toLowerCase().includes(query)
    );
  }).filter(u => {
    if (selectedFilterTags.length === 0) return true;
    return u.tags?.some(tag => selectedFilterTags.includes(tag.id));
  }).filter(u => {
    const utm = extractUtmParams(u.longUrl);
    if (selectedCampaign) {
      return utm.campaign?.toLowerCase() === selectedCampaign.toLowerCase();
    }
    if (selectedLinkType === 'standalone') {
      return !utm.campaign;
    }
    if (selectedLinkType === 'campaign') {
      return !!utm.campaign;
    }
    // In "All Links" view mode, only show standalone links by default
    if (viewMode === 'all') {
      return !utm.campaign;
    }
    return true;
  });

  const { campaigns, ungrouped } = useMemo(() => {
    return groupUrlsByCampaign(displayedUrls);
  }, [displayedUrls]);

  const handleDeleteUrl = useCallback((url: UrlEntry) => {
    if (window.confirm("Are you sure you want to delete this link?")) {
      const originalIdx = urls.indexOf(url);
      axiosInstance.delete(`/url/${extractHash(url.shortUrl)}`)
        .then(() => {
          handleDeleted(originalIdx);
          toast.success("Link deleted");
        })
        .catch(err => {
          console.error("Failed to delete", err);
          toast.error("Failed to delete link");
        });
    }
  }, [urls]);

  const availableUrls = useMemo(() => {
    let list = urls;
    if (currentFolder && currentFolder.name.toLowerCase() !== 'links') {
      list = list.filter(u => u.folderId === currentFolder.id);
    }
    if (selectedFilterTags.length > 0) {
      list = list.filter(u => u.tags?.some(t => selectedFilterTags.includes(t.id)));
    }
    return list;
  }, [urls, currentFolder, selectedFilterTags]);

  const availableTags = useMemo(() => {
    let list = tags;
    if (currentFolder && currentFolder.name.toLowerCase() !== 'links') {
      const folderLinks = urls.filter(u => u.folderId === currentFolder.id);
      const tagIdsInFolder = new Set(folderLinks.flatMap(u => u.tags?.map(t => t.id) || []));
      list = list.filter(t => tagIdsInFolder.has(t.id));
    }
    return list;
  }, [tags, urls, currentFolder]);

  const availableCampaigns = useMemo(() => {
    let list = urls;
    if (currentFolder && currentFolder.name.toLowerCase() !== 'links') {
      list = list.filter(u => u.folderId === currentFolder.id);
    }
    const campaignMap = new Map<string, number>();
    list.forEach(u => {
      const utm = extractUtmParams(u.longUrl);
      if (utm.campaign) {
        campaignMap.set(utm.campaign, (campaignMap.get(utm.campaign) || 0) + 1);
      }
    });
    return Array.from(campaignMap.entries()).map(([name, count]) => ({ name, count }));
  }, [urls, currentFolder]);

  const availableFolders = useMemo(() => {
    let list = folders;
    if (selectedFilterTags.length > 0) {
      const matchingLinks = urls.filter(u => u.tags?.some(t => selectedFilterTags.includes(t.id)));
      const folderIdsWithTags = new Set(matchingLinks.map(u => u.folderId).filter(Boolean));
      list = list.filter(f => f.name.toLowerCase() === 'links' || folderIdsWithTags.has(f.id));
    }
    return list;
  }, [folders, urls, selectedFilterTags]);



  const validFilterTags = selectedFilterTags.filter(id => Boolean(id) && Number(id) > 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full w-full">

        <div className="flex-1 py-4 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Folder Selector Dropdown */}
              <div className="relative" ref={toolbarFolderRef}>
                <button
                  type="button"
                  onClick={() => setIsToolbarFolderOpen(!isToolbarFolderOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-input rounded-lg text-xs font-medium bg-background text-foreground hover:bg-secondary transition-all cursor-pointer shadow-xs"
                >
                  <FolderIcon className={`w-3.5 h-3.5 ${currentFolder && currentFolder.name.toLowerCase() !== 'links' ? 'text-emerald-500' : 'text-primary'}`} />
                  <span className="font-semibold max-w-[130px] sm:max-w-[180px] truncate">
                    {currentFolder ? currentFolder.name : 'All Folders'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70 ml-0.5" />
                </button>

                <AnimatePresence>
                  {isToolbarFolderOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="absolute top-full left-0 mt-1 w-64 bg-background border border-border shadow-lg rounded-xl p-2 z-[100] flex flex-col gap-1.5"
                    >
                      <div className="relative flex items-center px-2 border-b border-border pb-1">
                        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-1" />
                        <input
                          type="text"
                          autoFocus={true}
                          placeholder="Search folders..."
                          value={toolbarFolderSearch}
                          onChange={(e) => setToolbarFolderSearch(e.target.value)}
                          className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => {
                            navigate('/folders');
                            setIsToolbarFolderOpen(false);
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground flex-shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          View All
                        </button>
                      </div>

                      <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 py-1">
                        {/* All Folders Option */}
                        <button
                          onClick={() => {
                            if (setActiveFolderId) setActiveFolderId(null);
                            const currentParams = searchParams.toString();
                            navigate(currentParams ? `/dashboard?${currentParams}` : '/dashboard');
                            setIsToolbarFolderOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                            !folderSlug && !activeFolderId
                              ? 'bg-secondary text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-3.5 h-3.5 text-primary" />
                            <span>All Folders</span>
                          </div>
                          {!folderSlug && !activeFolderId && (
                            <Check className="w-3.5 h-3.5 text-primary" />
                          )}
                        </button>

                        {folders
                          .filter(f => f.name.toLowerCase().includes(toolbarFolderSearch.toLowerCase()))
                          .map(folder => {
                            const isDefault = folder.name.toLowerCase() === 'links';
                            const slug = folder.slug || encodeURIComponent(folder.name.toLowerCase().replace(/\s+/g, '-'));
                            const isSelected =
                              (folderSlug &&
                                ((folder.slug && folder.slug.toLowerCase() === folderSlug.toLowerCase()) ||
                                  folder.name.toLowerCase() === folderSlug.toLowerCase() ||
                                  folder.name.toLowerCase().replace(/\s+/g, '-') === folderSlug.toLowerCase())) ||
                              (!folderSlug && activeFolderId === folder.id);

                            return (
                              <button
                                key={folder.id}
                                onClick={() => {
                                  if (setActiveFolderId) setActiveFolderId(folder.id);
                                  const currentParams = searchParams.toString();
                                  navigate(currentParams ? `/dashboard/f/${slug}?${currentParams}` : `/dashboard/f/${slug}`);
                                  setIsToolbarFolderOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-secondary text-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FolderIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${isDefault ? 'text-primary' : 'text-emerald-500'}`}
                                  />
                                  <span className="truncate">{folder.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isDefault && (
                                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                      Default
                                    </span>
                                  )}
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                              </button>
                            );
                          })}
                        {folders.length === 0 && (
                          <div className="px-2.5 py-2 text-xs text-muted-foreground">No folders found</div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          navigate('/folders?create=true');
                          setIsToolbarFolderOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors flex items-center gap-2 font-medium border-t border-border pt-1.5 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                        Create new folder
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                    (selectedFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all')
                      ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm hover:bg-neutral-200/60 dark:hover:bg-[#202024]' 
                      : 'bg-background border-input text-foreground hover:bg-secondary'
                  }`}
                >
                  <Filter className={`w-3.5 h-3.5 ${(selectedFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all') ? 'text-[#0099ff]' : 'text-muted-foreground'}`} />
                  Filter
                  {(selectedFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all') && (
                    <span className="bg-[#0099ff] text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold shadow-sm">
                      {selectedFilterTags.length + (selectedCampaign ? 1 : 0) + (selectedLinkType !== 'all' ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[60] overflow-hidden"
                  >
                    {activeFilter === 'none' ? (
                      <div className="py-1 p-1 space-y-0.5">
                        <button 
                          onClick={() => { setActiveFilter('tag'); setTagSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <Tag className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Tag
                          </div>
                          {selectedFilterTags.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-medium bg-secondary px-1.5 py-0.2 rounded-full">
                              {selectedFilterTags.length}
                            </span>
                          )}
                        </button>

                        <button 
                          onClick={() => { setActiveFilter('campaign'); setCampaignSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <Layers className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Campaign
                          </div>
                          {selectedCampaign && (
                            <span className="text-[10px] text-primary font-medium truncate max-w-[80px]">
                              {selectedCampaign}
                            </span>
                          )}
                        </button>

                        <button 
                          onClick={() => { setActiveFilter('type'); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <LinkIcon className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Link Type
                          </div>
                          {selectedLinkType !== 'all' && (
                            <span className="text-[10px] text-primary capitalize">
                              {selectedLinkType}
                            </span>
                          )}
                        </button>
                      </div>
                    ) : activeFilter === 'tag' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setTagSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={tagSearch}
                              onChange={e => setTagSearch(e.target.value)}
                              placeholder="Search tags..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {availableTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(t => {
                            const isChecked = selectedFilterTags.includes(t.id);
                            return (
                              <label key={t.id} className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        const updated = isChecked 
                                          ? selectedFilterTags.filter(id => id !== t.id)
                                          : [...selectedFilterTags, t.id];
                                        setSelectedFilterTags(updated);
                                        setSearchParams(prev => {
                                          const next = new URLSearchParams(prev);
                                          if (updated.length > 0) {
                                            next.set('tagId', updated.join(','));
                                          } else {
                                            next.delete('tagId');
                                          }
                                          return next;
                                        });
                                      }}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                        isChecked 
                                          ? 'bg-[#0099ff] border-[#0099ff] text-white shadow-sm' 
                                          : 'border-border/80 bg-background/60 group-hover:border-muted-foreground'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <span 
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.color || '#374151' }}
                                  />
                                  <span className="truncate font-medium">{t.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                                  {t.linkCount ?? 0}
                                </span>
                              </label>
                            );
                          })}
                          {availableTags.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No tags found</div>}
                        </div>
                      </>
                    ) : activeFilter === 'campaign' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setCampaignSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={campaignSearch}
                              onChange={e => setCampaignSearch(e.target.value)}
                              placeholder="Search campaigns..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {availableCampaigns.filter(c => c.name.toLowerCase().includes(campaignSearch.toLowerCase())).map(c => {
                            const isSelected = selectedCampaign === c.name;
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  const nextCampaign = isSelected ? null : c.name;
                                  setSelectedCampaign(nextCampaign);
                                  setSearchParams(prev => {
                                    const next = new URLSearchParams(prev);
                                    if (nextCampaign) {
                                      next.set('campaign', nextCampaign);
                                    } else {
                                      next.delete('campaign');
                                    }
                                    return next;
                                  });
                                  setIsFilterOpen(false);
                                  setActiveFilter('none');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 text-primary font-semibold' 
                                    : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span className="truncate font-medium">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded-full bg-secondary/50">
                                    {c.count}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                                </div>
                              </button>
                            );
                          })}
                          {availableCampaigns.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No UTM campaigns found</div>}
                        </div>
                      </>
                    ) : activeFilter === 'type' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-foreground px-2">Link Type</span>
                        </div>
                        <div className="py-1 p-1 space-y-0.5">
                          {[
                            { value: 'all', label: 'All Links', desc: 'Show standalone & campaign links' },
                            { value: 'standalone', label: 'Standalone Only', desc: 'Links without UTM campaign' },
                            { value: 'campaign', label: 'Campaign Links Only', desc: 'Links with UTM campaign' },
                          ].map((item) => {
                            const isSelected = selectedLinkType === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  const val = item.value as 'all' | 'standalone' | 'campaign';
                                  setSelectedLinkType(val);
                                  setSearchParams(prev => {
                                    const next = new URLSearchParams(prev);
                                    if (val !== 'all') {
                                      next.set('linkType', val);
                                    } else {
                                      next.delete('linkType');
                                    }
                                    return next;
                                  });
                                  setIsFilterOpen(false);
                                  setActiveFilter('none');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 text-primary font-medium' 
                                    : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                                }`}
                              >
                                <div className="flex flex-col items-start min-w-0">
                                  <span className="font-medium truncate">{item.label}</span>
                                  <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5] shrink-0 ml-2" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
              
              <div className="relative" ref={displayRef}>
                <button 
                  onClick={() => setIsDisplayOpen(!isDisplayOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Display
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                
                <AnimatePresence>
                {isDisplayOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="absolute top-full left-0 mt-1 bg-popover rounded-xl shadow-lg border border-border w-[300px] z-50 flex flex-col"
                  >
                    {/* Ordering Section */}
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground text-xs font-medium">
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                        Ordering
                      </div>
                      <div className="relative flex items-center gap-1.5">
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="p-1.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                        >
                          <ArrowUpDown className={`h-3.5 w-3.5 transform transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className="relative" ref={sortMenuRef}>
                          <button 
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className="flex items-center justify-between w-32 px-2.5 py-1 bg-background border border-input rounded-lg text-xs text-foreground hover:bg-secondary transition-colors"
                          >
                            <span className="truncate">
                              {sortBy === 'dateCreated' ? 'Date created' : 'Total clicks'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          
                          <AnimatePresence>
                          {isSortMenuOpen && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.1, ease: "easeOut" }}
                              className="absolute right-0 top-full mt-1 w-44 bg-popover rounded-xl shadow-lg border border-border z-[60] overflow-hidden py-1"
                            >
                              <button
                                onClick={() => { setSortBy('dateCreated'); setIsSortMenuOpen(false); }}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-muted-foreground" />
                                  Date created
                                </span>
                                {sortBy === 'dateCreated' && <Check className="w-3.5 h-3.5 text-[#0099ff] stroke-[2.5]" />}
                              </button>
                              
                              <button
                                onClick={() => { setSortBy('totalClicks'); setIsSortMenuOpen(false); }}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-muted-foreground" />
                                  Total clicks
                                </span>
                                {sortBy === 'totalClicks' && <Check className="w-3.5 h-3.5 text-[#0099ff] stroke-[2.5]" />}
                              </button>
                            </motion.div>
                          )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                    
                    {/* Display Properties Section */}
                    <div className="p-3 flex flex-col gap-2">
                      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display Properties</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <button 
                          disabled={true}
                          className="px-2.5 py-1 text-xs border rounded-lg font-medium border-neutral-200/80 dark:border-[#27272A] bg-neutral-100/60 dark:bg-[#18181B]/60 text-muted-foreground cursor-not-allowed shadow-sm"
                          title="Always visible"
                        >
                          Short link
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, destinationUrl: !prev.destinationUrl }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.destinationUrl 
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Destination URL
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, clicks: !prev.clicks }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.clicks 
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Analytics
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({
                            ...prev,
                            createdAt: !prev.createdAt,
                            campaignCreatedAt: !prev.campaignCreatedAt,
                          }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.createdAt || displayProps.campaignCreatedAt
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Created Date
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, tags: !prev.tags }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.tags 
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Tags
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, status: !prev.status }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.status 
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Status
                        </button>
                        <button 
                          onClick={() => setDisplayProps(prev => ({ ...prev, password: !prev.password }))}
                          className={`px-2.5 py-1 text-xs border rounded-lg font-medium transition-all ${
                            displayProps.password 
                              ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm' 
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          Password
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by short link or URL" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 border border-input bg-background rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          {/* Active Compound Filter Pills */}
          {(validFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Tag Filter Pill */}
              {validFilterTags.length > 0 && (
                <div className="relative inline-flex items-center" ref={tagPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <Tag className="w-3 h-3" />
                      Tag
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsTagPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors"
                    >
                      {selectedFilterTags.length === 1 ? (
                        (() => {
                          const tag = tags.find(t => t.id === selectedFilterTags[0]);
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag?.color || '#374151' }} />
                              <span>{tag?.name || selectedFilterTags[0]}</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <div className="flex items-center -space-x-1">
                            {selectedFilterTags.slice(0, 4).map(id => {
                              const tag = tags.find(t => t.id === id);
                              return (
                                <span 
                                  key={id} 
                                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-background" 
                                  style={{ backgroundColor: tag?.color || '#374151' }} 
                                />
                              );
                            })}
                          </div>
                          <span>{selectedFilterTags.length} Tags</span>
                        </span>
                      )}
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedFilterTags([]);
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete('tagId');
                          return next;
                        });
                        setIsTagPillPopoverOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Popover Dropdown */}
                  <AnimatePresence>
                    {isTagPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center">
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={tagPillSearch}
                              onChange={e => setTagPillSearch(e.target.value)}
                              placeholder="Tag..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {availableTags.filter(t => t.name.toLowerCase().includes(tagPillSearch.toLowerCase())).map(t => {
                            const isChecked = selectedFilterTags.includes(t.id);
                            return (
                              <label key={t.id} className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        const updated = isChecked 
                                          ? selectedFilterTags.filter(id => id !== t.id)
                                          : [...selectedFilterTags, t.id];
                                        setSelectedFilterTags(updated);
                                        setSearchParams(prev => {
                                          const next = new URLSearchParams(prev);
                                          if (updated.length > 0) {
                                            next.set('tagId', updated.join(','));
                                          } else {
                                            next.delete('tagId');
                                          }
                                          return next;
                                        });
                                      }}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                        isChecked 
                                          ? 'bg-[#0099ff] border-[#0099ff] text-white shadow-sm' 
                                          : 'border-border/80 bg-background/60 group-hover:border-muted-foreground'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <span 
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.color || '#374151' }}
                                  />
                                  <span className="truncate font-medium">{t.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                                  {t.linkCount ?? 0}
                                </span>
                              </label>
                            );
                          })}
                          {availableTags.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No tags found</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Campaign Filter Pill */}
              {selectedCampaign && (
                <div className="relative inline-flex items-center" ref={campaignPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <Layers className="w-3 h-3 text-primary" />
                      Campaign
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsCampaignPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors"
                    >
                      <span className="truncate max-w-[150px] font-semibold text-primary">{selectedCampaign}</span>
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCampaign(null);
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete('campaign');
                          return next;
                        });
                        setIsCampaignPillPopoverOpen(false);
                      }}
                      title="Clear campaign filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Popover Dropdown for Campaign */}
                  <AnimatePresence>
                    {isCampaignPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center">
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={campaignPillSearch}
                              onChange={e => setCampaignPillSearch(e.target.value)}
                              placeholder="Search campaigns..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {availableCampaigns.filter(c => c.name.toLowerCase().includes(campaignPillSearch.toLowerCase())).map(c => {
                            const isSelected = selectedCampaign === c.name;
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  setSelectedCampaign(c.name);
                                  setSearchParams(prev => {
                                    const next = new URLSearchParams(prev);
                                    next.set('campaign', c.name);
                                    return next;
                                  });
                                  setIsCampaignPillPopoverOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 text-primary font-semibold' 
                                    : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span className="truncate font-medium">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded-full bg-secondary/50">
                                    {c.count}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Link Type Filter Pill */}
              {selectedLinkType !== 'all' && (
                <div className="relative inline-flex items-center" ref={linkTypePillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <LinkIcon className="w-3 h-3 text-primary" />
                      Type
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsLinkTypePillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors capitalize"
                    >
                      <span className="font-semibold text-primary">{selectedLinkType === 'standalone' ? 'Standalone' : 'Campaign Links'}</span>
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedLinkType('all');
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete('linkType');
                          return next;
                        });
                        setIsLinkTypePillPopoverOpen(false);
                      }}
                      title="Clear type filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Popover Dropdown for Link Type */}
                  <AnimatePresence>
                    {isLinkTypePillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-56 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="py-1 p-1 space-y-0.5">
                          {[
                            { value: 'all', label: 'All Links' },
                            { value: 'standalone', label: 'Standalone Only' },
                            { value: 'campaign', label: 'Campaign Links Only' },
                          ].map((item) => {
                            const isSelected = selectedLinkType === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  const val = item.value as 'all' | 'standalone' | 'campaign';
                                  setSelectedLinkType(val);
                                  setSearchParams(prev => {
                                    const next = new URLSearchParams(prev);
                                    if (val !== 'all') {
                                      next.set('linkType', val);
                                    } else {
                                      next.delete('linkType');
                                    }
                                    return next;
                                  });
                                  setIsLinkTypePillPopoverOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 text-primary font-semibold' 
                                    : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                                }`}
                              >
                                <span>{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {loadingAll ? (
            <div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col gap-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border-b border-dashed border-border last:border-b-0">
                  <div className="shrink-0 mr-4">
                    <Skeleton circle width={36} height={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-2"><Skeleton width="40%" height={18} /></div>
                    <div><Skeleton width="60%" height={14} /></div>
                  </div>
                  <div className="shrink-0 ml-4 flex items-center gap-3">
                    <Skeleton width={60} height={28} borderRadius={6} />
                    <Skeleton width={28} height={28} borderRadius={6} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {viewMode === 'campaigns' ? (
                <motion.div 
                  key="campaigns-view"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="space-y-4"
                >
              {campaigns.length === 0 ? (
                <div className="bg-background border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                    <Layers className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">No Marketing Campaigns Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Links created with a <code className="text-primary font-medium">utm_campaign</code> parameter or generated via the Multi-Channel batch generator will appear grouped here.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSetViewMode('all')}
                      className="px-3.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      View All Links
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (openCreateModal) {
                          openCreateModal('multi');
                        } else {
                          setIsCreateModalOpen(true);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Create Campaign Links
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(campaign => (
                    <CampaignGroupCard
                      key={campaign.campaignName}
                      campaign={campaign}
                      displayDomain={displayDomain}
                      protocol={protocol}
                      displayProps={displayProps}
                      folders={folders}
                      tags={tags}
                      onRefresh={refreshDashboardData}
                      onOpenQr={handleOpenQr}
                      onEditUrl={(url) => {
                        setEditingUrl(url);
                        setIsCreateModalOpen(true);
                      }}
                      onDeleteUrl={handleDeleteUrl}
                      initialExpanded={campaigns.length === 1}
                    />
                  ))}
                </div>
              )}
                </motion.div>
              ) : (
                <motion.div 
                  key="links-view"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="bg-background border border-border rounded-xl overflow-visible flex flex-col gap-0"
                >
              {displayedUrls.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                    <LinkIcon className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {searchQuery || validFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all' || (currentFolder && currentFolder.name.toLowerCase() !== 'links')
                        ? 'No links match your filter criteria'
                        : 'No short links yet'}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery || validFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all' || (currentFolder && currentFolder.name.toLowerCase() !== 'links')
                        ? 'Try clearing active filters or adjusting your search term to see other links.'
                        : 'Get started by creating your first shortened URL or batch campaign.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {(searchQuery || validFilterTags.length > 0 || selectedCampaign || selectedLinkType !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedFilterTags([]);
                          setSelectedCampaign(null);
                          setSelectedLinkType('all');
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            next.delete('tagId');
                            next.delete('campaign');
                            next.delete('linkType');
                            return next;
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (openCreateModal) {
                          openCreateModal('single');
                        } else {
                          setIsCreateModalOpen(true);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Create New Link
                    </button>
                  </div>
                </div>
              ) : (
                displayedUrls.map((url) => (
                  <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} key={url.shortUrl} className="group relative flex items-center p-4 border-b border-dashed border-border last:border-b-0 hover:border-solid hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all first:rounded-t-xl last:rounded-b-xl">
                    {/* Favicon */}
                    <div className="shrink-0 mr-4">
                      <div className="w-9 h-9 rounded-full border border-border bg-secondary overflow-hidden flex items-center justify-center p-1">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${url.longUrl}&sz=64`} 
                          alt="Favicon" 
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <a href={`${protocol}//${displayDomain}/${extractHash(url.shortUrl)}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground truncate hover:underline">
                          {displayDomain}/{extractHash(url.shortUrl)}
                        </a>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <button 
                            onClick={() => {
                              const copyUrl = `${protocol}//${displayDomain}/${extractHash(url.shortUrl)}`;
                              navigator.clipboard.writeText(copyUrl);
                              setCopiedHash(url.shortUrl);
                              toast.success("Link copied to clipboard");
                              setTimeout(() => setCopiedHash(null), 2000);
                            }}
                            className={`p-1 rounded transition-colors ${copiedHash === url.shortUrl ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                            title="Copy link"
                          >
                            {copiedHash === url.shortUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            onClick={() => handleOpenQr(extractHash(url.shortUrl))}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                            title="QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {displayProps.destinationUrl && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5 ml-0.5">
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
                        <div className="relative group/tag inline-flex items-center mt-1.5">
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-[#18181B] text-foreground border border-neutral-200/80 dark:border-[#27272A] shadow-sm"
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: url.tags[0].color || '#3b82f6' }}
                            />
                            <span>{url.tags[0].name}</span>
                            {url.tags.length > 1 && (
                              <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                                +{url.tags.length - 1}
                              </span>
                            )}
                          </span>
                          
                          {/* Tooltip */}
                          {url.tags.length > 1 && (
                            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tag:flex items-center bg-popover text-popover-foreground shadow-xl border border-border rounded-xl p-1.5 gap-1.5 z-[60] min-w-max">
                              {url.tags.map(t => (
                                <span 
                                  key={t.id} 
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-[#18181B] text-foreground border border-neutral-200/80 dark:border-[#27272A] shadow-sm"
                                >
                                  <span 
                                    className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: t.color || '#3b82f6' }}
                                  />
                                  <span>{t.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2.5 ml-4">
                      {displayProps.password && url.hasPassword && (
                        <div className="flex items-center justify-center p-1 rounded-md bg-secondary text-muted-foreground border border-border" title="Password Protected">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      {displayProps.status && url.expiresAt && (() => {
                        const expDate = new Date(url.expiresAt.endsWith('Z') ? url.expiresAt : url.expiresAt + 'Z');
                        const isExpired = !url.isActive || expDate < new Date();
                        if (!isExpired) {
                          return (
                            <div title={`${formatDistanceToNow(expDate)} remaining`} className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-xs font-medium cursor-help">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </div>
                          );
                        } else {
                          return (
                            <div title="Expired" className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg text-xs font-medium cursor-help">
                              <XCircle className="w-3.5 h-3.5" />
                              Expired
                            </div>
                          );
                        }
                      })()}
                      
                      {displayProps.clicks && (
                        <Link to={`/analytics/${extractHash(url.shortUrl)}`} className="flex items-center gap-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors px-2.5 py-1 rounded-lg border border-border">
                          <ClickArrowIcon className="w-3 h-3 text-primary" />
                          {url.accessed_times}
                          <span className="hidden sm:inline ml-0.5 text-muted-foreground font-normal">clicks</span>
                        </Link>
                      )}
                      
                      <div className="relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === url.shortUrl ? null : url.shortUrl)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        
                        <AnimatePresence>
                        {openMenuId === url.shortUrl && (
                          <>
                            {/* Invisible click-outside backdrop */}
                            <div 
                              className="fixed inset-0 z-40 bg-transparent cursor-default" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                              }} 
                            />
                            <motion.div 
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.1, ease: "easeOut" }}
                              className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-lg z-50 p-1 divide-y divide-border"
                            >
                              <div className="py-0.5">
                                <Link
                                  to={`/analytics/${extractHash(url.shortUrl)}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Analytics</span>
                                  </div>
                                </Link>
                                <Link
                                  to={`/events?hash=${extractHash(url.shortUrl)}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary" />
                                    <span>Events</span>
                                  </div>
                                </Link>
                                <button
                                  onClick={() => {
                                    setEditingUrl(url);
                                    setIsCreateModalOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Edit</span>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    handleOpenQr(extractHash(url.shortUrl));
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>QR Code</span>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    const copyUrl = `${protocol}//${displayDomain}/${extractHash(url.shortUrl)}`;
                                    navigator.clipboard.writeText(copyUrl);
                                    setCopiedHash(url.shortUrl);
                                    toast.success("Link copied to clipboard");
                                    setTimeout(() => setCopiedHash(null), 2000);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Copy Link</span>
                                  </div>
                                </button>
                              </div>
                              <div className="pt-1">
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
                                  className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete</span>
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

      {/* ── QR Code Studio Modal ──────────────────────────── */}
      {isQrModalOpen && (
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={closeQrModal}
          shortUrl={activeQrUrl}
          hash={activeQrHash || undefined}
        />
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {isCreateModalOpen && editingUrl && (
        <CreateLinkModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingUrl(null);
          }}
          folders={folders}
          tags={tags}
          urlToEdit={editingUrl}
          onSuccess={(updatedEntry) => {
            const entry = updatedEntry.accessed_times !== undefined ? updatedEntry : mapDtoToEntry(updatedEntry);
            const idx = urls.findIndex(u => u.shortUrl === editingUrl.shortUrl);
            if (idx !== -1) {
              handleUpdated(idx, entry);
            }
          }}
        />
      )}
    </motion.div>
  );
};

export default DashboardPage;
