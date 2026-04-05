import React, { useState, useEffect } from 'react';
import { X, Infinity as InfinityIcon } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import type { Tag } from '../types';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTag: Tag) => void;
  tagToEdit?: any | null;
}

const TAG_COLORS = [
  { name: 'red', classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50', ringClass: 'peer-checked:ring-red-500 dark:peer-checked:ring-red-400' },
  { name: 'blue', classes: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50', ringClass: 'peer-checked:ring-blue-500 dark:peer-checked:ring-blue-400' },
  { name: 'green', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50', ringClass: 'peer-checked:ring-emerald-500 dark:peer-checked:ring-emerald-400' },
  { name: 'purple', classes: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50', ringClass: 'peer-checked:ring-purple-500 dark:peer-checked:ring-purple-400' },
  { name: 'orange', classes: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50', ringClass: 'peer-checked:ring-orange-500 dark:peer-checked:ring-orange-400' },
  { name: 'brown', classes: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50', ringClass: 'peer-checked:ring-amber-500 dark:peer-checked:ring-amber-400' },
  { name: 'gray', classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700/50', ringClass: 'peer-checked:ring-gray-500 dark:peer-checked:ring-gray-400' }
];

const CreateTagModal: React.FC<CreateTagModalProps> = ({ isOpen, onClose, onSuccess, tagToEdit }) => {
  const [name, setName] = useState(tagToEdit ? tagToEdit.name : '');
  const [color, setColor] = useState(tagToEdit ? tagToEdit.color : 'red');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(tagToEdit ? tagToEdit.name : '');
      setColor(tagToEdit ? tagToEdit.color : 'red');
      setError('');
    }
  }, [isOpen, tagToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      let response;
      if (tagToEdit) {
        response = await axiosInstance.put('/api/tags/' + tagToEdit.id, { name: name.trim(), color });
      } else {
        response = await axiosInstance.post('/api/tags', { name: name.trim(), color });
      }
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('A tag with this name already exists.');
      } else {
        setError(err.response?.data?.message || 'Failed to create tag. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-gray-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 z-10">
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4 border border-gray-200 dark:border-slate-700">
                <InfinityIcon className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{tagToEdit ? 'Edit tag' : 'Create tag'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use tags to organize your links. <a href="#" className="text-gray-900 dark:text-gray-300 underline underline-offset-2">Learn more</a>
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tag Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:focus:border-white dark:focus:ring-white dark:text-white placeholder:text-gray-400 transition-colors" 
                  placeholder="e.g. Marketing" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map(c => (
                    <label key={c.name} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="tag-color" 
                        value={c.name} 
                        checked={color === c.name} 
                        onChange={() => setColor(c.name)} 
                        className="sr-only peer" 
                      />
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 peer-checked:ring-2 peer-checked:ring-offset-2 dark:peer-checked:ring-offset-slate-900 ${c.ringClass} ${c.classes}`}>
                        {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                      </div>
                    </label>
                  ))}
                </div>
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
                  {loading ? (tagToEdit ? 'Saving...' : 'Creating...') : (tagToEdit ? 'Save changes' : 'Create tag')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTagModal;
