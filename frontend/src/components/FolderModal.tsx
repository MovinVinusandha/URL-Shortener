import React, { useState, useEffect } from 'react';
import { X, Folder as FolderIcon } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import type { Folder } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folder: Folder) => void;
  folderToEdit?: Folder | null;
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, onSuccess, folderToEdit }) => {
  const [name, setName] = useState(folderToEdit ? folderToEdit.name : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(folderToEdit ? folderToEdit.name : '');
      setError('');
    }
  }, [isOpen, folderToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      let response;
      if (folderToEdit) {
        response = await axiosInstance.put(`/api/folders/${folderToEdit.id}`, { name: name.trim() });
      } else {
        response = await axiosInstance.post('/api/folders', { name: name.trim() });
      }
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('A folder with this name already exists.');
      } else {
        setError(err.response?.data?.message || 'Failed to save folder. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-gray-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 z-10">
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4 border border-gray-200 dark:border-slate-700">
                <FolderIcon className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                {folderToEdit ? 'Edit folder' : 'Create folder'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organize your links into folders.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Folder Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:focus:border-white dark:focus:ring-white dark:text-white placeholder:text-gray-400 transition-colors" 
                  placeholder="e.g. Marketing Campaigns" 
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading || name.trim() === ''}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save folder'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderModal;
