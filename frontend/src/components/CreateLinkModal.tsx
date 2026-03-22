import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, Globe, CheckCircle2, X, HelpCircle, Shuffle, 
  Settings2, Tag, FolderArchive, ChevronsUpDown, 
  Lock, Clock, CornerDownLeft, Pencil
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
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [expirationPreset, setExpirationPreset] = useState<string>('none');
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const [selectedFolderId, setSelectedFolderId] = useState<number | ''>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

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
      setIsTagDropdownOpen(false);
      setIsFolderDropdownOpen(false);
    }
  }, [isOpen]);

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

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm z-[100] transition-opacity flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[900px] z-[101] overflow-hidden flex flex-col relative max-h-[95vh]">
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
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Draft saved
            </span>
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
            
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Destination URL */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Destination URL
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
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
                      <button type="button" className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" title="Settings">
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex rounded-md shadow-sm">
                    <div className="relative flex-grow focus-within:z-10 w-1/3">
                      <select className="block w-full rounded-none rounded-l-md border border-gray-300 py-2 pl-3 pr-8 text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm bg-gray-50 border-r-0">
                        <option>dub.sh</option>
                      </select>
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
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      Tags
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </label>
                    <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-700">Manage</button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Tag className="w-4 h-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      readOnly
                      onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                      value={selectedTagIds.length ? `${selectedTagIds.length} tags selected` : ''}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 shadow-sm focus:border-black focus:ring-1 focus:ring-black sm:text-sm placeholder:text-gray-400 cursor-pointer" 
                      placeholder="Select tags..." 
                    />
                  </div>
                  {isTagDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-60">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-gray-50 rounded border border-gray-200 focus:ring-0 text-gray-900 outline-none"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {filteredTags.length === 0 ? (
                          <div className="text-xs text-gray-500 text-center py-2">No tags found</div>
                        ) : (
                          filteredTags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${selectedTagIds.includes(tag.id) ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#8b5cf6' }}></span>
                                <span>{tag.name}</span>
                              </div>
                              {selectedTagIds.includes(tag.id) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Password
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Optional password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 shadow-sm focus:border-black focus:ring-1 focus:ring-black sm:text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Expiration */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Expiration
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <select
                        value={expirationPreset}
                        onChange={(e) => handleExpirationPresetChange(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black py-2 pl-9 pr-8 sm:text-sm appearance-none bg-white text-gray-700"
                      >
                        <option value="none">Never</option>
                        <option value="1hour">1 Hour</option>
                        <option value="24hours">24 Hours</option>
                        <option value="7days">7 Days</option>
                        <option value="custom">Custom Date</option>
                      </select>
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
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

                {/* Comments */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Comments
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <textarea className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black px-3 py-2 sm:text-sm placeholder:text-gray-400 resize-y" placeholder="Add comments" rows={3}></textarea>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                {/* Folder */}
                <div className="space-y-1.5 relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Folder
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                    className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-green-100 text-green-600">
                      <FolderArchive className="w-3.5 h-3.5" />
                    </div>
                    <span className="block truncate text-gray-900">
                      {selectedFolderId === '' ? 'No Folder' : folders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {isFolderDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-60">
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => { setSelectedFolderId(''); setIsFolderDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-50 text-gray-700"
                        >
                          No Folder
                        </button>
                        {folders.map(folder => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => { setSelectedFolderId(folder.id); setIsFolderDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-50 text-gray-700"
                          >
                            <span className="truncate">{folder.name}</span>
                            {selectedFolderId === folder.id && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    QR Code
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center relative group min-h-[140px]">
                    <div className="bg-white p-2 rounded shadow-sm">
                      <div className="grid grid-cols-3 gap-0.5 w-8 h-8">
                        <div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                        <div className="bg-gray-800 rounded-sm"></div><div className="bg-white rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                        <div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div><div className="bg-gray-800 rounded-sm"></div>
                      </div>
                    </div>
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
        <footer className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
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
