import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MoreVertical, Trash2, Link as LinkIcon, Folder as FolderIcon, Pen } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';

const FoldersPage: React.FC = () => {
  const { folders, setFolders, setActiveFolderId, setFolderToEdit, setIsFolderModalOpen } = useOutletContext<DashboardLayoutContext>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<any | null>(null);
  const [searchParams] = useSearchParams();

  const handleFolderClick = (folderId: number) => {
    setActiveFolderId(folderId);
    navigate('/dashboard');
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsFolderModalOpen(true);
    }
  }, [searchParams]);

  const handleDeleteFolder = async (id: number) => {
    try {
      await axiosInstance.delete(`/folders/${id}`);
      setFolders(folders.filter(f => f.id !== id));
      setFolderToDelete(null);
    } catch (err) {
      console.error("Failed to delete folder", err);
    }
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 py-8 w-full">
      <div className="space-y-6">
        
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredFolders.map(folder => (
            <div key={folder.id} onClick={() => handleFolderClick(folder.id)} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow group relative cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <FolderIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{folder.name}</h3>
                  </div>
                </div>

                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {openMenuId === folder.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-lg z-[60] overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setFolderToEdit(folder);
                          setIsFolderModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Pen className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setFolderToDelete(folder);
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
              
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  {folder.linkCount || 0} {(folder.linkCount || 0) === 1 ? 'link' : 'links'}
                </div>
                {/* Optional Default badge logic can go here if needed */}
              </div>
            </div>
          ))}
          
          {filteredFolders.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
              No folders found.
            </div>
          )}
        </div>
      </div>

      {folderToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-xl p-6 shadow-xl border border-gray-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Folder</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete the "{folderToDelete.name}" folder? {folderToDelete.linkCount > 0 ? `This folder currently contains ${folderToDelete.linkCount} links. The folder will be deleted and the links will be moved out of it, but the links themselves will not be deleted.` : ''}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteFolder(folderToDelete.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoldersPage;
