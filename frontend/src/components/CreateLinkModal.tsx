import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, Globe, X, HelpCircle, Shuffle, 
  Tag, FolderArchive, ChevronsUpDown, 
  Lock, CornerDownLeft, Pencil, Check, FolderPlus, Eye, EyeOff, ArrowRight, Folder,
  Calendar as CalendarIcon, ChevronDown, ChevronLeft, Sparkles,
  CornerDownRight, FlaskConical, Clock, MoreHorizontal
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
import type { Tag as TagType, Folder as FolderType } from '../types';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUrl?: any) => void;
  folders: { id: number; name: string; slug?: string }[];
  tags: { id: number; name: string; color?: string }[];
  urlToEdit?: any | null;
  defaultFolderId?: number;
  onOpenFolderModal?: () => void;
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
  onOpenFolderModal
}) => {
  const rootDomain = window.location.hostname.replace('app.', '');
  const displayDomain = rootDomain + (window.location.port && window.location.port !== '80' && window.location.port !== '443' ? ':' + window.location.port : '');
  const protocol = window.location.protocol;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${protocol}//api.${rootDomain}`;
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
  const [customAlias, setCustomAlias] = useState(urlToEdit ? urlToEdit.shortUrl.split('/').pop() || '' : '');

  const handleLongUrlChange = (newUrl: string) => {
    const parsed = parseUrlUtms(newUrl);
    if (parsed.hasUtms) {
      setLongUrl(newUrl);
      setBaseDestinationUrl(parsed.baseUrl);
      setUtms(parsed.utms);
      setCustomParams(parsed.customParams);
    } else {
      setBaseDestinationUrl(parsed.baseUrl);
      const activeCount =
        Object.values(utms).filter((val) => val && val.trim() !== '').length +
        customParams.filter((p) => p.key && p.key.trim() !== '').length;
      if (activeCount > 0 && parsed.baseUrl && (newUrl.startsWith('http://') || newUrl.startsWith('https://') || newUrl.includes('.'))) {
        const full = buildUrlWithUtms(parsed.baseUrl, utms, customParams);
        setLongUrl(full);
      } else {
        setLongUrl(newUrl);
      }
    }
  };

  const handleUtmBuilderChange = (newUtms: UtmParams, newCustomParams: CustomParam[]) => {
    setUtms(newUtms);
    setCustomParams(newCustomParams);
    const parsed = parseUrlUtms(longUrl);
    const targetBase = baseDestinationUrl || parsed.baseUrl || longUrl;
    if (targetBase) {
      const full = buildUrlWithUtms(targetBase, newUtms, newCustomParams);
      setLongUrl(full);
    }
  };

  const handleUtmClear = () => {
    const emptyUtms: UtmParams = { source: '', medium: '', campaign: '', term: '', content: '' };
    setUtms(emptyUtms);
    setCustomParams([]);
    const parsed = parseUrlUtms(longUrl);
    const targetBase = baseDestinationUrl || parsed.baseUrl;
    if (targetBase) {
      const full = buildUrlWithUtms(targetBase, emptyUtms, []);
      setLongUrl(full);
    }
  };

  const resolveDefaultFolderId = () => {
    if (defaultFolderId !== undefined && defaultFolderId !== null) return defaultFolderId;
    const defaultFolder = (folders || []).find(f => (f as any).slug === 'links' || f.name.toLowerCase() === 'links');
    return defaultFolder ? defaultFolder.id : (folders && folders.length > 0 ? folders[0].id : '');
  };

  const [selectedFolderId, setSelectedFolderId] = useState<number | string>(
    urlToEdit ? (urlToEdit.folderId || '') : resolveDefaultFolderId()
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(urlToEdit?.tags?.map((t: { id: number; name: string }) => t.id) || []);
  const [password, setPassword] = useState(''); // Always start blank for security
  const [expiresAt, setExpiresAt] = useState(urlToEdit?.expiresAt || '');

  // --- DERIVED STATE FOR EXPIRATION PRESET ---
  const getInitialExpirationPreset = (expDate: string | null | undefined): string => {
    if (!expDate) return 'None';
    return '';
  };
  const [expirationPreset, setExpirationPreset] = useState(getInitialExpirationPreset(urlToEdit?.expiresAt));
  // --- END DERIVED STATE ---

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isSiteDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [qrConfig, setQrConfig] = useState<QrConfig>({
    hasLogo: true,
    dotStyle: 'diamonds',
    markerCenter: 'round',
    markerBorder: 'rounded',
    color: isSiteDark ? '#ffffff' : '#000000',
    bgColor: isSiteDark ? '#000000' : '#ffffff',
  });
  const [isQrStudioOpen, setIsQrStudioOpen] = useState(false);
  const [isUtmModalOpen, setIsUtmModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);

  const activeUtmCount =
    Object.values(utms).filter((val) => val.trim() !== '').length +
    customParams.filter((p) => p.key.trim() !== '').length;

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

  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const folderRef = useRef<HTMLDivElement>(null);
  useClickOutside(folderRef, () => setIsFolderDropdownOpen(false));

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
  useClickOutside(datePickerRef, () => setIsDatePickerOpen(false));
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
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
        
        // Auto-load default UTM template if configured
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
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, urlToEdit]);

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleExpirationPresetChange = (preset: string) => {
    setExpirationPreset(preset);
    if (preset === 'none') {
      setExpiresAt('');
    } else if (preset === '1hour') {
      setExpiresAt(new Date(Date.now() + 3600000).toISOString().substring(0, 19));
    } else if (preset === '24hours') {
      setExpiresAt(new Date(Date.now() + 86400000).toISOString().substring(0, 19));
    } else if (preset === '7days') {
      setExpiresAt(new Date(Date.now() + 604800000).toISOString().substring(0, 19));
    } else if (preset === 'custom') {
      setExpiresAt(new Date(Date.now() + 3600000).toISOString().substring(0, 19));
    }
  };

  const handleShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setError('');
    setLoading(true);
    try {
      if (urlToEdit) {
        const hash = urlToEdit.shortUrl.split('/').pop();
        if (!hash) {
          setError("Could not determine the link's hash to update.");
          setLoading(false);
          return;
        }
        
        const isCurrentlyExpired = urlToEdit.expiresAt ? new Date(urlToEdit.expiresAt + 'Z').getTime() < Date.now() : !urlToEdit.isActive;
        const willBeExpired = expiresAt && expirationPreset.toLowerCase() !== 'none' ? new Date(expiresAt + 'Z').getTime() < Date.now() : false;

        if (isCurrentlyExpired && !willBeExpired) {
          const confirmed = window.confirm("This link is currently expired. Updating this will reactivate the link. Do you want to proceed?");
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
        
        if (!isCurrentlyExpired && willBeExpired) {
          const confirmed = window.confirm("You have selected a time in the past. This will instantly expire and deactivate the link. Do you want to proceed?");
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }

        if (removePassword) {
          const confirmed = window.confirm("Are you sure you want to remove the password protection from this link?");
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }

        const finalExpiresAt = expirationPreset.toLowerCase() === 'none' ? null : (expiresAt ? new Date(expiresAt + 'Z').toISOString() : null);

        const updatePayload = {
          longUrl: longUrl.trim(),
          password: removePassword ? "" : (password.trim() || null),
          expiresAt: finalExpiresAt,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : []
        };

        const { data } = await axiosInstance.put(`/url/${hash}`, updatePayload);
        onSuccess(data);
      } else {
        const parsed = parseUrlUtms(longUrl);
        const targetBase = baseDestinationUrl || parsed.baseUrl || longUrl.trim();
        const activeCount =
          Object.values(utms).filter((val) => val && val.trim() !== '').length +
          customParams.filter((p) => p.key && p.key.trim() !== '').length;
        const finalLongUrl = (activeCount > 0 && targetBase)
          ? buildUrlWithUtms(targetBase, utms, customParams)
          : longUrl.trim();

        const createPayload: any = {
          longUrl: finalLongUrl,
          customAlias: customAlias.trim() || undefined,
          password: password.trim() || undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          folderId: selectedFolderId !== '' ? selectedFolderId : undefined
        };
        if (expiresAt) {
          createPayload.expiresAt = new Date(expiresAt + 'Z').toISOString();
        }
        
        const { data } = await axiosInstance.post('/shorten', createPayload);
        onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      if (!urlToEdit && (err.response?.status === 409 || err.response?.status === 400)) {
        setError('This custom alias is already taken. Please choose another one.');
      } else {
        const defaultMessage = urlToEdit ? "Failed to update URL. Please try again." : "Failed to shorten URL. Please try again.";
        const backendMessage = (axios.isAxiosError(err) && err.response?.data?.message) || defaultMessage;
        setError(backendMessage);
      }
    } finally {
      setLoading(false);
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

  const filteredTags = (localTags || []).filter(t => t?.name?.toLowerCase().includes((tagSearchQuery || '').toLowerCase()));
  const filteredFolders = (localFolders || []).filter(f => f?.name?.toLowerCase().includes((folderSearchQuery || '').toLowerCase()));

  const renderExpirationStatus = () => {
    // --- EDIT MODE ---
    if (urlToEdit) {
      const originalExpireDate = urlToEdit.expiresAt ? parseISO(urlToEdit.expiresAt + 'Z') : null;
      const newExpireDate = expiresAt ? parseISO(expiresAt + 'Z') : null;

      const isCurrentlyExpired = urlToEdit.isActive === false || (originalExpireDate && originalExpireDate.getTime() <= Date.now());
      const showRightSide = !originalExpireDate || expirationPreset !== '';

      const renderLeft = () => {
        if (isCurrentlyExpired) {
          return <span className="text-rose-500 font-medium">Expired</span>;
        } else if (!originalExpireDate) {
          return <span>Never expires</span>;
        } else {
          return <span>{`${formatDistanceToNow(originalExpireDate, { addSuffix: false })} remaining`}</span>;
        }
      };

      const renderRight = () => {
        if (!newExpireDate || expirationPreset.toLowerCase() === 'none') {
          return <span>Never expires</span>;
        }
        if (newExpireDate.getTime() < Date.now()) {
          return <span className="text-rose-500 font-medium">Will expire immediately</span>;
        }
        return <span>Expires {formatDistanceToNow(newExpireDate, { addSuffix: true })}</span>;
      };

      return (
        <div className="mt-2 flex items-center gap-3 text-sm min-h-[2rem]">
          {/* "Before" state */}
          <div className="text-gray-500 dark:text-zinc-500" title={originalExpireDate ? format(originalExpireDate, 'PPpp') : 'No expiration set'}>
            {renderLeft()}
          </div>

          {showRightSide && <ArrowRight className="w-4 h-4 text-gray-400 dark:text-zinc-500" />}

          {/* "After" state */}
          {showRightSide && (
            <div className="font-medium text-gray-800 dark:text-gray-200" title={newExpireDate && expirationPreset.toLowerCase() !== 'none' ? format(newExpireDate, 'PPpp') : 'Will never expire'}>
              {renderRight()}
            </div>
          )}
        </div>
      );
    }

    // --- CREATE MODE ---
    if (!expiresAt || expirationPreset.toLowerCase() === 'none') return null;
    
    const expireDate = expiresAt ? new Date(expiresAt + 'Z') : null;
    if (!expireDate) return null;

    return (
      <div className="mt-2 flex flex-col min-h-[2rem]" title={format(expireDate, 'PPpp')}>
        {expireDate.getTime() > Date.now() ? (
          <>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Expires {formatDistanceToNow(expireDate, { addSuffix: true })}
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              {format(expireDate, "PPpp")}
            </span>
          </>
        ) : (
          <span className="text-sm font-medium text-rose-500">
            Will expire immediately
          </span>
        )}
      </div>
    );
  };

  const getTimeValues = () => {
    if (!expiresAt) {
      return { hour: '12', minute: '00', ampm: 'PM' };
    }
    try {
      const date = parseISO(expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z');
      const h24 = date.getHours();
      const h12 = h24 % 12 || 12;
      const mins = Math.floor(date.getMinutes() / 5) * 5;
      const minuteStr = mins.toString().padStart(2, '0');
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      return { hour: h12.toString(), minute: minuteStr, ampm };
    } catch (e) {
      return { hour: '12', minute: '00', ampm: 'PM' };
    }
  };

  const updateExpiresAt = (day: Date, hourStr: string, minuteStr: string, ampmStr: string) => {
    let h = parseInt(hourStr, 10) || 12;
    if (ampmStr === 'PM' && h < 12) h += 12;
    if (ampmStr === 'AM' && h === 12) h = 0;
    const m = parseInt(minuteStr, 10) || 0;

    const localDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0);
    const utcString = localDate.toISOString().substring(0, 19);
    setExpiresAt(utcString);
    setExpirationPreset('Custom');
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
          className="w-full flex items-center justify-between border border-input bg-background rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
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
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="absolute bottom-full mb-1 left-0 z-[60] bg-popover border border-border rounded-xl shadow-xl p-3.5 w-72"
            >
              <div className="space-y-3">
                {/* Month Header */}
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setPickerMonth(subMonths(pickerMonth, 1))}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    {format(pickerMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isDayToday = isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={!isCurrentMonth}
                        onClick={() => handleSelectDay(day)}
                        className={`relative flex flex-col items-center justify-center h-7 text-xs rounded-md transition-colors ${
                          !isCurrentMonth
                            ? 'text-muted-foreground/30 cursor-default opacity-40'
                            : isSelected
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span>{format(day, 'd')}</span>
                        {isDayToday && !isSelected && (
                          <span className="w-1 h-1 bg-primary rounded-full absolute bottom-0.5" />
                        )}
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
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
            className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl z-[101] overflow-visible flex flex-col relative max-h-[95vh] min-h-[640px] border border-border"
          >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors">Links</span>
            <span className="text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Globe className="w-4 h-4 text-primary" />
              {urlToEdit ? 'Edit URL' : 'New link'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative z-20" style={{ scrollbarWidth: 'thin' }}>
          <form id="create-link-form" onSubmit={handleShortenSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 text-rose-500 text-sm rounded-lg border border-rose-500/20">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12">
              {/* Left Column */}
              <div className="flex flex-col gap-5 pb-16">
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
                    className="block w-full rounded-lg border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors px-3.5 py-2.5 sm:text-sm placeholder:text-muted-foreground bg-background text-foreground font-mono text-xs"
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
                          className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary" 
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
                <div className="space-y-1.5 relative z-30" ref={tagRef}>
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
                        className="absolute top-full mt-1 left-0 w-full z-40 bg-popover border border-border rounded-xl shadow-lg p-1 flex flex-col"
                      >
                      <input
                        type="text"
                        autoFocus={true}
                        placeholder="Search or create tag..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-2 px-3 text-foreground placeholder:text-muted-foreground border-b border-border"
                      />
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-1 p-1">
                        {filteredTags.map(tag => (
                          <motion.button
                            layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground"
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
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground"
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
                    {expirationPreset.toLowerCase() === 'custom' && renderCustomDatePicker()}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
                {/* Folder */}
                <div className="space-y-1.5 relative" ref={folderRef}>
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-foreground">Folder</label>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {urlToEdit ? (
                    <div className="flex items-center gap-2 w-full border border-border bg-secondary rounded-lg px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
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
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground"
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
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors hover:bg-secondary text-foreground"
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
          </form>
        </div>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border bg-secondary/40 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 rounded-b-2xl">
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? (urlToEdit ? 'Saving...' : 'Creating...') : (urlToEdit ? 'Save changes' : 'Create link')}
              <span className="flex items-center text-[10px] text-primary-foreground/70 border border-primary-foreground/20 px-1 rounded bg-primary/20 ml-1">
                <CornerDownLeft className="w-3 h-3" />
              </span>
            </button>
          </div>
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
