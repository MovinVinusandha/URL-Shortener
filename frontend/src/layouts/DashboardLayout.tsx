import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Link as LinkIcon, BarChart2, Folder as FolderIcon, Tag as TagIcon, ChevronDown, FolderPlus, Search, HelpCircle, User, Settings, Gift, LogOut, ArrowLeft, Shield, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { Tag, Folder, UrlEntry } from '../types';
import CreateLinkModal from '../components/CreateLinkModal';
import CreateTagModal from '../components/CreateTagModal';
import FolderModal from '../components/FolderModal';
import BrandLogo from '../components/BrandLogo';
import ClickArrowIcon from '../components/icons/ClickArrowIcon';
import { Toaster, toast } from 'react-hot-toast';

export type DashboardLayoutContext = {
  triggerRefresh: UrlEntry | null;
  tags: Tag[];
  folders: Folder[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  activeFolderId: number | null;
  setActiveFolderId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsFolderModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreateTagModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFolderToEdit: React.Dispatch<React.SetStateAction<any | null>>;
  setTagToEdit: React.Dispatch<React.SetStateAction<any | null>>;
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  
  const [folderToEdit, setFolderToEdit] = useState<any | null>(null);
  const [tagToEdit, setTagToEdit] = useState<any | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  
  const [isFolderSwitcherOpen, setIsFolderSwitcherOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const folderSwitcherRef = useRef<HTMLDivElement>(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderSwitcherRef.current && !folderSwitcherRef.current.contains(event.target as Node)) {
        setIsFolderSwitcherOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Stats for the sub-nav (populated by children)
  const [navStats, setNavStats] = useState({ totalClicks: 0, linkCount: 0 });

  // Function to pass down to children to trigger refresh
  const [latestNewEntry, setLatestNewEntry] = useState<UrlEntry | null>(null);
  
  const triggerRefresh = (newEntry: UrlEntry) => {
    setLatestNewEntry(newEntry);
  };

  useEffect(() => {
    let isMounted = true;
    const loadTags = async () => {
      try {
        const { data } = await axiosInstance.get<Tag[]>('/tags');
        if (isMounted) setTags(data);
      } catch (err) {}
    };

    const loadFolders = async () => {
      try {
        const { data } = await axiosInstance.get<Folder[]>('/folders');
        if (isMounted) setFolders(data);
      } catch (err) {}
    };

    if (user && user.role !== 'ROOT' && user.role !== 'ROLE_ROOT') {
      loadTags();
      loadFolders();
    }

    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadUsageStats = async () => {
      try {
        const { data } = await axiosInstance.get('/api/analytics/usage');
        if (isMounted) setNavStats({ totalClicks: data.totalClicks, linkCount: data.totalLinks });
      } catch (err) {
        console.error("Failed to load usage stats", err);
      }
    };

    if (user && user.role !== 'ROOT' && user.role !== 'ROLE_ROOT') {
      loadUsageStats();
    }
    return () => { isMounted = false; };
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
          onClick={() => toast.success('Export functionality coming soon!')}
          className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
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
          className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
        >
          <FolderPlus className="w-4 h-4" /> Create folder
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
          className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
        >
          <TagIcon className="w-4 h-4" /> Create tag
        </button>
      );
    }
    // Default case for /dashboard
    return (
      <button 
        onClick={() => setIsCreateModalOpen(true)}
        className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
      >
        <LinkIcon className="w-4 h-4" /> Create link
      </button>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-sans">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-20 shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden sm:flex flex-col items-center py-4 z-20">
        <div className="mb-8 flex items-center justify-center w-full px-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <BrandLogo className="w-10 h-10 text-black dark:text-white" />
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button 
            onClick={() => toast('Help & Support coming soon!', { icon: '👋' })}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm font-medium uppercase border border-gray-300 dark:border-slate-600 shadow-sm cursor-pointer"
            >
              {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
            </button>

            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl z-50 p-2">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 mb-1">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{user?.name || 'User'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      toast('Profile page coming soon!', { icon: '👤' });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors w-full text-left"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Profile
                  </button>
                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Account settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      toast("What's new coming soon!", { icon: '🎁' });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors w-full text-left"
                  >
                    <Gift className="w-4 h-4 text-gray-400" />
                    What's new
                  </button>
                  <div className="border-t border-gray-100 dark:border-slate-800 my-1"></div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900">
        
        {/* Top Header */}
        <header className="shrink-0 h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-40">
          <div className="flex items-center gap-2 relative" ref={folderSwitcherRef}>
            {location.pathname.startsWith('/settings') ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Settings
                </h1>
              </div>
            ) : location.pathname === '/dashboard' ? (
              <>
                <button 
                  onClick={() => setIsFolderSwitcherOpen(!isFolderSwitcherOpen)}
                  className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
                >
                  {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Links' : 'Links'}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {isFolderSwitcherOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-lg rounded-lg p-2 z-50 flex flex-col gap-2">
                    <div className="relative flex items-center justify-between gap-2 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white transition-shadow px-2">
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Search folders..." 
                        value={folderSearch}
                        onChange={(e) => setFolderSearch(e.target.value)}
                        className="flex-grow w-full py-1.5 bg-transparent border-none focus:ring-0 text-sm dark:text-white px-1"
                      />
                      <button
                        onClick={() => {
                          navigate('/folders');
                          setIsFolderSwitcherOpen(false);
                        }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex-shrink-0 whitespace-nowrap"
                      >
                        View All
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        setActiveFolderId(null);
                        navigate('/dashboard');
                        setIsFolderSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${activeFolderId === null ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      <FolderIcon className="w-4 h-4 text-gray-400" />
                      All Links
                    </button>
                    
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border-y border-gray-100 dark:border-slate-800 py-1">
                      {folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase())).map(folder => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            setActiveFolderId(folder.id);
                            navigate('/dashboard');
                            setIsFolderSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${activeFolderId === folder.id ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          <FolderIcon className="w-4 h-4 text-emerald-500" />
                          {folder.name}
                        </button>
                      ))}
                      {folders.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No folders found</div>}
                    </div>
                    
                    <button
                      onClick={() => {
                        navigate('/folders?create=true');
                        setIsFolderSwitcherOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2 font-medium"
                    >
                      <FolderPlus className="w-4 h-4 text-gray-400" />
                      Create new folder
                    </button>
                  </div>
                )}
              </>
            ) : (
              <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 px-2 py-1">
                {getTitle()}
              </h1>
            )}
          </div>
          {!location.pathname.startsWith('/settings') && renderHeaderButton()}
        </header>

        {/* Top Navigation Tabs */}
        <div className="shrink-0 h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between text-sm z-30">
          <div className="flex items-center overflow-x-auto whitespace-nowrap h-full gap-2">
            {location.pathname.startsWith('/settings') ? (
              <>
                <Link 
                  to="/settings" 
                  className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/settings' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
                >
                  <Settings className="w-4 h-4" />
                  General
                </Link>
                <Link 
                  to="/settings/security" 
                  className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/settings/security' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
                >
                  <Shield className="w-4 h-4" />
                  Security
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/dashboard" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/dashboard' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <LinkIcon className="w-4 h-4" />
              Links
            </Link>
            <Link 
              to={activeFolderId ? `/analytics?folderId=${activeFolderId}` : "/analytics"} 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname.startsWith('/analytics') ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </Link>
            <Link 
              to="/folders" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/folders' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <FolderIcon className="w-4 h-4" />
              Folders
            </Link>
            <Link 
              to="/tags" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/tags' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <TagIcon className="w-4 h-4" />
              Tags
                </Link>
              </>
            )}
          </div>
          
          {!location.pathname.startsWith('/settings') && (
            <div className="flex items-center gap-4 ml-auto pl-4 text-xs text-gray-500 shrink-0">
              <span className="flex items-center gap-1.5" title={`Total Clicks: ${navStats.totalClicks}`}>
                <ClickArrowIcon className="w-4 h-4 text-gray-500" />
                {navStats.totalClicks}
              </span>
              <span className="flex items-center gap-1.5" title={`Total Links: ${navStats.linkCount}`}>
                <LinkIcon className="w-4 h-4" />
                {navStats.linkCount}
              </span>
            </div>
          )}
        </div>

        {/* Main Content Rendered Here */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet context={{ 
              triggerRefresh: latestNewEntry, 
              tags, 
              folders, 
              setTags, 
              setFolders, 
              activeFolderId, 
              setActiveFolderId,
              setIsFolderModalOpen,
              setIsCreateTagModalOpen,
              setFolderToEdit,
              setTagToEdit
            } satisfies DashboardLayoutContext} />
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
      
      <Toaster position="bottom-center" />
    </div>
  );
};

export default DashboardLayout;
