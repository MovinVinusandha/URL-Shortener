import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useOutletContext } from 'react-router-dom';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import { 
  ArrowLeft, MousePointerClick, Globe, Monitor, 
  Link as LinkIcon, Activity,
  Share2, Folder as FolderIcon,
  Tag, X, Search, Filter, ChevronDown, ChevronLeft, Check,
  BarChart2, Layers, Zap, Target, Radio, FileText, SlidersHorizontal, Gift, Trophy
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { UrlDto } from '../types';
import { DateRangePicker } from '../components/DateRangePicker';
import type { DateRangeValue } from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';
import { groupUrlsByCampaign, formatChannelName, extractUtmParams } from '../utils/utmExtractor';
import CampaignComparisonView from '../components/CampaignComparisonView';

export interface UtmDataPoint {
  name: string;
  count: number;
}

interface AnalyticsData {
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { country: string; count: number }[];
  clicksByDevice: { device: string; count: number }[];
  clicksByBrowser: { browser: string; count: number }[];
  clicksByUtmSource?: UtmDataPoint[];
  clicksByUtmMedium?: UtmDataPoint[];
  clicksByUtmCampaign?: UtmDataPoint[];
  clicksByUtmTerm?: UtmDataPoint[];
  clicksByUtmContent?: UtmDataPoint[];
  clicksByReferer?: UtmDataPoint[];
}

const COLORS = ['#0099ff', '#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f43f5e'];

const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const DeviceDonutWheel: React.FC<{
  data: { device: string; count: number }[];
  totalClicks: number;
}> = ({ data, totalClicks }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const deviceTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0) || totalClicks || 1;
  }, [data, totalClicks]);

  const R = 54;
  const C = 2 * Math.PI * R; // ~339.292

  let accumulatedPercent = 0;

  const activeItem = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;
  const activeCount = activeItem ? activeItem.count : data.reduce((sum, item) => sum + item.count, 0);
  const activeLabel = activeItem ? activeItem.device : 'Total Clicks';
  const activePct = activeItem ? Math.round((activeItem.count / deviceTotal) * 100) : 100;

  return (
    <div className="w-full flex flex-col items-center">
      {/* SVG Donut Wheel */}
      <div className="relative w-44 h-44 flex items-center justify-center my-1">
        <svg 
          viewBox="0 0 160 160" 
          className="w-full h-full transform -rotate-90 origin-center select-none"
        >
          {/* Subtle Background Track */}
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            className="stroke-secondary/70 dark:stroke-[#18181B]"
            strokeWidth="14"
          />

          {/* Slices */}
          {data.map((item, index) => {
            const pct = item.count / deviceTotal;
            const strokeLength = pct * C;
            const strokeOffset = -(accumulatedPercent * C);
            accumulatedPercent += pct;

            const isHovered = hoveredIndex === index;
            const isAnyHovered = hoveredIndex !== null;
            const color = COLORS[index % COLORS.length];

            const isSingle = data.length === 1;
            const dashArray = isSingle
              ? `${strokeLength} ${C - strokeLength}`
              : `${Math.max(0.1, strokeLength - 1.5)} ${C - Math.max(0.1, strokeLength - 1.5) + 1.5}`;

            return (
              <circle
                key={item.device}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? 17 : 14}
                strokeDasharray={dashArray}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-150 cursor-pointer"
                style={{
                  opacity: isAnyHovered && !isHovered ? 0.35 : 1,
                  filter: isHovered ? `drop-shadow(0 0 6px ${color}90)` : 'none'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Centered Dynamic Hub */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
          <span className="text-xl font-bold tracking-tight text-foreground leading-none">
            {activeCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate max-w-[85px]">
            {activeLabel}
          </span>
          {activeItem && (
            <span className="text-[11px] text-primary font-semibold leading-none mt-0.5">
              {activePct}%
            </span>
          )}
        </div>
      </div>

      {/* Legend list below */}
      <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-2 pt-3 border-t border-dashed border-border">
        {data.map((device, i) => {
          const pct = Math.round((device.count / deviceTotal) * 100);
          const isHovered = hoveredIndex === i;
          const color = COLORS[i % COLORS.length];

          return (
            <button
              key={device.device}
              type="button"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md transition-all ${
                isHovered ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform duration-150" 
                style={{ 
                  backgroundColor: color,
                  transform: isHovered ? 'scale(1.25)' : 'scale(1)'
                }} 
              />
              <span className="font-medium text-foreground">{device.device}</span>
              <span className="text-muted-foreground font-medium text-[11px]">({pct}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const { hash, folderSlug } = useParams<{ hash?: string; folderSlug?: string }>();
  const navigate = useNavigate();
  const { folders = [], tags = [], activeFolderId } = useOutletContext<DashboardLayoutContext>() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const folderIdParam = searchParams.get('folderId');
  const tagIdParam = searchParams.get('tagId');
  const hashParam = searchParams.get('hash') || hash;
  
  const utmSourceParam = searchParams.get('utm_source') || searchParams.get('utmSource');
  const utmMediumParam = searchParams.get('utm_medium') || searchParams.get('utmMedium');
  const utmCampaignParam = searchParams.get('utm_campaign') || searchParams.get('utmCampaign') || searchParams.get('campaign');
  const utmTermParam = searchParams.get('utm_term') || searchParams.get('utmTerm');
  const utmContentParam = searchParams.get('utm_content') || searchParams.get('utmContent');
  const refererParam = searchParams.get('utm_referer') || searchParams.get('referer');

  const activeUtmFilters = useMemo(() => {
    const list: { key: string; param: string; tab: UtmTab; label: string; value: string; icon: any }[] = [];
    if (utmSourceParam) list.push({ key: 'utm_source', param: 'utmSource', tab: 'source', label: 'Source', value: utmSourceParam, icon: Globe });
    if (utmMediumParam) list.push({ key: 'utm_medium', param: 'utmMedium', tab: 'medium', label: 'Medium', value: utmMediumParam, icon: Radio });
    if (utmTermParam) list.push({ key: 'utm_term', param: 'utmTerm', tab: 'term', label: 'Term', value: utmTermParam, icon: Search });
    if (utmContentParam) list.push({ key: 'utm_content', param: 'utmContent', tab: 'content', label: 'Content', value: utmContentParam, icon: FileText });
    if (refererParam) list.push({ key: 'utm_referer', param: 'referer', tab: 'referer', label: 'Referral', value: refererParam, icon: Gift });
    return list;
  }, [utmSourceParam, utmMediumParam, utmTermParam, utmContentParam, refererParam]);
  
  const currentFolder = folderSlug
    ? folders?.find(f => (f.slug && f.slug.toLowerCase() === folderSlug.toLowerCase()) || f.name.toLowerCase() === folderSlug.toLowerCase() || f.name.toLowerCase().replace(/\s+/g, '-') === folderSlug.toLowerCase())
    : (folderIdParam ? folders?.find(f => f.id === Number(folderIdParam)) : (activeFolderId ? folders?.find(f => f.id === activeFolderId) : null));
  
  // Filter dropdown state
  const filterRef = useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'link' | 'tag' | 'folder' | 'campaign'>('none');
  const [filterSearch, setFilterSearch] = useState('');
  
  const [urls, setUrls] = useState<UrlDto[]>([]);
  const [isUrlsLoading, setIsUrlsLoading] = useState(false);

  const tagPillPopoverRef = useRef<HTMLDivElement>(null);
  const [isTagPillPopoverOpen, setIsTagPillPopoverOpen] = useState(false);
  const [tagPillSearch, setTagPillSearch] = useState('');

  const folderPillPopoverRef = useRef<HTMLDivElement>(null);
  const [isFolderPillPopoverOpen, setIsFolderPillPopoverOpen] = useState(false);
  const [folderPillSearch, setFolderPillSearch] = useState('');

  const linkPillPopoverRef = useRef<HTMLDivElement>(null);
  const [isLinkPillPopoverOpen, setIsLinkPillPopoverOpen] = useState(false);
  const [linkPillSearch, setLinkPillSearch] = useState('');

  const campaignPillPopoverRef = useRef<HTMLDivElement>(null);
  const [isCampaignPillPopoverOpen, setIsCampaignPillPopoverOpen] = useState(false);
  const [campaignPillSearch, setCampaignPillSearch] = useState('');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ type: 'preset', value: '30d' });

  // Compare mode channel filter state
  const compareFilterRef = useRef<HTMLDivElement>(null);
  const [isCompareFilterOpen, setIsCompareFilterOpen] = useState(false);
  const [compareChannel, setCompareChannel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsUrlsLoading(true);
    axiosInstance.get<UrlDto[]>('/url/all')
      .then(res => {
        if (isMounted) setUrls(res.data);
      })
      .catch(err => console.error("Failed to load URLs for analytics filter", err))
      .finally(() => {
        if (isMounted) setIsUrlsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setActiveFilter('none');
      }
      if (tagPillPopoverRef.current && !tagPillPopoverRef.current.contains(event.target as Node)) {
        setIsTagPillPopoverOpen(false);
      }
      if (folderPillPopoverRef.current && !folderPillPopoverRef.current.contains(event.target as Node)) {
        setIsFolderPillPopoverOpen(false);
      }
      if (linkPillPopoverRef.current && !linkPillPopoverRef.current.contains(event.target as Node)) {
        setIsLinkPillPopoverOpen(false);
      }
      if (campaignPillPopoverRef.current && !campaignPillPopoverRef.current.contains(event.target as Node)) {
        setIsCampaignPillPopoverOpen(false);
      }
      if (compareFilterRef.current && !compareFilterRef.current.contains(event.target as Node)) {
        setIsCompareFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent && !data) {
      setLoading(true);
    } else if (!isSilent) {
      setIsFetching(true);
    }
    try {
      let endpoint = '/analytics';
      const params: any = {};
      if (dateRange.type === 'preset') {
        params.period = dateRange.value;
      } else {
        params.startDate = format(dateRange.start, "yyyy-MM-dd'T'HH:mm:ss");
        params.endDate = format(dateRange.end, "yyyy-MM-dd'T'HH:mm:ss");
      }
      if (tagIdParam) {
        params.tagId = tagIdParam;
      }
      if (utmSourceParam) params.utmSource = utmSourceParam;
      if (utmMediumParam) params.utmMedium = utmMediumParam;
      if (utmCampaignParam) params.utmCampaign = utmCampaignParam;
      if (utmTermParam) params.utmTerm = utmTermParam;
      if (utmContentParam) params.utmContent = utmContentParam;
      if (refererParam) params.referer = refererParam;

      if (hashParam) {
        endpoint = `/analytics/${hashParam}`;
      } else if (folderSlug) {
        endpoint = `/analytics/folder/slug/${folderSlug}`;
      } else if (folderIdParam) {
        endpoint = `/analytics/folder/${folderIdParam}`;
      } else {
        endpoint = '/analytics';
      }

      const response = await axiosInstance.get<AnalyticsData>(endpoint, { params });
      setData(response.data);
      setError(null);
    } catch (err: any) {
      if (!isSilent) {
        setError(err.response?.status === 404 ? 'Analytics not found or unauthorized.' : 'Failed to load analytics.');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [hashParam, folderSlug, folderIdParam, tagIdParam, utmSourceParam, utmMediumParam, utmCampaignParam, utmTermParam, utmContentParam, refererParam, dateRange, data]);

  useEffect(() => {
    fetchAnalytics(false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics(true);
      }
    }, 3_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAnalytics]);

  const activeTagIds = useMemo(() => {
    return tagIdParam ? tagIdParam.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0) : [];
  }, [tagIdParam]);

  const activeFilterCount = (hashParam ? 1 : 0) + (activeTagIds.length > 0 ? activeTagIds.length : 0) + (folderSlug || folderIdParam ? 1 : 0) + (utmCampaignParam ? 1 : 0);

  const availableUrls = useMemo(() => {
    let list = urls;
    if (currentFolder && currentFolder.name.toLowerCase() !== 'links') {
      list = list.filter(u => u.folderId === currentFolder.id);
    } else if (folderIdParam) {
      list = list.filter(u => u.folderId === Number(folderIdParam));
    }
    if (activeTagIds.length > 0) {
      list = list.filter(u => u.tags?.some(t => activeTagIds.includes(t.id)));
    }
    return list;
  }, [urls, currentFolder, folderIdParam, activeTagIds]);

  const { campaigns: availableCampaigns } = useMemo(() => {
    return groupUrlsByCampaign(availableUrls as any);
  }, [availableUrls]);

  const compareParam = searchParams.get('compare');
  const analyticsMode: 'overview' | 'compare' = compareParam !== null ? 'compare' : 'overview';

  // Extract all traffic channels / sources across URLs belonging to currently compared campaigns
  const availableCompareSources = useMemo(() => {
    if (!compareParam) return [];
    const activeCamps = compareParam.split(',').map(c => c.trim().toLowerCase());
    const sourceSet = new Set<string>();
    availableUrls.forEach((u) => {
      const { campaign, source } = extractUtmParams(u.longUrl);
      if (campaign && activeCamps.includes(campaign.trim().toLowerCase()) && source) {
        sourceSet.add(source.trim());
      }
    });
    return Array.from(sourceSet).sort((a, b) => a.localeCompare(b));
  }, [compareParam, availableUrls]);

  const handleSetAnalyticsMode = (mode: 'overview' | 'compare') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (mode === 'compare') {
        const initial = availableCampaigns.slice(0, 2).map(c => c.campaignName);
        next.set('compare', initial.join(','));
      } else {
        next.delete('compare');
      }
      return next;
    });
  };

  const handleComparedCampaignsChange = useCallback((camps: string[]) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (next.get('compare') !== null) {
        next.set('compare', camps.join(','));
      }
      return next;
    });
  }, [setSearchParams]);

  const availableTags = useMemo(() => {
    let list = tags;
    if (currentFolder && currentFolder.name.toLowerCase() !== 'links') {
      const folderLinks = urls.filter(u => u.folderId === currentFolder.id);
      const tagIdsInFolder = new Set(folderLinks.flatMap(u => u.tags?.map(t => t.id) || []));
      list = list.filter(t => tagIdsInFolder.has(t.id));
    }
    if (hashParam) {
      const activeUrl = urls.find(u => extractHash(u.shortUrl).toLowerCase() === hashParam.toLowerCase());
      if (activeUrl) {
        const linkTagIds = new Set(activeUrl.tags?.map(t => t.id) || []);
        list = list.filter(t => linkTagIds.has(t.id));
      }
    }
    return list;
  }, [tags, urls, currentFolder, hashParam]);

  const availableFolders = useMemo(() => {
    let list = folders;
    if (activeTagIds.length > 0) {
      const matchingLinks = urls.filter(u => u.tags?.some(t => activeTagIds.includes(t.id)));
      const folderIdsWithTags = new Set(matchingLinks.map(u => u.folderId).filter(Boolean));
      list = list.filter(f => f.name.toLowerCase() === 'links' || folderIdsWithTags.has(f.id));
    }
    if (hashParam) {
      const activeUrl = urls.find(u => extractHash(u.shortUrl).toLowerCase() === hashParam.toLowerCase());
      if (activeUrl && activeUrl.folderId) {
        list = list.filter(f => f.name.toLowerCase() === 'links' || f.id === activeUrl.folderId);
      }
    }
    return list;
  }, [folders, urls, activeTagIds, hashParam]);

  type ChartType = 'area' | 'bar' | 'cumulative';
  const [chartType, setChartType] = useState<ChartType>('area');

  type UtmTab = 'campaign' | 'source' | 'medium' | 'term' | 'content' | 'referer';
  const [activeUtmTab, setActiveUtmTab] = useState<UtmTab>('campaign');
  const [utmViewMode, setUtmViewMode] = useState<'list' | 'chart'>('list');

  const totalClicks = data?.totalClicks || 0;
  const clicksByDate = data?.clicksByDate || [];
  const clicksByCountry = data?.clicksByCountry || [];
  const clicksByDevice = data?.clicksByDevice || [];
  const clicksByBrowser = data?.clicksByBrowser || [];
  const clicksByUtmSource = data?.clicksByUtmSource || [];
  const clicksByUtmMedium = data?.clicksByUtmMedium || [];
  const clicksByUtmCampaign = data?.clicksByUtmCampaign || [];
  const clicksByUtmTerm = data?.clicksByUtmTerm || [];
  const clicksByUtmContent = data?.clicksByUtmContent || [];
  const clicksByReferer = data?.clicksByReferer || [];

  const currentUtmList = useMemo(() => {
    switch (activeUtmTab) {
      case 'campaign': return clicksByUtmCampaign;
      case 'source': return clicksByUtmSource;
      case 'medium': return clicksByUtmMedium;
      case 'term': return clicksByUtmTerm;
      case 'content': return clicksByUtmContent;
      case 'referer': return clicksByReferer;
      default: return clicksByUtmCampaign;
    }
  }, [activeUtmTab, clicksByUtmCampaign, clicksByUtmSource, clicksByUtmMedium, clicksByUtmTerm, clicksByUtmContent, clicksByReferer]);

  const currentUtmTotal = useMemo(() => {
    return currentUtmList.reduce((acc, item) => acc + item.count, 0) || totalClicks || 1;
  }, [currentUtmList, totalClicks]);

  const chartData = useMemo(() => {
    if (!clicksByDate || clicksByDate.length === 0) return [];
    let runningTotal = 0;
    return clicksByDate.map((item) => {
      runningTotal += item.count;
      return {
        ...item,
        cumulative: runningTotal,
      };
    });
  }, [clicksByDate]);

  const peakActivity = useMemo(() => {
    if (!clicksByDate || clicksByDate.length === 0) return null;
    return clicksByDate.reduce((max, curr) => curr.count > max.count ? curr : max, clicksByDate[0]);
  }, [clicksByDate]);

  const formatXAxisTick = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'));
      if (isNaN(date.getTime())) return dateStr;
      if (dateRange.type === 'preset' && dateRange.value === '24h') {
        return format(date, 'h:mm a');
      }
      if (dateRange.type === 'preset' && (dateRange.value === '7d' || dateRange.value === '30d')) {
        return format(date, 'EEE, MMM d');
      }
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTooltipLabel = (label: any) => {
    const dateStr = typeof label === 'string' ? label : (label ? String(label) : '');
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'));
      if (isNaN(date.getTime())) return dateStr;
      if (dateRange.type === 'preset' && dateRange.value === '24h') {
        return format(date, 'EEE, MMM d, h:mm a');
      }
      return format(date, 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedLabel = formatTooltipLabel(label);
      const dataItem = payload[0].payload || {};
      const value = payload[0].value;

      return (
        <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-xl text-xs min-w-[150px]">
          <div className="text-muted-foreground pb-1.5 mb-2 border-b border-border font-medium">
            {formattedLabel}
          </div>
          {chartType === 'area' && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-foreground">
                <span className="w-2 h-2 rounded-full bg-[#0099ff] shrink-0" />
                <span>Clicks</span>
              </div>
              <span className="font-semibold text-foreground">
                {value?.toLocaleString()}
              </span>
            </div>
          )}
          {chartType === 'bar' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                  <span>Volume</span>
                </div>
                <span className="font-semibold text-foreground">
                  {value?.toLocaleString()}
                </span>
              </div>
              {totalClicks > 0 && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>Share of Total</span>
                  <span className="text-foreground font-medium">{Math.round((value / totalClicks) * 100)}%</span>
                </div>
              )}
            </div>
          )}
          {chartType === 'cumulative' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-[#818cf8] shrink-0" />
                  <span>Total Reach</span>
                </div>
                <span className="font-semibold text-foreground">
                  {(dataItem.cumulative ?? value)?.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>New in Period</span>
                <span className="text-primary font-medium">+{dataItem.count?.toLocaleString() || 0}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading && !data) {
    return (
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton width={250} height={28} />
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-background border border-border rounded-xl p-6 flex flex-col gap-1">
              <Skeleton width={120} height={16} />
              <div className="mt-2"><Skeleton width={80} height={36} /></div>
            </div>
          ))}
        </section>

        <div className="bg-background border border-border rounded-xl p-6 flex flex-col gap-4">
          <Skeleton width={140} height={20} />
          <Skeleton height={280} borderRadius={8} />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Skeleton width={120} height={20} />
              </div>
              <div className="p-4 flex flex-col gap-3">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} height={40} borderRadius={4} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </motion.main>
    );
  }

  if (error && !data) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-popover rounded-xl shadow-xl border border-border p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Error Loading Analytics</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn-solid w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        <div className="flex flex-col gap-4">
          {/* Action Bar with Filter Dropdown and Date Range Picker */}
          <div className="flex items-center gap-2">
            {analyticsMode !== 'compare' && (
              <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                  activeFilterCount > 0 
                    ? 'border-neutral-200/80 dark:border-[#27272A] bg-neutral-100 dark:bg-[#18181B] text-foreground shadow-sm hover:bg-neutral-200/60 dark:hover:bg-[#202024]' 
                    : 'bg-background border-input text-foreground hover:bg-secondary'
                }`}
              >
                <Filter className={`w-3.5 h-3.5 ${activeFilterCount > 0 ? 'text-[#0099ff]' : 'text-muted-foreground'}`} />
                Filter
                {activeFilterCount > 0 && <span className="bg-[#0099ff] text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold shadow-sm">{activeFilterCount}</span>}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-72 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[60] overflow-hidden"
                  >
                    {activeFilter === 'none' ? (
                      <div className="py-1 p-1">
                        <button 
                          onClick={() => { setActiveFilter('link'); setFilterSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <LinkIcon className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Link
                          </div>
                        </button>
                        <button 
                          onClick={() => { setActiveFilter('tag'); setFilterSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <Tag className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Tag
                          </div>
                        </button>
                        <button 
                          onClick={() => { setActiveFilter('folder'); setFilterSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <FolderIcon className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Folder
                          </div>
                        </button>
                        <button 
                          onClick={() => { setActiveFilter('campaign'); setFilterSearch(''); }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg transition-colors group"
                        >
                          <div className="flex items-center">
                            <Layers className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            Campaign
                          </div>
                        </button>
                      </div>
                    ) : activeFilter === 'link' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setFilterSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={filterSearch}
                              onChange={e => setFilterSearch(e.target.value)}
                              placeholder="Search links..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableUrls.filter(u => {
                            const h = extractHash(u.shortUrl).toLowerCase();
                            const l = (u.longUrl || '').toLowerCase();
                            const q = filterSearch.toLowerCase();
                            return h.includes(q) || l.includes(q);
                          }).map(u => {
                            const linkHash = extractHash(u.shortUrl);
                            const isSelected = hashParam === linkHash;
                            return (
                              <button
                                key={u.id || u.shortUrl}
                                onClick={() => {
                                  setSearchParams(prev => {
                                    const updated = new URLSearchParams(prev);
                                    updated.set('hash', linkHash);
                                    return updated;
                                  });
                                  setIsFilterOpen(false);
                                  setActiveFilter('none');
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate text-xs font-medium">/{linkHash}</span>
                                    <span className="truncate text-[10px] text-muted-foreground">{u.longUrl}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50">
                                  {u.accessed_times ?? 0} clicks
                                </span>
                              </button>
                            );
                          })}
                          {availableUrls.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">{isUrlsLoading ? 'Loading links...' : 'No links found'}</div>}
                        </div>
                      </>
                    ) : activeFilter === 'tag' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setFilterSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={filterSearch}
                              onChange={e => setFilterSearch(e.target.value)}
                              placeholder="Tag..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-48 overflow-y-auto">
                          {availableTags.filter(t => t.name.toLowerCase().includes(filterSearch.toLowerCase())).map(t => {
                            const activeIds = (tagIdParam || '').split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
                            const isChecked = activeIds.includes(t.id);
                            return (
                              <label key={t.id} className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114] rounded-lg cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        const updatedTagIds = isChecked 
                                          ? activeIds.filter(id => id !== t.id)
                                          : [...activeIds, t.id];
                                        
                                        setSearchParams(prev => {
                                          const next = new URLSearchParams(prev);
                                          if (updatedTagIds.length > 0) {
                                            next.set('tagId', updatedTagIds.join(','));
                                          } else {
                                            next.delete('tagId');
                                          }
                                          return next;
                                        });
                                      }}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                        isChecked 
                                          ? 'bg-[#0099ff] border-[#0099ff] text-white shadow-sm' 
                                          : 'border-border/80 bg-background/60 group-hover:border-muted-foreground'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <span 
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.color || '#374151' }}
                                  />
                                  <span className="truncate font-medium">{t.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                                  {t.linkCount ?? 0}
                                </span>
                              </label>
                            );
                          })}
                          {availableTags.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No tags found</div>}
                        </div>
                      </>
                    ) : activeFilter === 'folder' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setFilterSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={filterSearch}
                              onChange={e => setFilterSearch(e.target.value)}
                              placeholder="Search folders..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableFolders.filter(f => f.name.toLowerCase().includes(filterSearch.toLowerCase())).map(folder => {
                            const isDefault = folder.name.toLowerCase() === 'links';
                            const slug = folder.slug || encodeURIComponent(folder.name.toLowerCase().replace(/\s+/g, '-'));
                            const isSelected = folderSlug === slug || folderIdParam === String(folder.id);
                            return (
                              <button
                                key={folder.id}
                                onClick={() => {
                                  const query = searchParams.toString();
                                  navigate(`/analytics/f/${slug}${query ? `?${query}` : ''}`);
                                  setIsFilterOpen(false);
                                  setActiveFilter('none');
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderIcon className={`w-3.5 h-3.5 ${isDefault ? 'text-primary' : 'text-emerald-500'} shrink-0`} />
                                  <span className="truncate">{folder.name}</span>
                                </div>
                                {folder.linkCount !== undefined && (
                                  <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50">
                                    {folder.linkCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {availableFolders.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No folders found</div>}
                        </div>
                      </>
                    ) : activeFilter === 'campaign' ? (
                      <>
                        <div className="p-1.5 border-b border-border/80 bg-background/80 flex items-center gap-1">
                          <button 
                            onClick={() => { setActiveFilter('none'); setFilterSearch(''); }} 
                            className="p-1 hover:bg-neutral-100/70 dark:hover:bg-[#18181B] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative flex-1 flex items-center bg-secondary/40 rounded-md px-2 py-0.5 border border-border/40 focus-within:border-primary/50 transition-all">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={filterSearch}
                              onChange={e => setFilterSearch(e.target.value)}
                              placeholder="Search campaigns..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1 px-2 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableCampaigns.filter(c => 
                            c.campaignName.toLowerCase().includes(filterSearch.toLowerCase())
                          ).map(c => {
                            const isSelected = utmCampaignParam?.toLowerCase() === c.campaignName.toLowerCase();
                            return (
                              <button
                                key={c.campaignName}
                                onClick={() => {
                                  setSearchParams(prev => {
                                    const updated = new URLSearchParams(prev);
                                    updated.set('utm_campaign', c.campaignName);
                                    updated.delete('campaign');
                                    return updated;
                                  });
                                  setIsFilterOpen(false);
                                  setActiveFilter('none');
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-neutral-100/70 dark:hover:bg-[#111114]'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate font-medium text-xs text-foreground">{c.campaignName}</span>
                                    <span className="truncate text-[10px] text-muted-foreground">{c.links.length} {c.links.length === 1 ? 'channel' : 'channels'}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50">
                                  {c.totalClicks} clicks
                                </span>
                              </button>
                            );
                          })}
                          {availableCampaigns.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">{isUrlsLoading ? 'Loading campaigns...' : 'No campaigns found'}</div>}
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
            {analyticsMode === 'compare' && (
              <div className="relative" ref={compareFilterRef}>
                <button 
                  onClick={() => setIsCompareFilterOpen(!isCompareFilterOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    compareChannel 
                      ? 'border-primary/40 bg-primary/10 text-primary shadow-xs hover:bg-primary/15' 
                      : 'bg-background border-input text-foreground hover:bg-secondary'
                  }`}
                  title="Filter campaigns by channel / source"
                >
                  <Filter className={`w-3.5 h-3.5 ${compareChannel ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{compareChannel ? formatChannelName(compareChannel) : 'Filter'}</span>
                  {compareChannel && (
                    <span className="bg-[#0099ff] text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold shadow-xs">
                      1
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${isCompareFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isCompareFilterOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border p-1.5 z-[60] text-xs"
                    >
                      <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
                        Filter by Channel / Source
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareChannel(null);
                            setIsCompareFilterOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                            !compareChannel ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'
                          }`}
                        >
                          <span>All Channels</span>
                          {!compareChannel && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                        {availableCompareSources.map((source) => {
                          const isSelected = compareChannel?.toLowerCase() === source.toLowerCase();
                          return (
                            <button
                              key={source}
                              type="button"
                              onClick={() => {
                                setCompareChannel(source);
                                setIsCompareFilterOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'
                              }`}
                            >
                              <span className="truncate">{formatChannelName(source)}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          );
                        })}
                        {availableCompareSources.length === 0 && (
                          <div className="px-2.5 py-2 text-muted-foreground text-center text-xs">
                            No channels recorded
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <DateRangePicker value={dateRange} onChange={setDateRange} />

            {/* Overview vs Compare Mode Switcher */}
            <div className="relative flex items-center bg-secondary/50 dark:bg-[#121215] p-0.5 rounded-lg border border-border gap-0.5 ml-auto">
              {(['overview', 'compare'] as const).map((mode) => {
                const isActive = analyticsMode === mode;
                const label = mode === 'overview' ? 'Overview' : 'Compare';
                const Icon = mode === 'overview' ? BarChart2 : Layers;
                const iconColor = mode === 'overview' ? 'text-[#0099ff]' : 'text-[#818cf8]';

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSetAnalyticsMode(mode)}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeAnalyticsModeSegment"
                        className="absolute inset-0 bg-card rounded-md border border-border z-[-1] shadow-xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Compound Filter Pills */}
          {analyticsMode !== 'compare' && (hashParam || folderSlug || folderIdParam || activeTagIds.length > 0 || utmCampaignParam || activeUtmFilters.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {utmCampaignParam && (
                <div className="relative inline-flex items-center" ref={campaignPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <Layers className="w-3 h-3" />
                      Campaign
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsCampaignPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors max-w-[200px] truncate"
                    >
                      {utmCampaignParam}
                    </button>
                    <button 
                      type="button"
                      title="Clear Campaign filter"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSearchParams(prev => {
                          const updated = new URLSearchParams(prev);
                          updated.delete('utm_campaign');
                          updated.delete('utmCampaign');
                          updated.delete('campaign');
                          return updated;
                        });
                        setIsCampaignPillPopoverOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Campaign Popover Dropdown */}
                  <AnimatePresence>
                    {isCampaignPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-72 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1 border-b border-border">
                          <div className="relative flex items-center">
                            <Search className="w-3 h-3 text-muted-foreground ml-2" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={campaignPillSearch}
                              onChange={e => setCampaignPillSearch(e.target.value)}
                              placeholder="Search campaigns..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableCampaigns.filter(c => 
                            c.campaignName.toLowerCase().includes(campaignPillSearch.toLowerCase())
                          ).map(c => {
                            const isSelected = utmCampaignParam?.toLowerCase() === c.campaignName.toLowerCase();
                            return (
                              <button
                                key={c.campaignName}
                                onClick={() => {
                                  setSearchParams(prev => {
                                    const updated = new URLSearchParams(prev);
                                    updated.set('utm_campaign', c.campaignName);
                                    updated.delete('campaign');
                                    return updated;
                                  });
                                  setIsCampaignPillPopoverOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate font-medium text-xs text-foreground">{c.campaignName}</span>
                                    <span className="truncate text-[10px] text-muted-foreground">{c.links.length} {c.links.length === 1 ? 'channel' : 'channels'}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0">
                                  {c.totalClicks} clicks
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {hashParam && (
                <div className="relative inline-flex items-center" ref={linkPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <LinkIcon className="w-3 h-3" />
                      Link
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsLinkPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors"
                    >
                      /{hashParam}
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSearchParams(prev => {
                          const updated = new URLSearchParams(prev);
                          updated.delete('hash');
                          return updated;
                        });
                        if (hash) {
                          navigate(folderSlug ? `/analytics/f/${folderSlug}` : '/analytics');
                        }
                        setIsLinkPillPopoverOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Link Popover Dropdown */}
                  <AnimatePresence>
                    {isLinkPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-72 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1 border-b border-border">
                          <div className="relative flex items-center">
                            <Search className="w-3 h-3 text-muted-foreground ml-2" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={linkPillSearch}
                              onChange={e => setLinkPillSearch(e.target.value)}
                              placeholder="Search links..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableUrls.filter(u => {
                            const h = extractHash(u.shortUrl).toLowerCase();
                            const l = (u.longUrl || '').toLowerCase();
                            const q = linkPillSearch.toLowerCase();
                            return h.includes(q) || l.includes(q);
                          }).map(u => {
                            const linkHash = extractHash(u.shortUrl);
                            const isSelected = hashParam === linkHash;
                            return (
                              <button
                                key={u.id || u.shortUrl}
                                onClick={() => {
                                  setSearchParams(prev => {
                                    const updated = new URLSearchParams(prev);
                                    updated.set('hash', linkHash);
                                    return updated;
                                  });
                                  setIsLinkPillPopoverOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate text-xs font-medium">/{linkHash}</span>
                                    <span className="truncate text-[10px] text-muted-foreground">{u.longUrl}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0">
                                  {u.accessed_times ?? 0} clicks
                                </span>
                              </button>
                            );
                          })}
                          {availableUrls.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">{isUrlsLoading ? 'Loading links...' : 'No links found'}</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {(folderSlug || folderIdParam) && (
                <div className="relative inline-flex items-center" ref={folderPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <FolderIcon className="w-3 h-3" />
                      Folder
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsFolderPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors"
                    >
                      {currentFolder?.name || folderSlug || folderIdParam}
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete('folderId');
                        const query = next.toString();
                        if (folderSlug) {
                          if (hashParam) {
                            navigate(`/analytics/${hashParam}${query ? `?${query}` : ''}`);
                          } else {
                            navigate(`/analytics${query ? `?${query}` : ''}`);
                          }
                        } else {
                          setSearchParams(next);
                        }
                        setIsFolderPillPopoverOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Folder Popover Dropdown */}
                  <AnimatePresence>
                    {isFolderPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1 border-b border-border">
                          <div className="relative flex items-center">
                            <Search className="w-3 h-3 text-muted-foreground ml-2" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={folderPillSearch}
                              onChange={e => setFolderPillSearch(e.target.value)}
                              placeholder="Search folders..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableFolders.filter(f => f.name.toLowerCase().includes(folderPillSearch.toLowerCase())).map(folder => {
                            const isDefault = folder.name.toLowerCase() === 'links';
                            const slug = folder.slug || encodeURIComponent(folder.name.toLowerCase().replace(/\s+/g, '-'));
                            const isSelected = folderSlug === slug || folderIdParam === String(folder.id);
                            return (
                              <button
                                key={folder.id}
                                onClick={() => {
                                  const query = searchParams.toString();
                                  navigate(`/analytics/f/${slug}${query ? `?${query}` : ''}`);
                                  setIsFolderPillPopoverOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderIcon className={`w-3.5 h-3.5 ${isDefault ? 'text-primary' : 'text-emerald-500'} shrink-0`} />
                                  <span className="truncate">{folder.name}</span>
                                </div>
                                {folder.linkCount !== undefined && (
                                  <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0">
                                    {folder.linkCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {availableFolders.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No folders found</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {activeTagIds.length > 0 && (
                <div className="relative inline-flex items-center" ref={tagPillPopoverRef}>
                  <div className="inline-flex items-center h-7 rounded-md border border-border bg-secondary text-xs overflow-hidden divide-x divide-border">
                    <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                      <Tag className="w-3 h-3" />
                      Tag
                    </div>
                    <div className="flex items-center px-2 h-full bg-background text-muted-foreground font-medium">
                      is
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsTagPillPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground cursor-pointer hover:bg-background transition-colors"
                    >
                      {(() => {
                        const tagIds = activeTagIds;
                        if (tagIds.length === 1) {
                          const tag = tags.find(t => t.id === tagIds[0]);
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag?.color || '#374151' }} />
                              <span>{tag?.name || tagIds[0]}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <div className="flex items-center -space-x-1">
                              {tagIds.slice(0, 4).map(id => {
                                const tag = tags.find(t => t.id === id);
                                return (
                                  <span 
                                    key={id} 
                                    className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-background" 
                                    style={{ backgroundColor: tag?.color || '#374151' }} 
                                  />
                                );
                              })}
                            </div>
                            <span>{tagIds.length} Tags</span>
                          </span>
                        );
                      })()}
                    </button>
                    <button 
                      type="button"
                      className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                      onClick={() => {
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete('tagId');
                          return next;
                        });
                        setIsTagPillPopoverOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tag Popover Dropdown */}
                  <AnimatePresence>
                    {isTagPillPopoverOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg bg-popover border border-border divide-y divide-border focus:outline-none z-[70] overflow-hidden"
                      >
                        <div className="p-1 border-b border-border">
                          <div className="relative flex items-center">
                            <Search className="w-3 h-3 text-muted-foreground ml-2" />
                            <input 
                              type="text" 
                              autoFocus={true}
                              value={tagPillSearch}
                              onChange={e => setTagPillSearch(e.target.value)}
                              placeholder="Tag..." 
                              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-xs py-1.5 px-2.5 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="py-1 p-1 max-h-56 overflow-y-auto">
                          {availableTags.filter(t => t.name.toLowerCase().includes(tagPillSearch.toLowerCase())).map(t => {
                            const isChecked = activeTagIds.includes(t.id);
                            return (
                              <label
                                key={t.id}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer group ${isChecked ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="relative flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        let updatedTagIds: number[];
                                        if (isChecked) {
                                          updatedTagIds = activeTagIds.filter(id => id !== t.id);
                                        } else {
                                          updatedTagIds = [...activeTagIds, t.id];
                                        }
                                        setSearchParams(prev => {
                                          const next = new URLSearchParams(prev);
                                          if (updatedTagIds.length > 0) {
                                            next.set('tagId', updatedTagIds.join(','));
                                          } else {
                                            next.delete('tagId');
                                          }
                                          return next;
                                        });
                                      }}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                        isChecked 
                                          ? 'bg-[#0099ff] border-[#0099ff] text-white shadow-sm' 
                                          : 'border-border/80 bg-background/60 group-hover:border-muted-foreground'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <span 
                                    className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.color || '#374151' }}
                                  />
                                  <span className="truncate font-medium">{t.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium ml-2 shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                                  {t.linkCount ?? 0}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {activeUtmFilters.map((filter) => {
                const FilterIcon = filter.icon;
                return (
                  <div key={filter.key} className="relative inline-flex items-center">
                    <div className="inline-flex items-center h-7 rounded-md border border-primary/40 bg-primary/10 text-xs overflow-hidden divide-x divide-primary/30 shadow-xs">
                      <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-primary">
                        <FilterIcon className="w-3 h-3 text-primary shrink-0" />
                        <span>{filter.label}</span>
                      </div>
                      <div className="flex items-center px-2 h-full bg-background/80 text-muted-foreground font-medium">
                        is
                      </div>
                      <div className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground">
                        {filter.value}
                      </div>
                      <button 
                        type="button"
                        title={`Clear ${filter.label} filter`}
                        className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                        onClick={() => {
                          setSearchParams(prev => {
                            const updated = new URLSearchParams(prev);
                            updated.delete(filter.key);
                            updated.delete(filter.param);
                            return updated;
                          });
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {analyticsMode === 'compare' ? (
          <CampaignComparisonView
            availableCampaigns={availableCampaigns}
            dateRange={dateRange}
            initialCampaigns={compareParam ? compareParam.split(',').filter(Boolean) : undefined}
            onSelectedCampaignsChange={handleComparedCampaignsChange}
            selectedChannel={compareChannel}
            onSelectedChannelChange={setCompareChannel}
          />
        ) : (
          <>
            {/* Unified Master Card */}
        <div className={`bg-background border border-border rounded-xl overflow-hidden flex flex-col w-full transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          {/* Integrated Metric Header Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
            {/* Column 1: Clicks */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5 text-primary" /> Total Clicks
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                {totalClicks.toLocaleString()}
              </div>
            </div>

            {/* Column 2: Peak Activity */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Peak Traffic
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1 flex items-baseline gap-2">
                <span>{peakActivity ? peakActivity.count.toLocaleString() : 0}</span>
                {peakActivity && peakActivity.count > 0 && (
                  <span className="text-xs font-normal text-muted-foreground truncate">
                    ({formatXAxisTick(peakActivity.date)})
                  </span>
                )}
              </div>
            </div>

            {/* Column 3: Top Source */}
            <div className="p-4 sm:p-5 bg-background">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" /> Top Source
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
                {clicksByBrowser.length > 0 ? clicksByBrowser[0].browser : 'Direct / Organic'}
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="p-6 relative">
            {/* Chart Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                {chartType === 'area' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#0099ff]" />
                    <span>Traffic Velocity Timeline</span>
                  </>
                )}
                {chartType === 'bar' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                    <span>Period Volume Comparison</span>
                  </>
                )}
                {chartType === 'cumulative' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
                    <span>Cumulative Audience Trajectory</span>
                  </>
                )}
              </div>

              {/* Flat Modern Segmented Control Switcher */}
              <div className="relative flex items-center bg-secondary/50 dark:bg-[#121215] p-0.5 rounded-lg border border-border gap-0.5 self-start sm:self-auto">
                {(['area', 'bar', 'cumulative'] as const).map((type) => {
                  const isActive = chartType === type;
                  const label = type === 'area' ? 'Timeline' : type === 'bar' ? 'Volume' : 'Growth';
                  const Icon = type === 'area' ? Activity : type === 'bar' ? BarChart2 : Layers;
                  const iconColor = type === 'area' ? 'text-[#0099ff]' : type === 'bar' ? 'text-[#38bdf8]' : 'text-[#818cf8]';

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setChartType(type)}
                      className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeChartSegment"
                          className="absolute inset-0 bg-card rounded-md border border-border z-[-1]"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative w-full h-[300px] overflow-hidden">
              {chartData.length > 0 ? (
                <motion.div 
                  key={`${chartType}-${JSON.stringify(dateRange)}-${hashParam || 'all'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0099ff" stopOpacity={0.45}/>
                            <stop offset="65%" stopColor="#0099ff" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#0099ff" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717A', fontSize: 11 }} 
                          tickFormatter={formatXAxisTick}
                          minTickGap={40}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          content={<CustomTooltip />} 
                          cursor={{ stroke: '#0099ff', strokeWidth: 1.5, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#0099ff" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorClicks)" 
                          isAnimationActive={false}
                          activeDot={{ r: 5, fill: '#ffffff', stroke: '#0099ff', strokeWidth: 2 }} 
                        />
                      </AreaChart>
                    ) : chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#0099ff" stopOpacity={0.75}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717A', fontSize: 11 }} 
                          tickFormatter={formatXAxisTick}
                          minTickGap={40}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          content={<CustomTooltip />} 
                          cursor={{ fill: 'rgba(56, 189, 248, 0.08)', radius: 8 }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#colorBar)" 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={36}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45}/>
                            <stop offset="65%" stopColor="#818cf8" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717A', fontSize: 11 }} 
                          tickFormatter={formatXAxisTick}
                          minTickGap={40}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          content={<CustomTooltip />} 
                          cursor={{ stroke: '#818cf8', strokeWidth: 1.5, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="#818cf8" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorCumulative)" 
                          isAnimationActive={false}
                          activeDot={{ r: 5, fill: '#ffffff', stroke: '#818cf8', strokeWidth: 2 }} 
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </motion.div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl text-xs">
                  No data available for the selected period
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Breakdown Grids */}
        <section className={`space-y-6 transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          
          {/* Row 1: Top Countries, Devices, Browsers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Countries */}
            <div className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex items-center gap-2 bg-secondary/15">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-semibold text-xs text-foreground">Top Countries</h3>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
                {clicksByCountry.length > 0 ? (
                  clicksByCountry.slice(0, 6).map((country) => {
                    const pct = totalClicks > 0 ? Math.round((country.count / totalClicks) * 100) : 0;
                    return (
                      <div key={country.country} className="group flex items-center justify-between p-3 border-b border-dashed border-border last:border-b-0 hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all relative">
                        <div className="absolute left-0 top-0 bottom-0 bg-primary/10 dark:bg-primary/15 z-0 rounded-r-md transition-all" style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}></div>
                        <div className="flex items-center gap-2.5 z-10 min-w-0 pr-2">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-2 z-10 shrink-0 text-xs">
                          <span className="text-foreground font-semibold">{country.count.toLocaleString()}</span>
                          <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">No country data</div>
                )}
              </div>
            </div>

            {/* Devices */}
            <div className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/15">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-semibold text-xs text-foreground">Devices</h3>
                </div>
                {clicksByDevice.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {clicksByDevice.reduce((acc, d) => acc + d.count, 0)} total
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-center items-center min-h-[220px]">
                {clicksByDevice.length > 0 ? (
                  <DeviceDonutWheel data={clicksByDevice} totalClicks={totalClicks} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Monitor className="w-6 h-6 text-muted-foreground/40 mb-2" />
                    <span className="text-xs text-muted-foreground">No device data available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Browsers */}
            <div className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex items-center gap-2 bg-secondary/15">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-semibold text-xs text-foreground">Browsers</h3>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
                {clicksByBrowser.length > 0 ? (
                  clicksByBrowser.slice(0, 6).map((browser) => {
                    const pct = totalClicks > 0 ? Math.round((browser.count / totalClicks) * 100) : 0;
                    return (
                      <div key={browser.browser} className="group flex items-center justify-between p-3 border-b border-dashed border-border last:border-b-0 hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all relative">
                        <div className="absolute left-0 top-0 bottom-0 bg-primary/10 dark:bg-primary/15 z-0 rounded-r-md transition-all" style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}></div>
                        <div className="flex items-center gap-2.5 z-10 min-w-0 pr-2">
                          <div className="w-5 h-5 bg-secondary border border-border rounded flex items-center justify-center text-[10px] font-bold text-foreground uppercase shrink-0">
                            {browser.browser.substring(0, 1)}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">{browser.browser}</span>
                        </div>
                        <div className="flex items-center gap-2 z-10 shrink-0 text-xs">
                          <span className="text-foreground font-semibold">{browser.count.toLocaleString()}</span>
                          <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">No browser data</div>
                )}
              </div>
            </div>

          </div>

          {/* Row 2: UTM Campaign Performance (Whole box below) */}
          <div className="bg-background border border-border rounded-xl p-0 flex flex-col overflow-hidden shadow-xs">
            {/* Header row */}
            <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/15 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-foreground">Attribution & UTM Parameters</h3>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {currentUtmList.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                    {currentUtmList.reduce((acc, d) => acc + d.count, 0).toLocaleString()} total clicks
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSetAnalyticsMode('compare')}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors mr-1 cursor-pointer"
                  title="Compare campaigns side-by-side"
                >
                  <Layers className="w-3 h-3" />
                  <span>Compare Campaigns &rarr;</span>
                </button>
                {/* List / Visual Share View Mode Switcher */}
                <div className="flex items-center p-0.5 rounded-lg bg-secondary border border-border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setUtmViewMode('list')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      utmViewMode === 'list'
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="List breakdown"
                  >
                    <FileText className="w-3 h-3" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUtmViewMode('chart')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      utmViewMode === 'chart'
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Visual Share & Performance distribution"
                  >
                    <BarChart2 className="w-3 h-3" />
                    <span>Visual Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subheader row: Dedicated Tabs Section directly below Campaign Performance */}
            <div className="h-12 border-b border-border bg-background px-4 flex items-center overflow-x-auto scrollbar-none gap-1">
              {[
                { id: 'campaign', label: 'Campaign', icon: Layers },
                { id: 'source', label: 'Source', icon: Globe },
                { id: 'medium', label: 'Medium', icon: Radio },
                { id: 'term', label: 'Term', icon: Search },
                { id: 'content', label: 'Content', icon: FileText },
                { id: 'referer', label: 'Referral', icon: Gift },
              ].map((tab) => {
                const isActive = activeUtmTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveUtmTab(tab.id as UtmTab)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* UTM Content: List View or Comparative Bar Chart View */}
            {utmViewMode === 'chart' ? (
              <div className="p-4 sm:p-5 flex flex-col gap-4 min-h-[300px]">
                {currentUtmList.length > 0 ? (
                  <>
                    {/* ROI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-secondary/30 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Top Performer</div>
                          <div className="text-xs font-semibold text-foreground truncate">{currentUtmList[0]?.name || 'N/A'}</div>
                          <div className="text-[10px] text-muted-foreground">{currentUtmList[0]?.count.toLocaleString()} clicks ({Math.round((currentUtmList[0]?.count / currentUtmTotal) * 100)}%)</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-secondary/30 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Average / Channel</div>
                          <div className="text-xs font-semibold text-foreground">
                            {Math.round(currentUtmTotal / (currentUtmList.length || 1)).toLocaleString()} clicks
                          </div>
                          <div className="text-[10px] text-muted-foreground">across all {currentUtmList.length} channels</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-secondary/30 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Channel Breadth</div>
                          <div className="text-xs font-semibold text-foreground">{currentUtmList.length} Active {currentUtmList.length === 1 ? 'Source' : 'Sources'}</div>
                          <div className="text-[10px] text-muted-foreground">100% tracked conversion</div>
                        </div>
                      </div>
                    </div>

                    {/* Proportional Traffic Share Distribution Bar */}
                    {currentUtmList.length > 1 && currentUtmTotal > 0 && (
                      <div className="p-3 px-4 rounded-xl bg-secondary/20 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3 text-primary" /> Traffic Share Distribution
                          </span>
                          <span className="font-medium">{currentUtmTotal.toLocaleString()} total clicks</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
                          {currentUtmList.slice(0, 8).map((d, idx) => {
                            const pct = Math.round((d.count / currentUtmTotal) * 100);
                            if (d.count === 0) return null;
                            const color = COLORS[idx % COLORS.length];
                            return (
                              <div
                                key={`dist-${d.name}-${idx}`}
                                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                                className="h-full transition-all duration-300 hover:brightness-125 cursor-pointer"
                                title={`${d.name}: ${d.count} clicks (${pct}%)`}
                                onClick={() => {
                                  const paramKey = activeUtmTab === 'referer' ? 'utm_referer' : `utm_${activeUtmTab}`;
                                  const altKey = activeUtmTab === 'referer' ? 'referer' : `utm${activeUtmTab.charAt(0).toUpperCase() + activeUtmTab.slice(1)}`;
                                  setSearchParams(prev => {
                                    const updated = new URLSearchParams(prev);
                                    updated.set(paramKey, d.name);
                                    updated.delete(altKey);
                                    return updated;
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Comparative ROI Bar Chart */}
                    <div className="h-64 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={currentUtmList.slice(0, 8).map((d, i) => ({
                            ...d,
                            pct: Math.round((d.count / currentUtmTotal) * 100),
                            color: COLORS[i % COLORS.length]
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                        >
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'currentColor' }}
                            className="text-muted-foreground"
                            interval={0}
                            tickFormatter={(val) => val.length > 12 ? val.slice(0, 10) + '…' : val}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'currentColor' }}
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                return (
                                  <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-xl text-xs min-w-[160px]">
                                    <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-border font-semibold text-foreground">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <span>Volume</span>
                                      <span className="font-semibold text-foreground">{item.count.toLocaleString()} clicks</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground mt-1">
                                      <span>Share of Total</span>
                                      <span className="text-primary font-medium">{item.pct}%</span>
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                                      <span>Click to filter</span>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-secondary text-foreground">
                                        #{currentUtmList.findIndex(x => x.name === item.name) + 1}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            isAnimationActive={false}
                            onClick={(entry: any) => {
                              if (entry && typeof entry.name === 'string') {
                                const paramKey = activeUtmTab === 'referer' ? 'utm_referer' : `utm_${activeUtmTab}`;
                                const altKey = activeUtmTab === 'referer' ? 'referer' : `utm${activeUtmTab.charAt(0).toUpperCase() + activeUtmTab.slice(1)}`;
                                setSearchParams(prev => {
                                  const updated = new URLSearchParams(prev);
                                  updated.set(paramKey, entry.name as string);
                                  updated.delete(altKey);
                                  return updated;
                                });
                              }
                            }}
                            className="cursor-pointer"
                          >
                            {currentUtmList.slice(0, 8).map((_, index) => (
                              <Cell key={`roi-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
                    <BarChart2 className="w-7 h-7 text-muted-foreground/40 mb-2.5" />
                    <span className="text-xs text-muted-foreground font-medium">
                      No comparative data recorded for {activeUtmTab}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70 mt-1">
                      Clicks containing {activeUtmTab === 'referer' ? 'referrers' : `utm_${activeUtmTab}`} will be compared here
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-y-auto max-h-[360px] min-h-[220px]">
                {currentUtmList.length > 0 ? (
                  currentUtmList.slice(0, 10).map((item, idx) => {
                    const pct = Math.round((item.count / currentUtmTotal) * 100);
                    const currentActiveValue = 
                      activeUtmTab === 'source' ? utmSourceParam :
                      activeUtmTab === 'medium' ? utmMediumParam :
                      activeUtmTab === 'campaign' ? utmCampaignParam :
                      activeUtmTab === 'term' ? utmTermParam :
                      activeUtmTab === 'content' ? utmContentParam :
                      refererParam;

                    const isFiltered = currentActiveValue === item.name;
                    const paramKey = activeUtmTab === 'referer' ? 'utm_referer' : `utm_${activeUtmTab}`;
                    const altKey = activeUtmTab === 'referer' ? 'referer' : `utm${activeUtmTab.charAt(0).toUpperCase() + activeUtmTab.slice(1)}`;

                    return (
                      <div
                        key={item.name + idx}
                        onClick={() => {
                          setSearchParams(prev => {
                            const updated = new URLSearchParams(prev);
                            if (isFiltered) {
                              updated.delete(paramKey);
                              updated.delete(altKey);
                            } else {
                              updated.set(paramKey, item.name);
                              updated.delete(altKey);
                            }
                            return updated;
                          });
                        }}
                        title={isFiltered ? "Click to remove filter" : `Click to filter analytics by ${activeUtmTab}: ${item.name}`}
                        className={`group flex items-center justify-between p-3.5 border-b border-dashed border-border last:border-b-0 cursor-pointer transition-all relative overflow-hidden ${
                          isFiltered
                            ? 'bg-primary/10 dark:bg-primary/15 border-primary/40 shadow-xs'
                            : 'hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                        }`}
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 z-0 rounded-r-md transition-all duration-300 ${
                            isFiltered ? 'bg-primary/20 dark:bg-primary/25' : 'bg-primary/10 dark:bg-primary/15'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
                        />
                        <div className="flex items-center gap-3 z-10 min-w-0 pr-2">
                          <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-xs font-medium truncate ${isFiltered ? 'text-primary font-semibold' : 'text-foreground'}`}>
                              {item.name}
                            </span>
                            {isFiltered && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-medium">
                                <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 z-10 shrink-0 text-xs">
                          <span className={`font-semibold ${isFiltered ? 'text-primary' : 'text-foreground'}`}>{item.count.toLocaleString()}</span>
                          <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
                    <Target className="w-7 h-7 text-muted-foreground/40 mb-2.5" />
                    <span className="text-xs text-muted-foreground font-medium">
                      No {activeUtmTab} data recorded
                    </span>
                    <span className="text-[11px] text-muted-foreground/70 mt-1">
                      Clicks containing {activeUtmTab === 'referer' ? 'referrers' : `utm_${activeUtmTab}`} will appear here
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </section>
          </>
        )}
      </motion.main>
  );
};

export default AnalyticsPage;
