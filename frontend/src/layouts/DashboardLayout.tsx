import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Link as LinkIcon, BarChart2, Folder as FolderIcon, Tag as TagIcon, Activity, ChevronDown, FolderPlus, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { Tag, Folder, UrlEntry } from '../types';
import CreateLinkModal from '../components/CreateLinkModal';
import CreateTagModal from '../components/CreateTagModal';
import FolderModal from '../components/FolderModal';

export type DashboardLayoutContext = {
  triggerRefresh: UrlEntry | null;
  tags: Tag[];
  folders: Folder[];
  setNavStats: (stats: { totalClicks: number; linkCount: number }) => void;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  activeFolderId: number | null;
  setActiveFolderId: React.Dispatch<React.SetStateAction<number | null>>;
};

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  
  const [isFolderSwitcherOpen, setIsFolderSwitcherOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const folderSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderSwitcherRef.current && !folderSwitcherRef.current.contains(event.target as Node)) {
        setIsFolderSwitcherOpen(false);
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

  const getTitle = () => {
    if (location.pathname.startsWith('/analytics')) return 'Analytics';
    if (location.pathname.startsWith('/folders')) return 'Folders';
    if (location.pathname.startsWith('/tags')) return 'Tags';
    return 'Links';
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-sans">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-16 shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden sm:flex flex-col items-center py-4 z-20">
        <div className="mb-8 flex items-center justify-center w-full px-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 flex items-center justify-center bg-black dark:bg-white rounded-lg text-white dark:text-black font-bold">
            <LinkIcon className="w-5 h-5" />
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm font-medium uppercase border border-gray-300 dark:border-slate-600 shadow-sm">
            {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900">
        
        {/* Top Header */}
        <header className="shrink-0 h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-40">
          <div className="flex items-center gap-2 relative" ref={folderSwitcherRef}>
            {location.pathname === '/dashboard' ? (
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
          {location.pathname.includes('/analytics') ? (
            <button 
              className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
            >
              Export
            </button>
          ) : (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-black text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
            >
              Create link
            </button>
          )}
        </header>

        {/* Top Navigation Tabs */}
        <div className="shrink-0 h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between text-sm z-30">
          <div className="flex items-center overflow-x-auto whitespace-nowrap h-full gap-2">
            <Link 
              to="/dashboard" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/dashboard' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <LinkIcon className="w-4 h-4" />
              Links
            </Link>
            <Link 
              to="/analytics" 
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
          </div>
          
          <div className="flex items-center gap-4 ml-auto pl-4 text-xs text-gray-500 shrink-0">
            <span className="flex items-center gap-1" title={`Total Clicks: ${navStats.totalClicks}`}>
              <Activity className="w-3.5 h-3.5" />
              {navStats.totalClicks}/1K
            </span>
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" />
              {navStats.linkCount}/25
            </span>
          </div>
        </div>

        {/* Main Content Rendered Here */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet context={{ triggerRefresh: latestNewEntry, tags, folders, setNavStats, setTags, setFolders, activeFolderId, setActiveFolderId } satisfies DashboardLayoutContext} />
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
      />

      {/* ── Create Tag Modal ────────────────────────────── */}
      <CreateTagModal
        isOpen={isCreateTagModalOpen}
        onClose={() => setIsCreateTagModalOpen(false)}
        onSuccess={(newTag) => {
          setTags([...tags, newTag]);
        }}
      />

      {/* ── Create Folder Modal ────────────────────────────── */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSuccess={(newFolder) => {
          setFolders([...folders, newFolder]);
        }}
      />
    </div>
  );
};

export default DashboardLayout;
