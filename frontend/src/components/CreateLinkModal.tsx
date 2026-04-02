import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, Globe, X, HelpCircle, Shuffle, 
  Tag, FolderArchive, ChevronsUpDown, 
  Lock, CornerDownLeft, Pencil, Check, FolderPlus, Eye, EyeOff
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import type { Tag as TagType, Folder as FolderType } from '../types';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUrl?: any) => void;
  folders: FolderType[];
  tags: TagType[];
}

const generateRandomHash = () => Math.random().toString(36).substring(2, 8);

const TAG_COLORS = [
  { name: 'red', classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' },
  { name: 'blue', classes: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' },
  { name: 'green', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' },
  { name: 'purple', classes: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' },
  { name: 'orange', classes: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50' }
];

const getTagColor = (colorName: string | undefined) => {
  return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[1]; // default blue
};

function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

const CreateLinkModal: React.FC<CreateLinkModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  folders, 
  tags
}) => {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [expirationPreset, setExpirationPreset] = useState<string>('none');
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(true);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);
  useClickOutside(tagRef, () => setIsTagDropdownOpen(false));

  const [localTags, setLocalTags] = useState<TagType[]>(tags);
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const [localFolders, setLocalFolders] = useState<FolderType[]>(folders);
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  const [selectedFolderId, setSelectedFolderId] = useState<number | ''>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const folderRef = useRef<HTMLDivElement>(null);
  useClickOutside(folderRef, () => setIsFolderDropdownOpen(false));

  useEffect(() => {
    if (isOpen) {
      setCustomAlias(generateRandomHash());
      setLongUrl('');
      setPassword('');
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

  useEffect(() => {
    const fetchQrCode = async () => {
      if (!customAlias) return;
      setIsQrLoading(true);
      const fullShortUrl = `http://localhost:8080/${customAlias}`;
      const previewUrl = `http://localhost:8080/api/public/qr/preview?text=${encodeURIComponent(fullShortUrl)}`;
      setQrCodeUrl(previewUrl);
      setIsQrLoading(false);
    };
    fetchQrCode();
  }, [customAlias]);

  if (!isOpen) return null;

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

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

      const { data } = await axiosInstance.post('/shorten', payload);
      
      const mappedEntry = {
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

      onSuccess(mappedEntry);
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

  const handleCreateTag = async () => {
    if (!tagSearchQuery.trim()) return;
    try {
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].name;
      const { data } = await axiosInstance.post('/tags', { name: tagSearchQuery.trim(), color: randomColor });
      setLocalTags([...localTags, data]);
      setSelectedTagIds([...selectedTagIds, data.id]);
      setTagSearchQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderSearchQuery.trim()) return;
    try {
      const { data } = await axiosInstance.post('/folders', { name: folderSearchQuery.trim() });
      setLocalFolders([...localFolders, data]);
      setSelectedFolderId(data.id);
      setIsFolderDropdownOpen(false);
      setFolderSearchQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTags = localTags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));
  const filteredFolders = localFolders.filter(f => f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm z-[100] transition-opacity flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl z-[101] overflow-hidden flex flex-col relative max-h-[95vh]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 hover:text-gray-900 font-medium cursor-pointer transition-colors">Links</span>
            <span className="text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Globe className="w-4 h-4" />
              New link
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <form id="create-link-form" onSubmit={handleShortenSubmit}>
            {shortenError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {shortenError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Destination URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Destination URL</label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input 
                    type="url" 
                    required 
                    value={longUrl}
                    onChange={(e) => setLongUrl(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black px-3 py-2 sm:text-sm placeholder:text-gray-400" 
                    placeholder="https://dub.co/help/article/dub-links" 
                  />
                </div>

                {/* Short Link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Short Link</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setCustomAlias(generateRandomHash())}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" 
                        title="Randomize"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex rounded-md shadow-sm">
                    <div className="relative flex-grow focus-within:z-10 w-1/3 border border-gray-300 border-r-0 bg-gray-50 flex items-center justify-center rounded-l-md px-3 text-sm text-gray-500">
                      trim.sh
                    </div>
                    <input 
                      type="text" 
                      value={customAlias}
                      onChange={(e) => setCustomAlias(e.target.value)}
                      className="block w-full rounded-none rounded-r-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-3 py-2 sm:text-sm w-2/3" 
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5 relative" ref={tagRef}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium text-gray-700">Tags</label>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div 
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="relative flex flex-wrap items-center w-full min-h-[38px] rounded-md border border-gray-300 py-1.5 pl-3 pr-8 shadow-sm cursor-pointer bg-white"
                  >
                    {selectedTagIds.length === 0 ? (
                      <span className="text-gray-400 sm:text-sm">Select tags...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedTagIds.map(id => {
                          const t = localTags.find(tag => tag.id === id);
                          if (!t) return null;
                          return (
                            <span 
                              key={id} 
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTagColor(t.color).classes}`}
                            >
                              {t.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {isTagDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search or create tag..."
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-gray-50 rounded border border-gray-200 focus:ring-0 text-gray-900 outline-none"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                        {filteredTags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                          >
                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedTagIds.includes(tag.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                              {selectedTagIds.includes(tag.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <Tag className={`w-3.5 h-3.5 ${getTagColor(tag.color).classes.split(' ').find(c => c.startsWith('text-') && !c.includes('dark:'))}`} />
                            <span>{tag.name}</span>
                          </button>
                        ))}
                      </div>
                      {tagSearchQuery && !localTags.some(t => t.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
                        <div className="p-1 border-t border-gray-100">
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                            onClick={handleCreateTag}
                          >
                            <span className="font-medium">+ Create</span> "{tagSearchQuery}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Optional password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-10 shadow-sm focus:border-black focus:ring-1 focus:ring-black sm:text-sm placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expiration */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Expiration</label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: '1hour', label: '1 Hour' },
                        { id: '24hours', label: '24 Hours' },
                        { id: '7days', label: '7 Days' },
                        { id: 'custom', label: 'Custom' }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleExpirationPresetChange(preset.id)}
                          className={expirationPreset === preset.id 
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-transparent px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                            : "bg-transparent text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {expirationPreset === 'custom' && (
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="block w-full sm:w-auto rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black px-3 py-2 sm:text-sm text-gray-700"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                {/* Folder */}
                <div className="space-y-1.5 relative" ref={folderRef}>
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Folder</label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                    className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm flex items-center gap-2"
                  >
                    {selectedFolderId === '' ? (
                      <span className="block truncate text-gray-400">Select a folder...</span>
                    ) : (
                      <>
                        <div className="p-0.5 rounded bg-emerald-100 text-emerald-600">
                          <FolderArchive className="w-3.5 h-3.5" />
                        </div>
                        <span className="block truncate text-gray-900">
                          {localFolders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}
                        </span>
                      </>
                    )}
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {isFolderDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden flex flex-col p-1">
                      <div className="p-1 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search folders..."
                          value={folderSearchQuery}
                          onChange={(e) => setFolderSearchQuery(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-gray-50 rounded border border-gray-200 focus:ring-0 text-gray-900 outline-none"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => { setSelectedFolderId(''); setIsFolderDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                        >
                          <span className="truncate">No Folder</span>
                          {selectedFolderId === '' && <Check className="w-3.5 h-3.5 text-black" />}
                        </button>
                        {filteredFolders.map(folder => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => { setSelectedFolderId(folder.id); setIsFolderDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                          >
                            <span className="truncate">{folder.name}</span>
                            {selectedFolderId === folder.id && <Check className="w-3.5 h-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                      <div className="p-1 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleCreateFolder}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                        >
                          <FolderPlus className="w-4 h-4" /> Create new folder
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-gray-700">QR Code</label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center relative group min-h-[140px]">
                    {isQrLoading ? (
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
                    ) : qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code Preview" className="w-full h-full rounded-md object-contain max-h-[120px]" />
                    ) : (
                      <div className="bg-white p-2 rounded shadow-sm">
                        <div className="grid grid-cols-3 gap-0.5 w-8 h-8">
                          <div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                          <div className="bg-gray-800 rounded-sm"></div><div className="bg-white rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                          <div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                        </div>
                      </div>
                    )}
                    <button type="button" className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div></div>
          <div>
            <button 
              type="submit" 
              form="create-link-form" 
              disabled={shortenLoading}
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {shortenLoading ? 'Creating...' : 'Create link'}
              <span className="flex items-center text-[10px] text-gray-400 border border-gray-700 px-1 rounded bg-gray-900 ml-1">
                <CornerDownLeft className="w-3 h-3" />
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CreateLinkModal;
