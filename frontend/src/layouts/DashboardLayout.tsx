import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Link as LinkIcon, BarChart2, Folder as FolderIcon, Tag as TagIcon, Activity, ChevronDown, Gift, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import type { Tag, Folder, UrlEntry } from '../types';
import CreateLinkModal from '../components/CreateLinkModal';

export type DashboardLayoutContext = {
  triggerRefresh: UrlEntry | null;
  tags: Tag[];
  folders: Folder[];
  setNavStats: (stats: { totalClicks: number; linkCount: number }) => void;
};

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
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
            <Gift className="w-5 h-5" />
          </button>
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors">
              {getTitle()}
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

        {/* Top Navigation Tabs */}
        <div className="shrink-0 h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between overflow-x-auto text-sm z-30">
          <div className="flex items-center h-12 gap-2">
            <Link 
              to="/dashboard" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname === '/dashboard' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <LinkIcon className="w-4 h-4" />
              Links
            </Link>
            <Link 
              to="/analytics" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 ${location.pathname.startsWith('/analytics') ? 'text-blue-600 border-blue-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </Link>
            <Link 
              to="/folders" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 cursor-not-allowed ${location.pathname === '/folders' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <FolderIcon className="w-4 h-4" />
              Folders
            </Link>
            <Link 
              to="/tags" 
              className={`flex items-center gap-2 px-4 h-full font-medium transition-colors border-b-2 cursor-not-allowed ${location.pathname === '/tags' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border-transparent'}`}
            >
              <TagIcon className="w-4 h-4" />
              Tags
            </Link>
          </div>
          
          <div className="flex items-center gap-4 ml-auto text-xs text-gray-500">
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
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ triggerRefresh: latestNewEntry, tags, folders, setNavStats } satisfies DashboardLayoutContext} />
        </div>

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
    </div>
  );
};

export default DashboardLayout;
