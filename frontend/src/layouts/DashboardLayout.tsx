import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import { Link as LinkIcon, BarChart2, Folder as FolderIcon, Tag as TagIcon, ChevronDown, FolderPlus, Search, HelpCircle, User, Settings, Gift, LogOut, ArrowLeft, Shield, Download, Sun, Moon, Monitor, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import type { Tag, Folder, UrlEntry } from '../types';
import CreateLinkModal from '../components/CreateLinkModal';
import CreateTagModal from '../components/CreateTagModal';
import FolderModal from '../components/FolderModal';
import { UtmTemplateModal } from '../components/UtmTemplateModal';
import BrandLogo from '../components/BrandLogo';
import ClickArrowIcon from '../components/icons/ClickArrowIcon';
import { Toaster, toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import { getSavedUtmTemplates, fetchUtmTemplatesApi, type UtmTemplate } from '../utils/utmUtils';

export type DashboardLayoutContext = {
  triggerRefresh: UrlEntry | null;
  tags: Tag[];
  folders: Folder[];
  templates: UtmTemplate[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setTemplates: React.Dispatch<React.SetStateAction<UtmTemplate[]>>;
  activeFolderId: number | null;
  setActiveFolderId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsFolderModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreateTagModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreateUtmTemplateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFolderToEdit: React.Dispatch<React.SetStateAction<any | null>>;
  setTagToEdit: React.Dispatch<React.SetStateAction<any | null>>;
  setUtmTemplateToEdit: React.Dispatch<React.SetStateAction<UtmTemplate | null>>;
  setUtmTemplateToDuplicate: React.Dispatch<React.SetStateAction<UtmTemplate | null>>;
  isTagsLoading: boolean;
  isFoldersLoading: boolean;
  navStats: { totalClicks: number; linkCount: number };
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ folderSlug?: string }>();
  const match = location.pathname.match(/\/(?:dashboard|analytics)\/f\/([^/?#]+)/);
  const folderSlug = params.folderSlug || (match ? match[1] : undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isCreateUtmTemplateModalOpen, setIsCreateUtmTemplateModalOpen] = useState(false);
  
  const [folderToEdit, setFolderToEdit] = useState<any | null>(null);
  const [tagToEdit, setTagToEdit] = useState<any | null>(null);
  const [utmTemplateToEdit, setUtmTemplateToEdit] = useState<UtmTemplate | null>(null);
  const [utmTemplateToDuplicate, setUtmTemplateToDuplicate] = useState<UtmTemplate | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);

  useEffect(() => {
    setTemplates(getSavedUtmTemplates());
  }, []);

  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [isFoldersLoading, setIsFoldersLoading] = useState(true);
  
  const [isFolderSwitcherOpen, setIsFolderSwitcherOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const folderSwitcherRef = useRef<HTMLDivElement>(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsFolderSwitcherOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderSwitcherRef.current && !folderSwitcherRef.current.contains(event.target as Node)) {
        setIsFolderSwitcherOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [navStats, setNavStats] = useState({ totalClicks: 0, linkCount: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const [latestNewEntry, setLatestNewEntry] = useState<UrlEntry | null>(null);
  
  const triggerRefresh = (newEntry: UrlEntry) => {
    setLatestNewEntry(newEntry);
  };

  useEffect(() => {
    let cancelled = false;
    const loadTagsAndFolders = async (isBackground = false) => {
      try {
        const [tagsRes, foldersRes, utmTemplates] = await Promise.allSettled([
          axiosInstance.get<Tag[]>('/tags'),
          axiosInstance.get<Folder[]>('/folders'),
          fetchUtmTemplatesApi()
        ]);
        if (!cancelled) {
          if (tagsRes.status === 'fulfilled') setTags(tagsRes.value.data);
          if (foldersRes.status === 'fulfilled') setFolders(foldersRes.value.data);
          if (utmTemplates.status === 'fulfilled') setTemplates(utmTemplates.value);
        }
      } catch (err) {
        // Silent error in background
      } finally {
        if (!cancelled && !isBackground) {
          setIsTagsLoading(false);
          setIsFoldersLoading(false);
        }
      }
    };

    if (user && user.role !== 'ROOT' && user.role !== 'ROLE_ROOT') {
      loadTagsAndFolders(false);

      const intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadTagsAndFolders(true);
        }
      }, 3_000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          loadTagsAndFolders(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      setIsTagsLoading(false);
      setIsFoldersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadUsageStats = async (isBackground = false) => {
      try {
        const { data } = await axiosInstance.get('/analytics/usage');
        if (!cancelled) setNavStats({ totalClicks: data.totalClicks, linkCount: data.totalLinks });
      } catch (err) {
        console.error("Failed to load usage stats", err);
      } finally {
        if (!cancelled && !isBackground) setIsStatsLoading(false);
      }
    };

    if (user && user.role !== 'ROOT' && user.role !== 'ROLE_ROOT') {
      loadUsageStats(false);

      const intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadUsageStats(true);
        }
      }, 3_000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          loadUsageStats(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      setIsStatsLoading(false);
    }
  }, [user, latestNewEntry]);

  const getTitle = () => {
    if (location.pathname.startsWith('/analytics')) return 'Analytics';
    if (location.pathname.startsWith('/folders')) return 'Folders';
    if (location.pathname.startsWith('/tags')) return 'Tags';
    return 'Links';
  };

  const renderHeaderButton = () => {
    if (location.pathname.startsWith('/analytics')) {
      return (
        <button
          onClick={() => {
            const currentUrl = window.location.href;
            if (navigator?.clipboard?.writeText) {
              navigator.clipboard.writeText(currentUrl);
            }
            toast.success('Analytics link copied to clipboard!');
          }}
          className="btn-solid flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      );
    }

    if (location.pathname.startsWith('/folders')) {
      return (
        <button
          onClick={() => {
            setFolderToEdit(null);
            setIsFolderModalOpen(true);
          }}
          className="btn-solid flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" /> Create Folder
        </button>
      );
    }

    if (location.pathname.startsWith('/tags')) {
      return (
        <button
          onClick={() => {
            setTagToEdit(null);
            setIsCreateTagModalOpen(true);
          }}
          className="btn-solid flex items-center gap-2"
        >
          <TagIcon className="w-4 h-4" /> Create Tag
        </button>
      );
    }

    if (location.pathname.startsWith('/utm-templates') || location.pathname === '/utm') {
      return (
        <button
          onClick={() => {
            setUtmTemplateToEdit(null);
            setIsCreateUtmTemplateModalOpen(true);
          }}
          className="btn-solid flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" /> Create template
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="btn-solid flex items-center gap-2"
      >
        <LinkIcon className="w-4 h-4" /> Create link
      </button>
    );
  };

  const activeFolderName = folderSlug 
    ? (folders.find(f => (f.slug && f.slug.toLowerCase() === folderSlug.toLowerCase()) || f.name.toLowerCase() === folderSlug.toLowerCase() || f.name.toLowerCase().replace(/\s+/g, '-') === folderSlug.toLowerCase())?.name || folderSlug)
    : (activeFolderId ? (folders.find(f => f.id === activeFolderId)?.name || 'All Links') : 'All Links');

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground font-sans">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-16 shrink-0 bg-background border-r border-border hidden sm:flex flex-col items-center py-4 z-30">
        <div className="mb-8 flex items-center justify-center w-full px-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <BrandLogo className="w-8 h-8 text-foreground" />
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <button 
            onClick={() => toast('Help & Support coming soon!', { icon: '👋' })}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
            title="Help & Support"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          
          <div className="relative" ref={themeMenuRef}>
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Switch Theme"
            >
              {theme === 'system' ? <Monitor className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <AnimatePresence>
            {isThemeMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="absolute left-full ml-3 bottom-0 z-50 bg-background border border-border shadow-lg rounded-xl w-32 p-1 flex flex-col gap-0.5"
              >
                <button
                  onClick={() => { setTheme('light'); setIsThemeMenuOpen(false); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors w-full text-left ${theme === 'light' ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <Sun className="w-3.5 h-3.5" /> Light
                </button>
                <button
                  onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors w-full text-left ${theme === 'dark' ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <Moon className="w-3.5 h-3.5" /> Dark
                </button>
                <button
                  onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors w-full text-left ${theme === 'system' ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <Monitor className="w-3.5 h-3.5" /> System
                </button>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold uppercase border border-border cursor-pointer hover:border-primary/40 transition-colors"
            >
              {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
            </button>

            <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="absolute bottom-full left-0 mb-2 w-60 bg-background border border-border rounded-xl shadow-lg z-50 p-1.5"
              >
                <div className="px-3 py-2 border-b border-border mb-1">
                  <div className="font-medium text-sm text-foreground truncate">{user?.name || 'User'}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
                
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      toast('Profile page coming soon!', { icon: '👤' });
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors w-full text-left"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Profile
                  </button>
                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    Account settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      toast("What's new coming soon!", { icon: '🎁' });
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors w-full text-left"
                  >
                    <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                    What's new
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors w-full text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── Main Layout Body ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen bg-background">
        
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur px-6 flex items-center justify-between shrink-0 relative z-30">
          <div className="flex items-center gap-2 relative" ref={folderSwitcherRef}>
            {location.pathname.startsWith('/settings') ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-base font-semibold text-foreground tracking-tight">
                  Settings
                </h1>
              </div>
            ) : location.pathname.startsWith('/dashboard') ? (
              <>
                <button 
                  onClick={() => setIsFolderSwitcherOpen(!isFolderSwitcherOpen)}
                  className="text-base font-semibold text-foreground tracking-tight flex items-center gap-1.5 cursor-pointer hover:bg-secondary px-2.5 py-1 rounded-lg transition-colors"
                >
                  {activeFolderName}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                
                <AnimatePresence>
                {isFolderSwitcherOpen && (
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
                        value={folderSearch}
                        onChange={(e) => setFolderSearch(e.target.value)}
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => {
                          navigate('/folders');
                          setIsFolderSwitcherOpen(false);
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex-shrink-0 whitespace-nowrap"
                      >
                        View All
                      </button>
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 py-1">
                      {/* All Links Option */}
                      <button
                        onClick={() => {
                          setActiveFolderId(null);
                          navigate('/dashboard');
                          setIsFolderSwitcherOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${!folderSlug && !activeFolderId ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3.5 h-3.5 text-primary" />
                          <span>All Links</span>
                        </div>
                      </button>

                      {folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase())).map(folder => {
                        const isDefault = folder.name.toLowerCase() === 'links';
                        const slug = folder.slug || encodeURIComponent(folder.name.toLowerCase().replace(/\s+/g, '-'));
                        const isSelected = (folderSlug && ((folder.slug && folder.slug.toLowerCase() === folderSlug.toLowerCase()) || folder.name.toLowerCase() === folderSlug.toLowerCase() || folder.name.toLowerCase().replace(/\s+/g, '-') === folderSlug.toLowerCase())) || (!folderSlug && activeFolderId === folder.id);

                        return (
                          <motion.button
                            layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                            key={folder.id}
                            onClick={() => {
                              setActiveFolderId(folder.id);
                              navigate(`/dashboard/f/${slug}`);
                              setIsFolderSwitcherOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                          >
                            <div className="flex items-center gap-2">
                              <FolderIcon className={`w-3.5 h-3.5 ${isDefault ? 'text-primary' : 'text-emerald-500'}`} />
                              <span>{folder.name}</span>
                            </div>
                            {isDefault && (
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                Default
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                      {folders.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No folders found</div>}
                    </div>
                    
                    <button
                      onClick={() => {
                        navigate('/folders?create=true');
                        setIsFolderSwitcherOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors flex items-center gap-2 font-medium border-t border-border pt-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      Create new folder
                    </button>
                  </motion.div>
                )}
                </AnimatePresence>
              </>
            ) : location.pathname.startsWith('/analytics') ? (
              <h1 className="text-base font-semibold text-foreground tracking-tight px-1">
                Analytics
              </h1>
            ) : location.pathname.startsWith('/folders') ? (
              <h1 className="text-base font-semibold text-foreground tracking-tight px-1">
                Folders
              </h1>
            ) : location.pathname.startsWith('/tags') ? (
              <h1 className="text-base font-semibold text-foreground tracking-tight px-1">
                Tags
              </h1>
            ) : location.pathname.startsWith('/utm-templates') || location.pathname === '/utm' ? (
              <h1 className="text-base font-semibold text-foreground tracking-tight px-1">
                UTM Templates
              </h1>
            ) : (
              <h1 className="text-base font-semibold text-foreground tracking-tight px-1">
                {getTitle()}
              </h1>
            )}
          </div>
          {!location.pathname.startsWith('/settings') && renderHeaderButton()}
        </header>

        {/* Top Navigation Tabs */}
        <div className="h-12 border-b border-border bg-background px-6 flex items-center justify-between text-sm shrink-0">
          <div className="flex items-center overflow-x-auto whitespace-nowrap gap-1">
            {location.pathname.startsWith('/settings') ? (
              <>
                <Link 
                  to="/settings" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname === '/settings' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  General
                </Link>
                <Link 
                  to="/settings/security" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname === '/settings/security' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Security
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to={folderSlug ? `/dashboard/f/${folderSlug}` : (activeFolderId ? `/dashboard?folderId=${activeFolderId}` : "/dashboard")} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/f/') ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Links
                </Link>
                <Link 
                  to={folderSlug ? `/analytics/f/${folderSlug}` : (activeFolderId ? `/analytics?folderId=${activeFolderId}` : "/analytics")} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname.startsWith('/analytics') ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Analytics
                </Link>
                <Link 
                  to="/folders" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname === '/folders' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <FolderIcon className="w-3.5 h-3.5" />
                  Folders
                </Link>
                <Link 
                  to="/tags" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname === '/tags' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  Tags
                </Link>
                <Link 
                  to="/utm-templates" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${location.pathname.startsWith('/utm-templates') || location.pathname === '/utm' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  UTM Templates
                </Link>
              </>
            )}
          </div>
          
          {!location.pathname.startsWith('/settings') && (
            <div className="flex items-center gap-4 ml-auto pl-4 text-xs text-muted-foreground shrink-0">
              {isStatsLoading ? (
                <>
                  <div className="flex items-center gap-1.5"><Skeleton width={40} height={16} /></div>
                  <div className="flex items-center gap-1.5"><Skeleton width={40} height={16} /></div>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5" title={`Total Clicks: ${navStats.totalClicks}`}>
                    <ClickArrowIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">{navStats.totalClicks}</span>
                  </span>
                  <span className="flex items-center gap-1.5" title={`Total Links: ${navStats.linkCount}`}>
                    <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">{navStats.linkCount}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Main Content Rendered Directly */}
        <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
          <div className="w-full max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <Outlet key={location.pathname} context={{ 
                triggerRefresh: latestNewEntry, 
                tags, 
                folders, 
                templates,
                setTags, 
                setFolders, 
                setTemplates,
                activeFolderId, 
                setActiveFolderId,
                setIsFolderModalOpen,
                setIsCreateTagModalOpen,
                setIsCreateUtmTemplateModalOpen,
                setFolderToEdit,
                setTagToEdit,
                setUtmTemplateToEdit,
                setUtmTemplateToDuplicate,
                isTagsLoading,
                isFoldersLoading,
                navStats
              } satisfies DashboardLayoutContext} />
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* ── Create Link Modal ────────────────────────────── */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newEntry) => {
          if (newEntry) triggerRefresh(newEntry);
        }}
        folders={folders}
        tags={tags}
        defaultFolderId={activeFolderId || undefined}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
      />

      {/* ── Create Tag Modal ────────────────────────────── */}
      <CreateTagModal
        isOpen={isCreateTagModalOpen}
        tagToEdit={tagToEdit}
        onClose={() => {
          setIsCreateTagModalOpen(false);
          setTagToEdit(null);
        }}
        onSuccess={(updatedTag) => {
          if (tagToEdit) {
            setTags(tags.map(t => t.id === updatedTag.id ? updatedTag : t));
          } else {
            setTags([...tags, updatedTag]);
          }
        }}
      />

      {/* ── Create Folder Modal ────────────────────────────── */}
      <FolderModal
        isOpen={isFolderModalOpen}
        folderToEdit={folderToEdit}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        onSuccess={(updatedFolder) => {
          if (folderToEdit) {
            setFolders(folders.map(f => f.id === updatedFolder.id ? updatedFolder : f));
          } else {
            setFolders([...folders, updatedFolder]);
          }
        }}
      />

      {/* ── Create / Edit / Duplicate UTM Template Modal ────────────────────────────── */}
      <UtmTemplateModal
        isOpen={isCreateUtmTemplateModalOpen}
        templateToEdit={utmTemplateToEdit}
        templateToDuplicate={utmTemplateToDuplicate}
        onClose={() => {
          setIsCreateUtmTemplateModalOpen(false);
          setUtmTemplateToEdit(null);
          setUtmTemplateToDuplicate(null);
        }}
        onSuccess={(updated) => {
          setTemplates(updated);
        }}
      />
      
      <Toaster position="bottom-center" />
    </div>
  );
};

export default DashboardLayout;
