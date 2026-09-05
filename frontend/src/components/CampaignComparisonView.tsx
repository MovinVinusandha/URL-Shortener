import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Trophy, TrendingUp, Layers, Plus, X,
  Radio, Download, Activity, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import { toast } from 'react-hot-toast';
import type { DateRangeValue } from './DateRangePicker';
import { formatChannelName } from '../utils/utmExtractor';

export interface UtmDataPoint {
  name: string;
  count: number;
}

export interface AnalyticsData {
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

export const CAMPAIGN_COLORS = [
  { name: 'Blue', hex: '#0099ff', bg: 'bg-[#0099ff]', border: 'border-[#0099ff]', text: 'text-[#0099ff]', lightBg: 'bg-[#0099ff]/10' },
  { name: 'Indigo', hex: '#818cf8', bg: 'bg-[#818cf8]', border: 'border-[#818cf8]', text: 'text-[#818cf8]', lightBg: 'bg-[#818cf8]/10' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-[#10b981]', border: 'border-[#10b981]', text: 'text-[#10b981]', lightBg: 'bg-[#10b981]/10' },
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-[#f59e0b]', border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', lightBg: 'bg-[#f59e0b]/10' },
];

interface CampaignComparisonViewProps {
  availableCampaigns: { campaignName: string; links?: any[]; totalClicks?: number }[];
  dateRange: DateRangeValue;
  initialCampaigns?: string[];
  onSelectedCampaignsChange?: (campaigns: string[]) => void;
  selectedChannel?: string | null;
  onSelectedChannelChange?: (channel: string | null) => void;
}

export const CampaignComparisonView: React.FC<CampaignComparisonViewProps> = ({
  availableCampaigns,
  dateRange,
  initialCampaigns,
  onSelectedCampaignsChange,
  selectedChannel: controlledSelectedChannel,
  onSelectedChannelChange,
}) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(() => {
    if (initialCampaigns && initialCampaigns.length > 0) {
      return initialCampaigns.slice(0, 4);
    }
    if (availableCampaigns.length >= 2) {
      return [availableCampaigns[0].campaignName, availableCampaigns[1].campaignName];
    }
    if (availableCampaigns.length === 1) {
      return [availableCampaigns[0].campaignName];
    }
    return [];
  });

  const [dataMap, setDataMap] = useState<Record<string, AnalyticsData>>({});
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState<'daily' | 'volume' | 'cumulative'>('daily');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [internalSelectedChannel, setInternalSelectedChannel] = useState<string | null>(null);
  const selectedChannel = controlledSelectedChannel !== undefined ? controlledSelectedChannel : internalSelectedChannel;
  const setSelectedChannel = (val: string | null | ((prev: string | null) => string | null)) => {
    const nextVal = typeof val === 'function' ? val(selectedChannel) : val;
    if (controlledSelectedChannel !== undefined) {
      onSelectedChannelChange?.(nextVal);
    } else {
      setInternalSelectedChannel(nextVal);
    }
  };

  // Local cache across tab/range changes: `${dateKey}::${channelKey}::${campName}` -> AnalyticsData
  const cacheRef = React.useRef<Map<string, AnalyticsData>>(new Map());

  // Keep selectedCampaigns synchronized if initialCampaigns prop changes from URL
  const initialCampaignsKey = initialCampaigns ? initialCampaigns.join(',') : '';
  useEffect(() => {
    if (initialCampaigns && initialCampaigns.length > 0) {
      setSelectedCampaigns(prev => {
        const next = initialCampaigns.slice(0, 4);
        if (prev.join(',') === next.join(',')) return prev;
        return next;
      });
    }
  }, [initialCampaignsKey]);

  // Notify parent on change
  useEffect(() => {
    onSelectedCampaignsChange?.(selectedCampaigns);
  }, [selectedCampaigns, onSelectedCampaignsChange]);

  // Compute a stable date range cache key
  const dateKey = useMemo(() => {
    if (dateRange.type === 'preset') return `preset:${dateRange.value}`;
    return `custom:${format(dateRange.start, 'yyyyMMddHHmmss')}-${format(dateRange.end, 'yyyyMMddHHmmss')}`;
  }, [dateRange]);

  const channelKey = selectedChannel || 'all';

  // Fetch comparison data for each selected campaign with caching
  useEffect(() => {
    if (selectedCampaigns.length === 0) {
      setDataMap({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Check if any campaigns are missing from our in-memory cache
    const missingCampaigns = selectedCampaigns.filter(
      c => !cacheRef.current.has(`${dateKey}::${channelKey}::${c}`)
    );

    // If all are already cached, populate dataMap immediately with 0 delay / no loading skeleton
    if (missingCampaigns.length === 0) {
      const immediateMap: Record<string, AnalyticsData> = {};
      selectedCampaigns.forEach(c => {
        const cached = cacheRef.current.get(`${dateKey}::${channelKey}::${c}`);
        if (cached) immediateMap[c] = cached;
      });
      setDataMap(immediateMap);
      setLoading(false);
      return;
    }

    // Otherwise, show skeleton only if we have NO existing data for the selected campaigns
    const hasAnyData = selectedCampaigns.some(c => !!dataMap[c] || cacheRef.current.has(`${dateKey}::${channelKey}::${c}`));
    if (!hasAnyData) {
      setLoading(true);
    }

    const params: any = {};
    if (dateRange.type === 'preset') {
      params.period = dateRange.value;
    } else {
      params.startDate = format(dateRange.start, "yyyy-MM-dd'T'HH:mm:ss");
      params.endDate = format(dateRange.end, "yyyy-MM-dd'T'HH:mm:ss");
    }
    if (selectedChannel) {
      params.utmSource = selectedChannel;
    }

    const promises = selectedCampaigns.map(async (campName) => {
      const cacheLookup = `${dateKey}::${channelKey}::${campName}`;
      if (cacheRef.current.has(cacheLookup)) {
        return { campName, data: cacheRef.current.get(cacheLookup)! };
      }

      try {
        const res = await axiosInstance.get<AnalyticsData>('/analytics', {
          params: { ...params, utmCampaign: campName },
        });
        cacheRef.current.set(cacheLookup, res.data);
        return { campName, data: res.data };
      } catch (err) {
        console.error(`Failed to fetch analytics for campaign ${campName}`, err);
        const emptyData: AnalyticsData = {
          totalClicks: 0,
          clicksByDate: [],
          clicksByCountry: [],
          clicksByDevice: [],
          clicksByBrowser: [],
          clicksByUtmSource: [],
          clicksByUtmMedium: [],
        };
        return { campName, data: emptyData };
      }
    });

    Promise.all(promises).then((results) => {
      if (!isMounted) return;
      const nextMap: Record<string, AnalyticsData> = {};
      results.forEach((r) => {
        nextMap[r.campName] = r.data;
      });
      setDataMap(nextMap);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCampaigns, dateRange, dateKey, channelKey, selectedChannel]);

  const handleToggleCampaign = (name: string) => {
    if (selectedCampaigns.includes(name)) {
      if (selectedCampaigns.length <= 1) {
        toast.error('You must keep at least 1 campaign selected');
        return;
      }
      setSelectedCampaigns(prev => prev.filter(c => c !== name));
    } else {
      if (selectedCampaigns.length >= 4) {
        toast.error('You can compare up to 4 campaigns simultaneously');
        return;
      }
      setSelectedCampaigns(prev => [...prev, name]);
      setIsAddMenuOpen(false);
    }
  };

  // Derive Comparative Metrics & Winner
  const campaignSummaries = useMemo(() => {
    return selectedCampaigns.map((name, index) => {
      const data = dataMap[name];
      const color = CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length];
      const totalClicks = data?.totalClicks || 0;
      const dates = data?.clicksByDate || [];
      const numDays = Math.max(1, dates.length);
      const avgClicks = Math.round((totalClicks / numDays) * 10) / 10;
      
      let peakDay = { date: 'N/A', count: 0 };
      dates.forEach(d => {
        if (d.count > peakDay.count) {
          peakDay = { date: d.date, count: d.count };
        }
      });

      const topSource = (data?.clicksByUtmSource || [])[0] || null;
      const topMedium = (data?.clicksByUtmMedium || [])[0] || null;
      const topCountry = (data?.clicksByCountry || [])[0] || null;
      const topDevice = (data?.clicksByDevice || [])[0] || null;

      return {
        name,
        color,
        totalClicks,
        avgClicks,
        peakDay,
        topSource,
        topMedium,
        topCountry,
        topDevice,
      };
    });
  }, [selectedCampaigns, dataMap]);

  // Determine the leader in total clicks
  const maxClicks = useMemo(() => {
    return Math.max(...campaignSummaries.map(s => s.totalClicks), 0);
  }, [campaignSummaries]);

  const winnerCampaign = useMemo(() => {
    if (maxClicks <= 0) return null;
    const leaders = campaignSummaries.filter(s => s.totalClicks === maxClicks);
    return leaders.length === 1 ? leaders[0] : null;
  }, [campaignSummaries, maxClicks]);

  // Multi-Series Timeline Chart Data
  const unifiedChartData = useMemo(() => {
    const dateMapLookup: Record<string, Record<string, number>> = {};

    selectedCampaigns.forEach((campName) => {
      const dates = dataMap[campName]?.clicksByDate || [];
      let running = 0;
      dates.forEach((d) => {
        running += d.count;
        if (!dateMapLookup[d.date]) {
          dateMapLookup[d.date] = {};
        }
        dateMapLookup[d.date][campName] = chartMode === 'cumulative' ? running : d.count;
      });
    });

    const sortedDates = Object.keys(dateMapLookup).sort((a, b) => a.localeCompare(b));
    return sortedDates.map((date) => {
      const row: Record<string, any> = { date };
      selectedCampaigns.forEach((campName) => {
        row[campName] = dateMapLookup[date][campName] || 0;
      });
      return row;
    });
  }, [selectedCampaigns, dataMap, chartMode]);

  // Channel Breakdown Comparison Matrix
  const channelComparison = useMemo(() => {
    const channelMap: Record<string, { rawSource: string; campCounts: Record<string, number> }> = {};

    selectedCampaigns.forEach((campName) => {
      const sources = dataMap[campName]?.clicksByUtmSource || [];
      sources.forEach((s) => {
        const formatted = formatChannelName(s.name);
        if (!channelMap[formatted]) {
          channelMap[formatted] = { rawSource: s.name, campCounts: {} };
        }
        channelMap[formatted].campCounts[campName] = s.count;
      });
    });

    return Object.entries(channelMap)
      .map(([channel, data]) => {
        const total = Object.values(data.campCounts).reduce((a, b) => a + b, 0);
        return { channel, rawSource: data.rawSource, campCounts: data.campCounts, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [selectedCampaigns, dataMap]);

  // Export CSV Report
  const handleExportComparisonCsv = () => {
    if (selectedCampaigns.length === 0) return;
    const headers = ['Date', ...selectedCampaigns];
    const rows = unifiedChartData.map(d => [
      d.date,
      ...selectedCampaigns.map(c => d[c] || 0)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `campaign_comparison_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Comparison report exported');
  };

  if (availableCampaigns.length === 0) {
    return (
      <div className="bg-background border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground shadow-xs">
          <Layers className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">No Marketing Campaigns Available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create links with a <code className="text-primary font-mono font-medium">utm_campaign</code> tag or generate a multi-channel batch campaign to unlock side-by-side comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Campaign Selector Bar ───────────────────────────────── */}
      <div className="bg-background border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Comparing:
          </span>

          {selectedCampaigns.map((campName, idx) => {
            const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
            return (
              <div 
                key={campName}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs font-medium ${color.lightBg} ${color.border} ${color.text}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                <span className="truncate max-w-[140px] sm:max-w-[180px]">{campName}</span>
                {selectedCampaigns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleToggleCampaign(campName)}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title={`Remove ${campName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {selectedCampaigns.length < 4 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-solid hover:bg-secondary transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Campaign</span>
              </button>

              <AnimatePresence>
                {isAddMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-0 top-full mt-1.5 w-60 rounded-xl shadow-lg bg-popover border border-border p-1.5 z-50 text-xs"
                  >
                    <div className="px-2 py-1 border-b border-border mb-1">
                      <input
                        type="text"
                        value={campaignSearch}
                        onChange={(e) => setCampaignSearch(e.target.value)}
                        placeholder="Search campaign..."
                        className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {availableCampaigns
                        .filter(c => !selectedCampaigns.includes(c.campaignName))
                        .filter(c => c.campaignName.toLowerCase().includes(campaignSearch.toLowerCase()))
                        .map(c => (
                          <button
                            key={c.campaignName}
                            type="button"
                            onClick={() => handleToggleCampaign(c.campaignName)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-secondary transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{c.campaignName}</span>
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        ))}
                      {availableCampaigns.filter(c => !selectedCampaigns.includes(c.campaignName)).length === 0 && (
                        <div className="px-2.5 py-2 text-muted-foreground text-center">
                          All available campaigns added
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportComparisonCsv}
            disabled={loading || unifiedChartData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            title="Export Comparison CSV"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Channel Filter Pill */}
      {selectedChannel && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center h-7 rounded-md border border-primary/30 bg-primary/10 text-xs overflow-hidden divide-x divide-primary/20">
            <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-primary">
              <Radio className="w-3 h-3" />
              Channel
            </div>
            <div className="flex items-center px-2 h-full bg-background/50 text-muted-foreground font-medium">
              is
            </div>
            <div className="flex items-center gap-1 px-2.5 h-full font-medium text-foreground font-mono">
              {formatChannelName(selectedChannel)}
            </div>
            <button
              type="button"
              title="Clear channel filter"
              className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background/80 cursor-pointer transition-colors"
              onClick={() => setSelectedChannel(null)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Head-to-Head KPI Matrix ─────────────────────────────── */}
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(selectedCampaigns.length, 4)} gap-4`}>
        {campaignSummaries.map((summary) => {
          const isWinner = winnerCampaign?.name === summary.name;
          return (
            <div 
              key={summary.name}
              className={`bg-background border rounded-xl p-5 relative transition-all shadow-xs flex flex-col justify-between ${
                isWinner ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: summary.color.hex }} />
                    <h4 className="text-sm font-semibold text-foreground truncate" title={summary.name}>
                      {summary.name}
                    </h4>
                  </div>
                  {isWinner && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                      <Trophy className="w-3 h-3" />
                      Leader
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-4">
                  <div className="text-xs text-muted-foreground">Total Clicks</div>
                  {loading ? (
                    <Skeleton width={100} height={28} />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                        {summary.totalClicks.toLocaleString()}
                      </span>
                      {winnerCampaign && !isWinner && winnerCampaign.totalClicks > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          ({Math.round((summary.totalClicks / winnerCampaign.totalClicks) * 100)}% of leader)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Micro Stats Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed border-border text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Top Channel</span>
                    <span className="font-medium text-foreground truncate block">
                      {summary.topSource ? formatChannelName(summary.topSource.name) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Avg / Day</span>
                    <span className="font-medium text-foreground font-mono block">
                      {summary.avgClicks}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Top Country</span>
                    <span className="font-medium text-foreground truncate block">
                      {summary.topCountry ? summary.topCountry.country : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Top Device</span>
                    <span className="font-medium text-foreground truncate block">
                      {summary.topDevice ? summary.topDevice.device : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Multi-Series Comparative Chart ──────────────────────── */}
      <div className="bg-background border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Traffic Velocity Comparison
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click activity trajectories plotted across the selected timeframe
            </p>
          </div>

          <div className="relative flex items-center bg-secondary/50 dark:bg-[#121215] p-0.5 rounded-lg border border-border gap-0.5">
            {(['daily', 'volume', 'cumulative'] as const).map((mode) => {
              const isActive = chartMode === mode;
              const label = mode === 'daily' ? 'Timeline' : mode === 'volume' ? 'Volume' : 'Growth';
              const Icon = mode === 'daily' ? Activity : mode === 'volume' ? BarChart2 : Layers;
              const iconColor = mode === 'daily' ? 'text-[#0099ff]' : mode === 'volume' ? 'text-[#38bdf8]' : 'text-[#818cf8]';

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeComparisonChartSegment"
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

        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <Skeleton width="100%" height={260} />
          </div>
        ) : unifiedChartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
            No click activity recorded in this period for selected campaigns.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'volume' ? (
                <BarChart key={`volume-${selectedCampaigns.join(',')}`} data={unifiedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => {
                      try {
                        return format(parseISO(String(val)), 'MMM d');
                      } catch {
                        return String(val);
                      }
                    }}
                  />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.08)', radius: 6 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-xl p-3 shadow-xl text-xs space-y-2">
                            <div className="font-semibold text-foreground border-b border-dashed border-border pb-1">
                              {label ? format(parseISO(String(label)), 'EEEE, MMMM d, yyyy') : ''}
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-muted-foreground">{entry.name}:</span>
                                  </div>
                                  <span className="font-bold text-foreground font-mono">
                                    {entry.value?.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {selectedCampaigns.map((campName, idx) => {
                    const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
                    return (
                      <Bar
                        key={campName}
                        dataKey={campName}
                        name={campName}
                        fill={color.hex}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </BarChart>
              ) : (
                <AreaChart key={`${chartMode}-${selectedCampaigns.join(',')}`} data={unifiedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {selectedCampaigns.map((campName, idx) => {
                      const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
                      return (
                        <linearGradient key={campName} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color.hex} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={color.hex} stopOpacity={0.0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => {
                      try {
                        return format(parseISO(String(val)), 'MMM d');
                      } catch {
                        return String(val);
                      }
                    }}
                  />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-xl p-3 shadow-xl text-xs space-y-2">
                            <div className="font-semibold text-foreground border-b border-dashed border-border pb-1">
                              {label ? format(parseISO(String(label)), 'EEEE, MMMM d, yyyy') : ''}
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-muted-foreground">{entry.name}:</span>
                                  </div>
                                  <span className="font-bold text-foreground font-mono">
                                    {entry.value?.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {selectedCampaigns.map((campName, idx) => {
                    const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
                    return (
                      <Area
                        key={campName}
                        type="monotone"
                        dataKey={campName}
                        name={campName}
                        stroke={color.hex}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#grad-${idx})`}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Channel Attribution Matrix ──────────────────────────── */}
      <div className="bg-background border border-border rounded-xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            Channel Breakdown & Traffic Acquisition
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Side-by-side performance of inbound marketing sources across compared campaigns
          </p>
        </div>

        {channelComparison.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No channel/source data recorded for the selected campaigns.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dashed border-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Channel / Source</th>
                  {selectedCampaigns.map((c, i) => (
                    <th key={c} className="pb-2.5 font-medium text-right w-20 sm:w-24 px-2">
                      <div className="inline-flex items-center gap-1.5 justify-end w-full">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length].hex }} 
                        />
                        <span className="truncate max-w-[80px] sm:max-w-[90px]">{c}</span>
                      </div>
                    </th>
                  ))}
                  <th className="pb-2.5 font-medium text-right w-20 pl-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {channelComparison.map((row) => {
                  const isCurrentFilter = selectedChannel === row.rawSource;
                  return (
                    <tr 
                      key={row.channel} 
                      onClick={() => setSelectedChannel(prev => prev === row.rawSource ? null : row.rawSource)}
                      className={`cursor-pointer transition-colors ${
                        isCurrentFilter 
                          ? 'bg-primary/10 hover:bg-primary/15' 
                          : 'hover:bg-neutral-100/70 dark:hover:bg-[#111114]'
                      }`}
                      title={isCurrentFilter ? 'Click to clear filter' : `Click to filter by ${row.channel}`}
                    >
                      <td className="py-2.5 font-medium text-foreground flex items-center gap-1.5">
                        <span className="truncate">{row.channel}</span>
                        {isCurrentFilter && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-semibold">
                            Filtered
                          </span>
                        )}
                      </td>
                      {selectedCampaigns.map((c) => {
                        const count = row.campCounts[c] || 0;
                        return (
                          <td key={c} className="py-2.5 text-right font-mono text-foreground w-20 sm:w-24 px-2">
                            {count > 0 ? count.toLocaleString() : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-right font-mono font-semibold text-foreground w-20 pl-2">
                        {row.total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignComparisonView;
