import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, X, HelpCircle, Shuffle, 
  Tag, FolderArchive, ChevronsUpDown, 
  Lock, CornerDownLeft, Pencil, Check, FolderPlus, Eye, EyeOff, ArrowRight, Folder,
  Calendar as CalendarIcon, ChevronDown, ChevronLeft,
  CornerDownRight,
  Link2, Layers, Copy, ExternalLink, Download, Plus, Trash2
} from 'lucide-react';
import { QrCodeModal, type QrConfig } from './QrCodeModal';
import { UtmModal } from './UtmModal';
import { generateQrMatrix } from '../utils/qrMatrix';
import { parseUrlUtms, buildUrlWithUtms, getSavedUtmTemplates, fetchUtmTemplatesApi, type UtmParams, type CustomParam } from '../utils/utmUtils';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';
import { 
  format, parseISO, formatDistanceToNow,
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isToday, eachDayOfInterval 
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tag as TagType, Folder as FolderType, UrlEntry } from '../types';

export interface ChannelItem {
  id: string;
  name: string;
  source: string;
  medium: string;
  selected: boolean;
  isCustom?: boolean;
  dbId?: number;
}

const PRESET_CHANNELS: ChannelItem[] = [
  { id: 'facebook', name: 'Facebook', source: 'facebook', medium: 'social', selected: true },
  { id: 'twitter', name: 'Twitter / X', source: 'twitter', medium: 'social', selected: true },
  { id: 'linkedin', name: 'LinkedIn', source: 'linkedin', medium: 'social', selected: true },
  { id: 'email', name: 'Email Newsletter', source: 'newsletter', medium: 'email', selected: true },
  { id: 'instagram', name: 'Instagram', source: 'instagram', medium: 'social_bio', selected: false },
  { id: 'youtube', name: 'YouTube', source: 'youtube', medium: 'video', selected: false },
  { id: 'whatsapp', name: 'WhatsApp', source: 'whatsapp', medium: 'chat', selected: false },
  { id: 'tiktok', name: 'TikTok', source: 'tiktok', medium: 'social_video', selected: false },
];

export interface BatchCampaignResultItem {
  channelName: string;
  shortUrl: string;
  fullShortUrl: string;
  longUrlWithUtm: string;
  utmSource: string;
  utmMedium?: string;
  urlId?: number;
}

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUrl?: any) => void;
  folders: { id: number; name: string; slug?: string }[];
  tags: { id: number; name: string; color?: string }[];
  urlToEdit?: any | null;
  defaultFolderId?: number;
  onOpenFolderModal?: () => void;
  initialMode?: 'single' | 'multi';
}

const generateRandomHash = () => Math.random().toString(36).substring(2, 8);

const safeParseISO = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

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
  tags,
  urlToEdit,
  defaultFolderId,
  onOpenFolderModal,
  initialMode = 'single'
}) => {
  const rootDomain = window.location.hostname.replace('app.', '');
  const displayDomain = rootDomain + (window.location.port && window.location.port !== '80' && window.location.port !== '443' ? ':' + window.location.port : '');
  const protocol = window.location.protocol;

  // Mode state: 'single' or 'multi'
  const [mode, setMode] = useState<'single' | 'multi'>(initialMode);

  // Single Link state
  const [longUrl, setLongUrl] = useState(urlToEdit?.longUrl || '');
  const [baseDestinationUrl, setBaseDestinationUrl] = useState<string>('');
  const [utms, setUtms] = useState<UtmParams>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);
  const [isUtmModalOpen, setIsUtmModalOpen] = useState(false);

  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [expirationPreset, setExpirationPreset] = useState<string>('none');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-Channel Batch State
  const [batchLongUrl, setBatchLongUrl] = useState('');
  const [batchCampaignName, setBatchCampaignName] = useState('');
  const [batchChannels, setBatchChannels] = useState<ChannelItem[]>(PRESET_CHANNELS);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchCampaignResultItem[]>([]);
  const [batchCopiedId, setBatchCopiedId] = useState<string | null>(null);
  const [batchAllCopied, setBatchAllCopied] = useState(false);
  
  // Custom Channel state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customMedium, setCustomMedium] = useState('');

  // QR Studio Modal State
  const [isQrStudioOpen, setIsQrStudioOpen] = useState(false);
  const [qrConfig, setQrConfig] = useState<QrConfig>({
    color: '#000000',
    bgColor: '#ffffff',
    dotStyle: 'square',
    markerBorder: 'square',
    markerCenter: 'square',
    hasLogo: true,
  });

  // Shared Tag & Folder state
  const [localTags, setLocalTags] = useState<TagType[]>(tags);
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);
  useClickOutside(tagRef, () => setIsTagDropdownOpen(false));

  const [localFolders, setLocalFolders] = useState<FolderType[]>(folders);
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const folderRef = useRef<HTMLDivElement>(null);
  useClickOutside(folderRef, () => setIsFolderDropdownOpen(false));

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
  useClickOutside(datePickerRef, () => setIsDatePickerOpen(false));
  const prevIsOpenRef = useRef(false);

  const getInitialExpirationPreset = (expDateStr: string | null | undefined): string => {
    if (!expDateStr) return 'none';
    const d = safeParseISO(expDateStr.endsWith('Z') ? expDateStr : expDateStr + 'Z');
    if (!d) return 'none';
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return 'custom';
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours - 1) <= 0.1) return '1hour';
    if (Math.abs(diffHours - 24) <= 0.5) return '24hours';
    if (Math.abs(diffHours - 168) <= 2) return '7days';
    return 'custom';
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setMode(initialMode);
      setBatchLongUrl('');
      setBatchCampaignName('');
      setBatchChannels(PRESET_CHANNELS.map(c => ({ ...c })));
      setBatchResults([]);
      setShowAddCustom(false);
      setBatchAllCopied(false);
      setBatchCopiedId(null);

      if (urlToEdit) {
        const extractHash = (shortUrl: string): string => shortUrl.split('/').pop() ?? shortUrl;
        setCustomAlias(urlToEdit.shortUrl ? extractHash(urlToEdit.shortUrl) : '');
        setLongUrl(urlToEdit.longUrl || '');
        const parsed = parseUrlUtms(urlToEdit.longUrl || '');
        setBaseDestinationUrl(parsed.baseUrl);
        setUtms(parsed.utms);
        setCustomParams(parsed.customParams);
        setPassword('');
        setRemovePassword(false);
        setExpiresAt(urlToEdit.expiresAt ? format(parseISO(urlToEdit.expiresAt + 'Z'), "yyyy-MM-dd'T'HH:mm") : '');
        setExpirationPreset(getInitialExpirationPreset(urlToEdit.expiresAt));
        setSelectedTagIds(urlToEdit.tags?.map((t: { id: number; name: string }) => t.id) || []);
        setSelectedFolderId(urlToEdit.folderId || '');
      } else {
        setCustomAlias(generateRandomHash());
        setLongUrl('');
        setBaseDestinationUrl('');
        
        const applyDefaultTemplate = (templatesList: any[]) => {
          const defaultTemplate = templatesList.find((t) => t.isDefault);
          if (defaultTemplate) {
            setUtms({ ...defaultTemplate.utms });
            setCustomParams(
              (defaultTemplate.customParams || []).map((cp: any) => ({
                id: Math.random().toString(36).substring(2, 9),
                key: cp.key,
                value: cp.value,
              }))
            );
          } else {
            setUtms({ source: '', medium: '', campaign: '', term: '', content: '' });
            setCustomParams([]);
          }
        };

        const localSaved = getSavedUtmTemplates();
        applyDefaultTemplate(localSaved);
        fetchUtmTemplatesApi().then(applyDefaultTemplate).catch(() => {});

        setPassword('');
        setRemovePassword(false);
        setExpiresAt('');
        setExpirationPreset('none');
        setSelectedTagIds([]);
        const defaultFolder = (folders || []).find(f => (f as any).slug === 'links' || f.name.toLowerCase() === 'links');
        const initialFolderId = defaultFolderId !== undefined && defaultFolderId !== null 
          ? defaultFolderId 
          : (defaultFolder ? defaultFolder.id : (folders && folders.length > 0 ? folders[0].id : ''));
        setSelectedFolderId(initialFolderId);
      }
      setError('');
      setTagSearchQuery('');
      setFolderSearchQuery('');
      setIsTagDropdownOpen(false);
      setIsFolderDropdownOpen(false);
    } else if (!isOpen && prevIsOpenRef.current) {
      setCustomAlias('');
      setLongUrl('');
      setBaseDestinationUrl('');
      setUtms({ source: '', medium: '', campaign: '', term: '', content: '' });
      setCustomParams([]);
      setPassword('');
      setRemovePassword(false);
      setExpiresAt('');
      setExpirationPreset('none');
      setSelectedTagIds([]);
      setSelectedFolderId('');
      setError('');
      setBatchResults([]);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, urlToEdit, defaultFolderId, folders, initialMode]);

  useEffect(() => {
    const fetchCustomChannels = async () => {
      try {
        const res = await axiosInstance.get('/custom-channels');
        if (res && Array.isArray(res.data)) {
          const dbChannels: ChannelItem[] = res.data.map((cc: any) => ({
            id: `custom_${cc.id}`,
            dbId: cc.id,
            name: cc.name,
            source: cc.utmSource,
            medium: cc.utmMedium,
            selected: true,
            isCustom: true,
          }));
          setBatchChannels(prev => {
            const currentSelectedMap = new Map(prev.map(c => [c.id, c.selected]));
            const mergedPresets = PRESET_CHANNELS.map(p => ({
              ...p,
              selected: currentSelectedMap.has(p.id) ? (currentSelectedMap.get(p.id) ?? p.selected) : p.selected,
            }));
            const mergedCustom = dbChannels.map(dc => ({
              ...dc,
              selected: currentSelectedMap.has(dc.id) ? (currentSelectedMap.get(dc.id) ?? dc.selected) : true,
            }));
            return [...mergedPresets, ...mergedCustom];
          });
        }
      } catch (err) {
        console.error('Failed to load custom channels', err);
      }
    };

    if (isOpen) {
      fetchCustomChannels();
    }
  }, [isOpen]);

  const activeUtmCount = React.useMemo(() => {
    let count = 0;
    if (utms.source?.trim()) count++;
    if (utms.medium?.trim()) count++;
    if (utms.campaign?.trim()) count++;
    if (utms.term?.trim()) count++;
    if (utms.content?.trim()) count++;
    count += (customParams || []).filter((cp) => cp.key.trim() && cp.value.trim()).length;
    return count;
  }, [utms, customParams]);

  const handleLongUrlChange = (val: string) => {
    setLongUrl(val);
    const parsed = parseUrlUtms(val);
    setBaseDestinationUrl(parsed.baseUrl);
    setUtms(parsed.utms);
    setCustomParams(parsed.customParams);
  };

  const handleUtmBuilderChange = (newUtms: UtmParams, newCustomParams: CustomParam[]) => {
    setUtms(newUtms);
    setCustomParams(newCustomParams);
    const base = (baseDestinationUrl || parseUrlUtms(longUrl).baseUrl || longUrl).trim();
    if (base) {
      const fullUrl = buildUrlWithUtms(base, newUtms, newCustomParams);
      setLongUrl(fullUrl);
    }
  };

  const handleCreateTag = async () => {
    if (!tagSearchQuery.trim()) return;
    try {
      const res = await axiosInstance.post('/tags', { name: tagSearchQuery.trim() });
      const newTag = res.data;
      setLocalTags(prev => [...prev, newTag]);
      setSelectedTagIds(prev => [...prev, newTag.id]);
      setTagSearchQuery('');
      toast.success(`Tag "${newTag.name}" created`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create tag');
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const filteredTags = (localTags || []).filter(t => 
    t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  const filteredFolders = (localFolders || []).filter(f => 
    f.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  const handleExpirationPresetChange = (preset: string) => {
    setExpirationPreset(preset);
    const now = new Date();
    let targetDate: Date | null = null;

    if (preset === 'none') {
      setExpiresAt('');
      return;
    } else if (preset === '1hour') {
      targetDate = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    } else if (preset === '24hours') {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (preset === '7days') {
      targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (preset === 'custom') {
      if (!expiresAt) {
        targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      setIsDatePickerOpen(true);
    }

    if (targetDate) {
      setExpiresAt(format(targetDate, "yyyy-MM-dd'T'HH:mm"));
      setPickerMonth(targetDate);
    }
  };

  const getTimeValues = () => {
    if (!expiresAt) {
      const now = new Date();
      let hours = now.getHours();
      const minutes = Math.ceil(now.getMinutes() / 5) * 5 % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return {
        hour: hours.toString(),
        minute: minutes.toString().padStart(2, '0'),
        ampm
      };
    }
    const d = safeParseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z');
    if (!d) {
      return { hour: '12', minute: '00', ampm: 'PM' };
    }
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return {
      hour: hours.toString(),
      minute: minutes.toString().padStart(2, '0'),
      ampm
    };
  };

  const updateExpiresAt = (day: Date, hourStr: string, minuteStr: string, ampmStr: string) => {
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    if (ampmStr === 'PM' && hours < 12) hours += 12;
    if (ampmStr === 'AM' && hours === 12) hours = 0;

    const newDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
    setExpiresAt(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    setExpirationPreset('custom');
  };

  const handleSelectDay = (day: Date) => {
    const { hour, minute, ampm } = getTimeValues();
    updateExpiresAt(day, hour, minute, ampm);
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', val: string) => {
    const currentValues = getTimeValues();
    const newHour = type === 'hour' ? val : currentValues.hour;
    const newMinute = type === 'minute' ? val : currentValues.minute;
    const newAmPm = type === 'ampm' ? val : currentValues.ampm;
    const baseDay = expiresAt ? (safeParseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z') || new Date()) : new Date();
    updateExpiresAt(baseDay, newHour, newMinute, newAmPm);
  };

  const renderExpirationStatus = () => {
    // --- EDIT MODE ---
    if (urlToEdit) {
      const originalExpireDate = urlToEdit.expiresAt ? safeParseISO(urlToEdit.expiresAt.endsWith('Z') ? urlToEdit.expiresAt : urlToEdit.expiresAt + 'Z') : null;
      const newExpireDate = expiresAt ? safeParseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z') : null;

      return (
        <div className="mt-1.5 flex items-center gap-3 text-xs min-h-[1.75rem]">
          {/* "Before" state */}
          <div className="text-muted-foreground" title={originalExpireDate ? format(originalExpireDate, 'PPpp') : 'No expiration set'}>
            {originalExpireDate && new Date() < originalExpireDate 
              ? `${formatDistanceToNow(originalExpireDate, { addSuffix: false })} remaining`
              : (originalExpireDate ? 'Expired' : 'No expiration')}
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          {/* "After" state */}
          <div className="font-medium text-foreground" title={newExpireDate ? format(newExpireDate, 'PPpp') : 'Will never expire'}>
            {newExpireDate 
              ? `Expires ${formatDistanceToNow(newExpireDate, { addSuffix: true })}`
              : 'Never expires'}
          </div>
        </div>
      );
    }

    // --- CREATE MODE ---
    if (!expiresAt || expirationPreset.toLowerCase() === 'none') {
      return null;
    }
    
    const parsed = safeParseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z');
    if (!parsed) return null;
    const hasExpired = parsed < new Date();

    return (
      <div className="flex flex-col text-xs mt-1" title={format(parsed, "PPpp")}>
        <span className={`font-medium ${hasExpired ? 'text-destructive' : 'text-foreground'}`}>
          {hasExpired ? 'This link has expired' : `Expires ${formatDistanceToNow(parsed, { addSuffix: true })}`}
        </span>
        <span className="text-muted-foreground text-[11px] mt-0.5">
          {format(parsed, "PPpp")}
        </span>
      </div>
    );
  };

  const renderCustomDatePicker = () => {
    const monthStart = startOfMonth(pickerMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const selectedDate = expiresAt ? safeParseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z') : null;
    const timeValues = getTimeValues();

    return (
      <div className="relative z-40" ref={datePickerRef}>
        <button 
          type="button" 
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} 
          className="w-full flex items-center justify-between border border-input bg-background rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedDate 
                ? format(selectedDate, 'PPpp') 
                : 'Select custom date and time...'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
        </button>

        <AnimatePresence>
          {isDatePickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="absolute bottom-full mb-1.5 left-0 w-full sm:w-[280px] bg-popover border border-border rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground">
                  {format(pickerMonth, 'MMMM yyyy')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPickerMonth(subMonths(pickerMonth, 1))}
                    className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
                    className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, pickerMonth);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-7 w-full rounded-md text-xs flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isCurrentDay
                          ? 'border border-primary text-primary font-medium'
                          : isCurrentMonth
                          ? 'text-foreground hover:bg-secondary'
                          : 'text-muted-foreground/40 hover:bg-secondary/50'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Time Selection Section */}
              <div className="pt-2.5 border-t border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Time</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={timeValues.hour}
                    onChange={(e) => handleTimeChange('hour', e.target.value)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((h) => (
                      <option key={h} value={h}>{h.padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-xs font-bold">:</span>
                  <select
                    value={timeValues.minute}
                    onChange={(e) => handleTimeChange('minute', e.target.value)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="flex bg-secondary p-0.5 rounded-md border border-border">
                    {['AM', 'PM'].map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => handleTimeChange('ampm', period)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                          timeValues.ampm === period
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const handleShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalUrl = longUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    if (customAlias && !/^[a-zA-Z0-9-_]+$/.test(customAlias)) {
      setError('Custom short link can only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    let isoExpiresAt = null;
    if (expiresAt) {
      const parsed = safeParseISO(expiresAt);
      if (parsed) {
        isoExpiresAt = parsed.toISOString();
      }
    }

    setLoading(true);

    try {
      if (urlToEdit) {
        const payload: any = {
          longUrl: finalUrl,
          expiresAt: isoExpiresAt,
          tagIds: selectedTagIds
        };
        if (removePassword) {
          payload.password = "";
        } else if (password.trim()) {
          payload.password = password.trim();
        }

        const extractHash = (shortUrl: string): string => shortUrl.split('/').pop() ?? shortUrl;
        const res = await axiosInstance.put(`/url/${extractHash(urlToEdit.shortUrl)}`, payload);
        onSuccess(res.data);
        onClose();
      } else {
        const payload: any = {
          longUrl: finalUrl,
          customAlias: customAlias.trim() || undefined,
          password: password.trim() || undefined,
          expiresAt: isoExpiresAt,
          tagIds: selectedTagIds,
          folderId: typeof selectedFolderId === 'number' ? selectedFolderId : undefined
        };

        const res = await axiosInstance.post('/shorten', payload);
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('This short link alias is already taken. Please choose another.');
        } else if (err.response?.status === 400 && err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedUrl = batchLongUrl.trim();
    if (!cleanedUrl) {
      setError('Please enter a destination URL');
      return;
    }
    if (!/^https?:\/\//i.test(cleanedUrl)) {
      cleanedUrl = 'https://' + cleanedUrl;
    }

    const cleanedCampaign = batchCampaignName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanedCampaign) {
      setError('Please enter a campaign name');
      return;
    }

    const selectedChans = batchChannels.filter(c => c.selected);
    if (selectedChans.length === 0) {
      setError('Please select at least one channel');
      return;
    }

    setBatchLoading(true);
    setError('');
    try {
      const payload = {
        longUrl: cleanedUrl,
        campaignName: cleanedCampaign,
        channels: selectedChans.map(ch => ({
          name: ch.name,
          utmSource: ch.source,
          utmMedium: ch.medium || undefined,
        })),
        folderId: typeof selectedFolderId === 'number' ? selectedFolderId : undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      };

      const res = await axiosInstance.post<{ campaignName: string; totalCreated: number; items: BatchCampaignResultItem[] }>(
        '/url/batch-campaign',
        payload
      );

      setBatchResults(res.data.items || []);
      toast.success(`Successfully created ${res.data.items.length} campaign links!`);
      if (onSuccess) {
        const createdEntries: UrlEntry[] = (res.data.items || []).map((item) => ({
          longUrl: item.longUrlWithUtm || cleanedUrl,
          shortUrl: item.fullShortUrl || item.shortUrl,
          accessed_times: 0,
          createdAt: new Date().toISOString(),
          isActive: true,
          folderId: typeof selectedFolderId === 'number' ? selectedFolderId : undefined,
          tags: selectedTagIds.length > 0 ? tags.filter((t) => selectedTagIds.includes(t.id)) : undefined,
        }));
        onSuccess(createdEntries);
      }
    } catch (err: any) {
      console.error('Failed to create batch campaign links', err);
      setError(err.response?.data?.message || 'Failed to create campaign links');
    } finally {
      setBatchLoading(false);
    }
  };

  const renderTagsBlock = () => (
    <div className="space-y-1.5 relative z-40" ref={tagRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-foreground">Tags</label>
          <button type="button" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div 
        onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
        className="relative flex flex-wrap items-center w-full min-h-[42px] rounded-lg border border-input py-1.5 pl-3 pr-8 cursor-pointer bg-background text-foreground"
      >
        {selectedTagIds.length === 0 ? (
          <span className="text-muted-foreground sm:text-sm">Select tags...</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedTagIds.map(id => {
              const t = (localTags || []).find(tag => tag.id === id) || (urlToEdit?.tags || []).find((tag: { id: number; name: string }) => tag.id === id);
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
        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      
      <AnimatePresence>
        {isTagDropdownOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="absolute top-full mt-1 left-0 w-full z-50 bg-popover border border-border rounded-xl shadow-2xl p-1 flex flex-col max-h-56 overflow-hidden"
          >
            <input
              type="text"
              autoFocus={true}
              placeholder="Search or create tag..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-2 px-3 text-foreground placeholder:text-muted-foreground border-b border-border"
            />
            <div className="max-h-[108px] overflow-y-auto flex flex-col gap-1 p-1" style={{ scrollbarWidth: 'thin' }}>
              {filteredTags.map(tag => (
                <motion.button
                  layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground cursor-pointer"
                >
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedTagIds.includes(tag.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                    {selectedTagIds.includes(tag.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <Tag className={`w-3.5 h-3.5 ${getTagColor(tag.color).classes.split(' ').find(c => c.startsWith('text-') && !c.includes('dark:'))}`} />
                  <span>{tag.name}</span>
                </motion.button>
              ))}
            </div>
            {tagSearchQuery && !localTags.some(t => t.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
              <div className="p-1 border-t border-border">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground cursor-pointer"
                  onClick={handleCreateTag}
                >
                  <span className="font-medium text-primary">+ Create</span> "{tagSearchQuery}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderFolderBlock = () => (
    <div className="space-y-1.5 relative z-20" ref={folderRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-foreground">Folder</label>
          <button type="button" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {urlToEdit ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-input rounded-lg bg-secondary/50 text-muted-foreground text-sm">
          <Folder className="w-4 h-4 text-emerald-500" />
          <span className="truncate">
            {urlToEdit?.folderName || (folders || []).find(f => f.id === urlToEdit?.folderId)?.name || 'Uncategorized'}
          </span>
        </div>
      ) : (
        <>
          <button 
            type="button"
            onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
            className="relative w-full cursor-pointer rounded-lg border border-input bg-background text-foreground py-2 pl-3 pr-10 text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors sm:text-sm flex items-center gap-2"
          >
            {(() => {
              const currentFolder = (localFolders || []).find(f => f.id === selectedFolderId);
              const isDefault = currentFolder ? currentFolder.name.toLowerCase() === 'links' : (selectedFolderId === '' || selectedFolderId === null);
              const displayName = currentFolder?.name || (urlToEdit?.folderId === selectedFolderId && urlToEdit?.folderName ? urlToEdit.folderName : 'Links');
              return (
                <>
                  <div className={`p-0.5 rounded ${isDefault ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <FolderArchive className="w-3.5 h-3.5" />
                  </div>
                  <span className="block truncate text-foreground font-medium">
                    {displayName}
                  </span>
                </>
              );
            })()}
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
            </span>
          </button>
          
          <AnimatePresence>
            {isFolderDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden flex flex-col p-1"
              >
                <div className="p-1 border-b border-border">
                  <input
                    type="text"
                    placeholder="Search folders..."
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm bg-background rounded-lg border border-input focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                  {filteredFolders.map(folder => {
                    const isDefault = folder.name.toLowerCase() === 'links';
                    const isSelected = selectedFolderId === folder.id || (isDefault && selectedFolderId === '');
                    return (
                      <motion.button
                        layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                        key={folder.id}
                        type="button"
                        onClick={() => { setSelectedFolderId(folder.id); setIsFolderDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className={`w-3.5 h-3.5 ${isDefault ? 'text-primary' : 'text-emerald-500'}`} />
                          <span className="truncate">{folder.name}</span>
                          {isDefault && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </motion.button>
                    );
                  })}
                  {filteredFolders.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">No folders found</div>
                  )}
                </div>
                <div className="p-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFolderDropdownOpen(false);
                      if (onOpenFolderModal) onOpenFolderModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-muted-foreground" /> Create new folder
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl z-[101] overflow-visible flex flex-col relative h-[680px] max-h-[92vh] border border-border"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 rounded-t-2xl relative min-h-[64px]">
              {/* Left Area */}
              <div className="flex items-center gap-2 text-sm">
                {urlToEdit ? (
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span>Edit URL</span>
                  </div>
                ) : (
                  <div className="w-6" />
                )}
              </div>

              {/* Center Segmented Bar Switcher */}
              {!urlToEdit && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center p-1 rounded-xl bg-secondary/80 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('single');
                      setBatchResults([]);
                      setError('');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      mode === 'single'
                        ? 'bg-background text-foreground shadow-xs border border-border/50 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    <span>Single Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('multi');
                      setError('');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      mode === 'multi'
                        ? 'bg-background text-foreground shadow-xs border border-border/50 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Multi-Channel</span>
                  </button>
                </div>
              )}

              {/* Right Close Button */}
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Main Content Body */}
            <div className="flex-1 overflow-y-auto p-6 relative z-20" style={{ scrollbarWidth: 'thin' }}>
              <AnimatePresence mode="wait">
                {mode === 'single' ? (
                  <motion.form 
                    key="single-link-form" 
                    id="create-link-form" 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleShortenSubmit}
                  >
                    {error && (
                      <div className="mb-4 p-3 bg-rose-500/10 text-rose-500 text-sm rounded-lg border border-rose-500/20">
                        {error}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12">
                      {/* Left Column */}
                      <div className="flex flex-col gap-5 pb-36">
                        {/* Destination URL */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-sm font-medium text-foreground">Destination URL</label>
                            <button type="button" className="text-muted-foreground hover:text-foreground" title="The destination web page to redirect visitors to">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input 
                            type="url" 
                            required 
                            value={longUrl}
                            onChange={(e) => handleLongUrlChange(e.target.value)}
                            className="block w-full rounded-lg border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors px-3.5 py-2.5 sm:text-sm placeholder:text-muted-foreground bg-background text-foreground text-xs"
                            placeholder="https://dub.co/help/article/dub-links" 
                          />
                        </div>

                        {/* Short Link */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Short Link</label>
                            <div className="flex gap-2">
                              {!urlToEdit && (
                                <button 
                                  type="button" 
                                  onClick={() => setCustomAlias(generateRandomHash())}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary cursor-pointer" 
                                  title="Randomize"
                                >
                                  <Shuffle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex rounded-lg overflow-hidden border border-input">
                            <div className="flex items-center whitespace-nowrap shrink-0 px-4 py-2 bg-secondary border-r border-border text-sm text-muted-foreground">
                              {displayDomain}/
                            </div>
                            <input 
                              type="text" 
                              value={customAlias}
                              onChange={(e) => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                              disabled={!!urlToEdit}
                              className="block flex-1 min-w-0 w-full rounded-none border-none focus:outline-none focus:ring-0 transition-colors px-4 py-2 sm:text-sm disabled:bg-secondary disabled:text-muted-foreground bg-background text-foreground placeholder:text-muted-foreground" 
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        {renderTagsBlock()}

                        {/* Password */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <input 
                              type={showPassword ? "text" : "password"} 
                              placeholder={urlToEdit?.hasPassword && !removePassword ? "Password is set. Enter a new one to change." : (removePassword ? "Password will be removed" : "Optional password...")}
                              value={password}
                              disabled={removePassword}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full rounded-lg border border-input py-2.5 pl-9 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors sm:text-sm placeholder:text-muted-foreground disabled:bg-secondary disabled:text-muted-foreground bg-background text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={removePassword}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {urlToEdit?.hasPassword && (
                            <div className="flex justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRemovePassword(!removePassword);
                                  if (!removePassword) setPassword('');
                                }}
                                className="text-xs text-rose-500 hover:text-rose-400 font-medium transition-colors"
                              >
                                {removePassword ? "Cancel password removal" : "Remove current password"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expiration */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-sm font-medium text-foreground">Expiration</label>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
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
                                  className={expirationPreset.toLowerCase() === preset.id.toLowerCase() 
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 border border-transparent px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-sm"
                                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border hover:bg-secondary/80 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                                  }
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {renderExpirationStatus()}
                            {expirationPreset === 'custom' && renderCustomDatePicker()}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-5">
                        {/* Folder */}
                        {renderFolderBlock()}

                        {/* QR Code */}
                        {!urlToEdit && (() => {
                          const qrUrl = `${protocol}//${displayDomain}/${customAlias || 'preview'}`;
                          let matrix: boolean[][] = [];
                          try {
                            matrix = generateQrMatrix(qrUrl);
                          } catch {
                            matrix = generateQrMatrix('https://trim.ly');
                          }
                          const qrSize = matrix.length;
                          const isFinder = (x: number, y: number) => {
                            if (x < 7 && y < 7) return true;
                            if (x >= qrSize - 7 && y < 7) return true;
                            if (x < 7 && y >= qrSize - 7) return true;
                            return false;
                          };
                          const isExcavated = (x: number, y: number) => {
                            if (!qrConfig.hasLogo) return false;
                            const center = qrSize / 2;
                            const radius = qrSize > 25 ? 3.5 : 2.5;
                            return Math.abs(x + 0.5 - center) < radius && Math.abs(y + 0.5 - center) < radius;
                          };
                          const centerPos = qrSize / 2;
                          const logoBoxSize = qrSize > 25 ? 6 : 5;

                          const renderFinder = (offsetX: number, offsetY: number, key: string) => (
                            <g key={key} transform={`translate(${offsetX}, ${offsetY})`}>
                              {qrConfig.markerBorder === 'square' && (
                                <path d="M 0 0 H 7 V 7 H 0 Z M 1 1 V 6 H 6 V 1 Z" fill={qrConfig.color} fillRule="evenodd" />
                              )}
                              {qrConfig.markerBorder === 'rounded' && (
                                <rect x="0.5" y="0.5" width="6" height="6" rx="1.75" fill="none" stroke={qrConfig.color} strokeWidth="1" />
                              )}
                              {qrConfig.markerBorder === 'circle' && (
                                <rect x="0.5" y="0.5" width="6" height="6" rx="3" fill="none" stroke={qrConfig.color} strokeWidth="1" />
                              )}
                              {qrConfig.markerCenter === 'square' && (
                                <rect x="2" y="2" width="3" height="3" rx="0.3" fill={qrConfig.color} />
                              )}
                              {qrConfig.markerCenter === 'round' && (
                                <circle cx="3.5" cy="3.5" r="1.5" fill={qrConfig.color} />
                              )}
                            </g>
                          );

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-sm font-medium text-foreground">QR Code</label>
                                  <button type="button" className="text-muted-foreground hover:text-foreground" title="QR Code is generated automatically">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="border border-dashed border-border rounded-lg p-3 bg-secondary/30 flex flex-col items-center justify-center relative min-h-[130px]">
                                <div 
                                  className="p-2 rounded-md border border-border flex items-center justify-center transition-colors shadow-none"
                                  style={{ backgroundColor: qrConfig.bgColor }}
                                >
                                  <svg viewBox={`0 0 ${qrSize + 4} ${qrSize + 4}`} className="w-24 h-24">
                                    <rect x="0" y="0" width={qrSize + 4} height={qrSize + 4} fill={qrConfig.bgColor} />
                                    <g transform="translate(2, 2)">
                                      {renderFinder(0, 0, 'tl')}
                                      {renderFinder(qrSize - 7, 0, 'tr')}
                                      {renderFinder(0, qrSize - 7, 'bl')}
                                      {matrix.map((row, y) =>
                                        row.map((cell, x) => {
                                          if (!cell) return null;
                                          if (isFinder(x, y)) return null;
                                          if (isExcavated(x, y)) return null;
                                          if (qrConfig.dotStyle === 'dots') {
                                            return <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r="0.4" fill={qrConfig.color} />;
                                          }
                                          if (qrConfig.dotStyle === 'diamonds') {
                                            return (
                                              <polygon
                                                key={`${x}-${y}`}
                                                points={`${x + 0.5},${y + 0.08} ${x + 0.92},${y + 0.5} ${x + 0.5},${y + 0.92} ${x + 0.08},${y + 0.5}`}
                                                fill={qrConfig.color}
                                              />
                                            );
                                          }
                                          return <rect key={`${x}-${y}`} x={x + 0.06} y={y + 0.06} width="0.88" height="0.88" fill={qrConfig.color} />;
                                        })
                                      )}
                                      {qrConfig.hasLogo && (
                                        <g transform={`translate(${centerPos - logoBoxSize / 2}, ${centerPos - logoBoxSize / 2})`}>
                                          <rect x="0" y="0" width={logoBoxSize} height={logoBoxSize} rx={logoBoxSize / 4} fill={qrConfig.bgColor} />
                                          <image href="/trim-logo.svg" x={logoBoxSize * 0.12} y={logoBoxSize * 0.12} width={logoBoxSize * 0.76} height={logoBoxSize * 0.76} />
                                        </g>
                                      )}
                                    </g>
                                  </svg>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setIsQrStudioOpen(true)}
                                  title="Customize QR Code"
                                  className="absolute top-2 right-2 p-1.5 bg-background hover:bg-secondary border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.form>
                ) : batchResults.length > 0 ? (
                  <motion.div
                    key="batch-results-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12"
                  >
                    {/* Left Column: Results List */}
                    <div className="flex flex-col gap-3 pb-16">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          Generated Channel Links ({batchResults.length})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Campaign: <strong className="text-primary font-semibold">{batchCampaignName}</strong>
                        </span>
                      </div>

                      <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden bg-secondary/20 max-h-[440px] overflow-y-auto">
                        {batchResults.map((item, idx) => {
                          const isCopied = batchCopiedId === item.shortUrl;
                          return (
                            <div
                              key={item.shortUrl + idx}
                              className="p-3.5 flex items-center justify-between gap-3 hover:bg-secondary/40 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-xs text-foreground">
                                    {item.channelName}
                                  </span>
                                  <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-secondary border border-border/50">
                                    source={item.utmSource}
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-primary truncate">
                                  {item.fullShortUrl}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.fullShortUrl);
                                    setBatchCopiedId(item.shortUrl);
                                    toast.success(`Copied ${item.channelName} link!`);
                                    setTimeout(() => setBatchCopiedId(null), 2000);
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                    isCopied
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-background hover:bg-secondary text-foreground border border-input'
                                  }`}
                                >
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {isCopied ? 'Copied' : 'Copy'}
                                </button>
                                <a
                                  href={item.fullShortUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open link in new tab"
                                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Campaign Summary & Export Actions */}
                    <div className="flex flex-col gap-4">
                      <div className="border border-border rounded-xl p-5 bg-card/40 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                          <Layers className="w-4 h-4 text-primary" />
                          <span>Campaign Summary</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Destination:</span>
                            <span className="font-medium text-foreground truncate max-w-[180px]">{batchLongUrl}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Campaign:</span>
                            <span className="font-semibold text-primary">{batchCampaignName}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Links Created:</span>
                            <span className="font-semibold text-foreground">{batchResults.length}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const headers = 'Channel,Short URL,Destination URL with UTM,UTM Source,UTM Medium\n';
                              const rows = batchResults
                                .map(
                                  r =>
                                    `"${r.channelName}","${r.fullShortUrl}","${r.longUrlWithUtm}","${r.utmSource}","${r.utmMedium || ''}"`
                                )
                                .join('\n');
                              const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `campaign_${batchCampaignName || 'batch'}_links.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success('Downloaded CSV export!');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                            Export CSV Spreadsheet
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="batch-config-form"
                    id="batch-campaign-form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleBatchSubmit}
                  >
                    {error && (
                      <div className="mb-4 p-3 bg-rose-500/10 text-rose-500 text-sm rounded-lg border border-rose-500/20">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12">
                      {/* Left Column: Batch Form */}
                      <div className="flex flex-col gap-5 pb-36">
                        {/* Destination URL */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-sm font-medium text-foreground">Destination URL</label>
                          </div>
                          <input
                            type="url"
                            required
                            value={batchLongUrl}
                            onChange={e => setBatchLongUrl(e.target.value)}
                            placeholder="https://yourbrand.com/launch"
                            className="block w-full rounded-lg border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors px-3.5 py-2.5 sm:text-sm placeholder:text-muted-foreground bg-background text-foreground text-xs"
                          />
                        </div>

                        {/* Campaign Name */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <label className="text-sm font-medium text-foreground">Campaign Name</label>
                          </div>
                          <input
                            type="text"
                            required
                            value={batchCampaignName}
                            onChange={e => setBatchCampaignName(e.target.value)}
                            placeholder="summer_sale_2026"
                            className="block w-full rounded-lg border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors px-3.5 py-2.5 sm:text-sm placeholder:text-muted-foreground bg-background text-foreground text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                          </p>
                        </div>

                        {/* Channels Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">
                              Target Channels ({batchChannels.filter(c => c.selected).length})
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowAddCustom(!showAddCustom)}
                              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Custom Channel
                            </button>
                          </div>

                          {/* Custom Channel Inline Form */}
                          {showAddCustom && (
                            <div className="p-3 bg-secondary/60 border border-border rounded-lg space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  placeholder="Name (e.g. Reddit)"
                                  value={customName}
                                  onChange={e => setCustomName(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground"
                                />
                                <input
                                  type="text"
                                  placeholder="utm_source (e.g. reddit)"
                                  value={customSource}
                                  onChange={e => setCustomSource(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground"
                                />
                                <input
                                  type="text"
                                  placeholder="utm_medium (e.g. social)"
                                  value={customMedium}
                                  onChange={e => setCustomMedium(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddCustom(false)}
                                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!customName.trim() || !customSource.trim()) {
                                      toast.error('Channel name and UTM source are required');
                                      return;
                                    }
                                    const trimmedName = customName.trim();
                                    const sourceVal = customSource.trim().toLowerCase().replace(/\s+/g, '_');
                                    const mediumVal = customMedium.trim() ? customMedium.trim().toLowerCase().replace(/\s+/g, '_') : 'custom';

                                    try {
                                      const res = await axiosInstance.post('/custom-channels', {
                                        name: trimmedName,
                                        utmSource: sourceVal,
                                        utmMedium: mediumVal,
                                      });
                                      const saved = res.data;
                                      const newChan: ChannelItem = {
                                        id: `custom_${saved.id}`,
                                        dbId: saved.id,
                                        name: saved.name,
                                        source: saved.utmSource,
                                        medium: saved.utmMedium,
                                        selected: true,
                                        isCustom: true,
                                      };
                                      setBatchChannels(prev => [...prev, newChan]);
                                      setCustomName('');
                                      setCustomSource('');
                                      setCustomMedium('');
                                      setShowAddCustom(false);
                                      toast.success(`Custom channel "${saved.name}" saved to database`);
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.message || 'Failed to save custom channel');
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 cursor-pointer"
                                >
                                  Add Channel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Channels Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {batchChannels.map(channel => {
                              const isSelected = channel.selected;
                              return (
                                <div
                                  key={channel.id}
                                  onClick={() => {
                                    setBatchChannels(prev =>
                                      prev.map(c => (c.id === channel.id ? { ...c, selected: !c.selected } : c))
                                    );
                                  }}
                                  className={`group relative flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                    isSelected
                                      ? 'bg-primary/10 border-primary/40 text-foreground font-medium shadow-xs'
                                      : 'bg-card/40 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-1">
                                    <span
                                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                        isSelected
                                          ? 'bg-primary border-primary text-primary-foreground'
                                          : 'border-muted-foreground/40 group-hover:border-muted-foreground'
                                      }`}
                                    >
                                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </span>
                                    <span className="truncate">{channel.name}</span>
                                  </div>

                                  {channel.isCustom && (
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (channel.dbId) {
                                          try {
                                            await axiosInstance.delete(`/custom-channels/${channel.dbId}`);
                                            setBatchChannels(prev => prev.filter(c => c.id !== channel.id));
                                            toast.success(`Removed "${channel.name}" channel`);
                                          } catch (err: any) {
                                            toast.error(err.response?.data?.message || 'Failed to delete custom channel');
                                          }
                                        } else {
                                          setBatchChannels(prev => prev.filter(c => c.id !== channel.id));
                                        }
                                      }}
                                      className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
                                      title="Delete custom channel"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tags */}
                        {renderTagsBlock()}
                      </div>

                      {/* Right Column: Folder & Campaign Live Preview */}
                      <div className="flex flex-col gap-5">
                        {/* Folder */}
                        {renderFolderBlock()}

                        {/* Campaign Preview Box */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Campaign Preview</label>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {batchChannels.filter(c => c.selected).length} Links Ready
                            </span>
                          </div>

                          <div className="border border-dashed border-border rounded-lg p-4 bg-secondary/30 flex flex-col gap-3 min-h-[140px]">
                            <div className="p-3 bg-background border border-border rounded-md text-xs text-muted-foreground break-all leading-relaxed">
                              {batchLongUrl ? (
                                <>
                                  <span className="text-foreground">{batchLongUrl.replace(/\?.*$/, '')}</span>
                                  <span className="text-primary font-semibold">
                                    ?utm_source=...&utm_campaign={batchCampaignName || '{campaign}'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground italic">
                                  Enter destination URL to preview tracked links...
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-muted-foreground leading-normal">
                              Each channel receives its own distinct short link and UTM parameters for granular attribution in Analytics.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border bg-secondary/40 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 rounded-b-2xl">
              {mode === 'single' ? (
                <>
                  {/* Bottom Action Toolbar */}
                  <div className="flex items-center gap-1.5">
                    {/* UTM Button */}
                    <button
                      type="button"
                      onClick={() => setIsUtmModalOpen(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        activeUtmCount > 0
                          ? 'bg-primary/10 text-primary border-primary/30 font-semibold shadow-sm'
                          : 'bg-background hover:bg-secondary border-border text-foreground hover:border-border/80'
                      }`}
                      title="UTM Builder & Tracking Parameters"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>UTM</span>
                      {activeUtmCount > 0 && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                          {activeUtmCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div>
                    <button 
                      type="submit" 
                      form="create-link-form"
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground focus:outline-none transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {loading ? (urlToEdit ? 'Saving...' : 'Creating...') : (urlToEdit ? 'Save changes' : 'Create link')}
                      <span className="flex items-center text-[10px] text-primary-foreground/70 border border-primary-foreground/20 px-1 rounded bg-primary/20 ml-1">
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    </button>
                  </div>
                </>
              ) : batchResults.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchResults([]);
                      setBatchLongUrl('');
                      setBatchCampaignName('');
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    ← Create Another Campaign
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = batchResults
                        .map(r => `${r.channelName}: ${r.fullShortUrl}`)
                        .join('\n');
                      navigator.clipboard.writeText(text);
                      setBatchAllCopied(true);
                      toast.success('All campaign links copied to clipboard!');
                      setTimeout(() => setBatchAllCopied(false), 2500);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all cursor-pointer ${
                      batchAllCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {batchAllCopied ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                    {batchAllCopied ? 'All Links Copied!' : 'Copy All Links'}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{batchChannels.filter(c => c.selected).length}</span> channels selected
                  </div>

                  <div>
                    <button
                      type="submit"
                      form="batch-campaign-form"
                      disabled={batchLoading || batchChannels.filter(c => c.selected).length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground focus:outline-none transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {batchLoading
                        ? 'Creating links...'
                        : `Create ${batchChannels.filter(c => c.selected).length} Campaign Links`}
                      <span className="flex items-center text-[10px] text-primary-foreground/70 border border-primary-foreground/20 px-1 rounded bg-primary/20 ml-1">
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    </button>
                  </div>
                </>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}

      {/* QR Code Studio Modal */}
      {isQrStudioOpen && (
        <QrCodeModal
          isOpen={isQrStudioOpen}
          onClose={() => setIsQrStudioOpen(false)}
          shortUrl={`${protocol}//${displayDomain}/${customAlias || 'preview'}`}
          hash={customAlias || undefined}
          initialConfig={qrConfig}
          onSave={setQrConfig}
        />
      )}

      {/* UTM Tracking Modal */}
      {isUtmModalOpen && (
        <UtmModal
          isOpen={isUtmModalOpen}
          onClose={() => setIsUtmModalOpen(false)}
          baseUrl={baseDestinationUrl || parseUrlUtms(longUrl).baseUrl || longUrl}
          initialUtms={utms}
          initialCustomParams={customParams}
          onSave={(newUtms, newCustomParams) => {
            handleUtmBuilderChange(newUtms, newCustomParams);
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default CreateLinkModal;
