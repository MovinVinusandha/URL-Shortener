import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Clock, Lock, Eye, EyeOff, Tag as TagIcon, 
  Folder as FolderIcon, ChevronDown, Check, Globe
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import type { Tag, Folder, UrlEntry, UrlSend } from '../types';
import { TAG_COLORS } from '../utils/tagColors';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  tags: Tag[];
  onShortened: (newUrl: UrlEntry) => void;
  onTagCreated: (tag: Tag) => void;
  onFolderCreated: (folder: Folder) => void;
}

const generateRandomHash = () => Math.random().toString(36).substring(2, 8);

const CreateLinkModal: React.FC<CreateLinkModalProps> = ({ 
  isOpen, 
  onClose, 
  folders, 
  tags, 
  onShortened,
  onTagCreated,
  onFolderCreated
}) => {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [expirationPreset, setExpirationPreset] = useState<string>('none');
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const [selectedFolderId, setSelectedFolderId] = useState<number | ''>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomAlias(generateRandomHash());
      setLongUrl('');
      setPassword('');
      setShowPassword(false);
      setExpiresAt('');
      setExpirationPreset('none');
      setShortenError('');
      setSelectedTagIds([]);
      setSelectedFolderId('');
      setTagSearchQuery('');
      setFolderSearchQuery('');
      setIsTagDropdownOpen(false);
      setIsFolderDropdownOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExpirationPresetChange = (preset: string) => {
    setExpirationPreset(preset);
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localNow = Date.now() - tzOffset;
    if (preset === 'none') {
      setExpiresAt('');
    } else if (preset === '1hour') {
      setExpiresAt(new Date(localNow + 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === '24hours') {
      setExpiresAt(new Date(localNow + 24 * 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === '7days') {
      setExpiresAt(new Date(localNow + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16));
    } else if (preset === 'custom') {
      setExpiresAt(new Date(localNow + 60 * 60 * 1000).toISOString().substring(0, 16));
    }
  };

  const handleCreateTag = async () => {
    const name = tagSearchQuery.trim();
    if (!name) return;
    setIsCreatingTag(true);
    try {
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const { data } = await axiosInstance.post<Tag>('/tags', { name, color: randomColor.name });
      onTagCreated(data);
      setSelectedTagIds([...selectedTagIds, data.id]);
      setTagSearchQuery('');
    } catch (err: any) {
      console.error("Failed to create tag", err);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = folderSearchQuery.trim();
    if (!name) return;
    setIsCreatingFolder(true);
    try {
      const { data } = await axiosInstance.post<Folder>('/folders', { name });
      onFolderCreated(data);
      setSelectedFolderId(data.id);
      setFolderSearchQuery('');
      setIsFolderDropdownOpen(false);
    } catch (err: any) {
      console.error("Failed to create folder", err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setShortenError('');
    setShortenLoading(true);
    try {
      const payload: any = {
        longUrl: longUrl.trim(),
        customAlias: customAlias.trim() || undefined,
        password: password.trim() || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        folderId: selectedFolderId !== '' ? selectedFolderId : undefined
      };
      
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString().substring(0, 19);
      }

      const { data } = await axiosInstance.post<UrlSend>('/shorten', payload);
      
      const mappedEntry: UrlEntry = {
        longUrl: data.longUrl,
        shortUrl: data.shortUrl,
        accessed_times: 0,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        isActive: data.isActive ?? true,
        hasPassword: !!password.trim(),
        tags: data.tags,
        folderId: data.folderId,
        folderName: data.folderName
      };

      onShortened(mappedEntry);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        setShortenError('This custom alias is already taken. Please choose another one.');
      } else {
        setShortenError(err.response?.data?.message || 'Failed to shorten URL. Please try again.');
      }
    } finally {
      setShortenLoading(false);
    }
  };

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col my-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create a new link</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form id="create-link-form" onSubmit={handleShortenSubmit} className="space-y-6">
            {shortenError && (
              <div className="p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-500/20">
                {shortenError}
              </div>
            )}
            
            {/* Destination URL */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Destination URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/long-url"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Short Link */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Short Link
                </label>
                <div className="flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium">
                    url.to/
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="custom-alias"
                      value={customAlias}
                      onChange={(e) => setCustomAlias(e.target.value)}
                      className="block w-full px-3 py-2 rounded-r-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomAlias(generateRandomHash())}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-violet-600 transition-colors"
                      title="Generate random alias"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password Protection
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (optional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Folder & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Folder */}
              <div className="space-y-1.5 relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Folder
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FolderIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                    className="w-full text-left pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow truncate flex items-center justify-between"
                  >
                    <span>
                      {selectedFolderId === '' ? 'No Folder' : folders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3" />
                  </button>
                </div>
                {isFolderDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-60">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Search or create..."
                        value={folderSearchQuery}
                        onChange={(e) => setFolderSearchQuery(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 rounded border-none focus:ring-0 text-slate-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedFolderId(''); setIsFolderDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${selectedFolderId === '' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <span>No Folder</span>
                        {selectedFolderId === '' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      {filteredFolders.map(folder => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => { setSelectedFolderId(folder.id); setIsFolderDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${selectedFolderId === folder.id ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <span className="truncate">{folder.name}</span>
                          {selectedFolderId === folder.id && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                      {folderSearchQuery && filteredFolders.length === 0 && (
                        <button
                          type="button"
                          onClick={handleCreateFolder}
                          disabled={isCreatingFolder}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-md transition-colors"
                        >
                          {isCreatingFolder ? 'Creating...' : `Create "${folderSearchQuery}"`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-1.5 relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tags
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <TagIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="w-full text-left pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow truncate flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedTagIds.length === 0 ? 'No tags selected' : `${selectedTagIds.length} tags selected`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3" />
                  </button>
                </div>
                {isTagDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-60">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Search or create tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 rounded border-none focus:ring-0 text-slate-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                      {filteredTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${selectedTagIds.includes(tag.id) ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#8b5cf6' }}></span>
                            <span className="truncate">{tag.name}</span>
                          </div>
                          {selectedTagIds.includes(tag.id) && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                      {tagSearchQuery && filteredTags.length === 0 && (
                        <button
                          type="button"
                          onClick={handleCreateTag}
                          disabled={isCreatingTag}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-md transition-colors"
                        >
                          {isCreatingTag ? 'Creating...' : `Create "${tagSearchQuery}"`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Expiration
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    value={expirationPreset}
                    onChange={(e) => handleExpirationPresetChange(e.target.value)}
                    className="block w-full pl-10 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow appearance-none"
                  >
                    <option value="none">Never</option>
                    <option value="1hour">1 Hour</option>
                    <option value="24hours">24 Hours</option>
                    <option value="7days">7 Days</option>
                    <option value="custom">Custom Date</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                {expirationPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="block w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                  />
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-link-form"
            disabled={shortenLoading || !longUrl}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {shortenLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin dark:border-slate-900/30 dark:border-t-slate-900" />
                Creating...
              </>
            ) : (
              'Create link'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLinkModal;
