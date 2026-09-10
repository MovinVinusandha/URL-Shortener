import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Play, 
  Pause, 
  Globe as GlobeIcon, 
  ListFilter, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  ExternalLink, 
  Layers, 
  Sparkles, 
  MapPin, 
  Compass, 
  Radio,
  Filter,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  Eye,
  TrendingUp,
  BarChart2,
  Percent
} from 'lucide-react';
import createGlobe from 'cobe';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import axiosInstance, { BASE_URL } from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { DateRangePicker, type DateRangeValue } from '../components/DateRangePicker';
import type { ClickEventDto, PaginatedEvents } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateString;
  }
}

function getDeviceIcon(device?: string) {
  const d = (device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) {
    return <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
  if (d.includes('tablet') || d.includes('ipad')) {
    return <Tablet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
  return <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function getCountryBadge(country?: string, city?: string) {
  if (!country || country === 'Unknown' || country === 'Local') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Compass className="w-3.5 h-3.5 opacity-60" />
        <span>{country || 'Unknown location'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 opacity-85" />
      <span className="truncate max-w-[180px]">
        {city && city !== 'Unknown' ? `${city}, ` : ''}{country}
      </span>
    </span>
  );
}

export type GlobeViewOption = 'analytics' | 'bars' | 'live';

export function isWithinDateRange(timestamp: string, dateRange: DateRangeValue): boolean {
  try {
    const eventTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (dateRange.type === 'preset') {
      switch (dateRange.value) {
        case '24h':
          return now - eventTime <= 24 * 60 * 60 * 1000;
        case '7d':
          return now - eventTime <= 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return now - eventTime <= 30 * 24 * 60 * 60 * 1000;
        case '90d':
          return now - eventTime <= 90 * 24 * 60 * 60 * 1000;
        case 'all':
          return true;
        default:
          return true;
      }
    } else if (dateRange.type === 'custom') {
      const start = dateRange.start.getTime();
      const end = dateRange.end.getTime();
      return eventTime >= start && eventTime <= end;
    }
  } catch {}
  return true;
}

// ── Country Coordinate Dictionary & Projection Math ─────────────────────────

export const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  'United States': [37.7749, -122.4194],
  'US': [37.7749, -122.4194],
  'USA': [37.7749, -122.4194],
  'United Kingdom': [51.5074, -0.1278],
  'UK': [51.5074, -0.1278],
  'Germany': [52.52, 13.405],
  'France': [48.8566, 2.3522],
  'Japan': [35.6762, 139.6503],
  'Canada': [45.4215, -75.6972],
  'Australia': [-33.8688, 151.2093],
  'India': [28.6139, 77.209],
  'Singapore': [1.3521, 103.8198],
  'Brazil': [-23.5505, -46.6333],
  'Netherlands': [52.3676, 4.9041],
  'Spain': [40.4168, -3.7038],
  'Italy': [41.9028, 12.4964],
  'Sri Lanka': [6.9271, 79.8612],
  'China': [39.9042, 116.4074],
  'South Korea': [37.5665, 126.978],
  'Sweden': [59.3293, 18.0686],
  'Switzerland': [46.8182, 8.2275],
  'Poland': [52.2297, 21.0122],
  'Mexico': [19.4326, -99.1332],
  'Argentina': [-34.6037, -58.3816],
  'South Africa': [-33.9249, 18.4241],
  'Ireland': [53.3498, -6.2603],
  'Norway': [59.9139, 10.7522],
  'Finland': [60.1699, 24.9384],
  'Denmark': [55.6761, 12.5683],
  'Belgium': [50.8503, 4.3517],
  'Austria': [48.2082, 16.3738],
  'New Zealand': [-41.2865, 174.7762],
  'Portugal': [38.7223, -9.1393],
  'Indonesia': [-6.2088, 106.8456],
  'Malaysia': [3.139, 101.6869],
  'United Arab Emirates': [25.2048, 55.2708],
  'UAE': [25.2048, 55.2708],
  'Turkey': [41.0082, 28.9784],
  'Vietnam': [21.0285, 105.8542],
  'Thailand': [13.7563, 100.5018],
};

export interface GlobeBadge {
  id: string;
  name: string;
  country: string;
  count: number;
  pct: number;
  lat: number;
  lon: number;
  isLive?: boolean;
  isPulse?: boolean;
}

/**
 * Projects a spherical coordinate [lat, lon] with globe rotation [phi, theta]
 * into normalized screen space coordinates (0..1) matching COBE's WebGL coordinate system.
 */
export function projectCoordinate(lat: number, lon: number, phi: number, theta: number) {
  const rLat = (lat * Math.PI) / 180;
  const rLon = (lon * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(rLat);
  const t = [-cosLat * Math.cos(rLon), Math.sin(rLat), cosLat * Math.sin(rLon)];
  
  const rElevation = 0.8 + 0.05;
  const pt = [t[0] * rElevation, t[1] * rElevation, t[2] * rElevation];

  const cosTheta = Math.cos(theta);
  const cosPhi = Math.cos(phi);
  const sinTheta = Math.sin(theta);
  const sinPhi = Math.sin(phi);

  const c = cosPhi * pt[0] + sinPhi * pt[2];
  const s = sinPhi * sinTheta * pt[0] + cosTheta * pt[1] - cosPhi * sinTheta * pt[2];
  const zVal = -sinPhi * cosTheta * pt[0] + sinTheta * pt[1] + cosPhi * cosTheta * pt[2];

  const isVisible = zVal > 0.02 && (c * c + s * s < 0.62);
  const opacity = Math.max(0, Math.min(1, (zVal - 0.02) / 0.12));

  return {
    xPct: (c + 1) / 2,
    yPct: (-s + 1) / 2,
    isVisible,
    opacity,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const EventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();

  // Mode: 'stream' (Dub Table) vs 'globe' (Sink 3D Visualizer)
  const [viewMode, setViewMode] = useState<'stream' | 'globe'>('stream');

  // 3 Globe View Options: 'analytics' (default), 'bars' (count as percentage), or 'live'
  const [globeBadgeOption, setGlobeBadgeOption] = useState<GlobeViewOption>('analytics');

  // Zoom Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Streaming & Live state
  const [isLive, setIsLive] = useState<boolean>(true);
  const [liveConnected, setLiveConnected] = useState<boolean>(false);
  const [recentLiveEvents, setRecentLiveEvents] = useState<ClickEventDto[]>([]);
  const [latestArrival, setLatestArrival] = useState<ClickEventDto | null>(null);

  // Historical table state
  const [events, setEvents] = useState<ClickEventDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(30);

  // Filter Bar state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ type: 'preset', value: '24h' });
  
  // Compound Filter Popover state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<'none' | 'device' | 'country' | 'link' | 'campaign'>('none');
  const [filterSearch, setFilterSearch] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Selected Filter Values
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const linkHashParam = searchParams.get('hash');

  // Selected event for detail drawer
  const [activeEvent, setActiveEvent] = useState<ClickEventDto | null>(null);

  // Globe Canvas and Animation References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<any>(null);
  const phiRef = useRef<number>(0);
  const thetaRef = useRef<number>(0.22);
  const focusTargetRef = useRef<{ phi: number; theta: number; expiresAt: number } | null>(null);

  // Mouse Drag & Touch Rotation References
  const isPointerDragging = useRef<boolean>(false);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerVelocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating HTML Badges DOM Refs
  const badgeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const topBadgesRef = useRef<GlobeBadge[]>([]);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
        setActiveFilterCategory('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── 1. Fetch Paginated Events ───────────────────────────────────────────────
  const fetchEvents = useCallback(async (pageToFetch = page) => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        page: pageToFetch,
        size: viewMode === 'globe' ? 100 : pageSize,
      };

      // Timeframe: Supports both preset (24h, 7d, 30d, all) and custom date ranges
      if (dateRange.type === 'preset') {
        params.period = dateRange.value;
      } else if (dateRange.type === 'custom') {
        params.startDate = format(dateRange.start, "yyyy-MM-dd'T'HH:mm:ss");
        params.endDate = format(dateRange.end, "yyyy-MM-dd'T'HH:mm:ss");
      }

      // Search
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      // Device filter
      if (selectedDevice !== 'all') {
        params.device = selectedDevice;
      }

      // Country filter
      if (selectedCountry) {
        params.country = selectedCountry;
      }

      // Link filter
      if (linkHashParam) {
        params.hash = linkHashParam;
      }

      const { data } = await axiosInstance.get<PaginatedEvents>('/analytics/events', { params });
      setEvents(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, dateRange, debouncedSearch, selectedDevice, selectedCountry, linkHashParam, viewMode]);

  useEffect(() => {
    fetchEvents(page);
  }, [fetchEvents, page, viewMode]);

  // Debounced search trigger: update debouncedSearch after 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── 2. Real-time SSE Connection ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) {
      setLiveConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    const streamUrl = `${BASE_URL}/analytics/events/stream${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
    
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      eventSource.onopen = () => {
        setLiveConnected(true);
      };

      eventSource.addEventListener('connected', () => {
        setLiveConnected(true);
      });

      eventSource.addEventListener('click-event', (e: MessageEvent) => {
        try {
          const newEvent: ClickEventDto = JSON.parse(e.data);
          
          // Prepend to live feed
          setRecentLiveEvents((prev) => [newEvent, ...prev.slice(0, 49)]);

          // Trigger real-time arrival visual & camera swivel
          setLatestArrival(newEvent);
          
          if (newEvent.latitude != null && newEvent.longitude != null) {
            const targetPhi = -(newEvent.longitude * Math.PI) / 180 + Math.PI;
            const targetTheta = (newEvent.latitude * Math.PI) / 180;

            focusTargetRef.current = {
              phi: targetPhi,
              theta: Math.max(-0.4, Math.min(0.4, targetTheta)),
              expiresAt: Date.now() + 4500,
            };
          }

          // Prepend to historical table if on first page and no search
          if (page === 0 && !searchQuery.trim()) {
            setEvents((prev) => [newEvent, ...prev.slice(0, pageSize - 1)]);
            setTotalElements((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Error parsing live event payload', err);
        }
      });

      eventSource.onerror = () => {
        setLiveConnected(false);
      };
    } catch (e) {
      console.warn('Failed to initiate SSE connection', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      setLiveConnected(false);
    };
  }, [isLive, page, pageSize]);

  // Auto-dismiss the arrival HUD chip after 4 seconds
  useEffect(() => {
    if (!latestArrival) return;
    const timer = setTimeout(() => {
      setLatestArrival(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [latestArrival]);

  // Filter in-memory live events to strictly respect active timeframe and filter pills
  const filteredLiveEvents = useMemo(() => {
    return recentLiveEvents.filter(ev => {
      if (!isWithinDateRange(ev.timestamp, dateRange)) return false;
      if (selectedDevice !== 'all' && (ev.device || 'Desktop').toLowerCase() !== selectedDevice.toLowerCase()) return false;
      if (selectedCountry && ev.country !== selectedCountry) return false;
      if (linkHashParam && ev.shortUrlHash !== linkHashParam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (ev.shortUrlHash || '').toLowerCase().includes(q) ||
          (ev.originalUrl || '').toLowerCase().includes(q) ||
          (ev.city || '').toLowerCase().includes(q) ||
          (ev.country || '').toLowerCase().includes(q) ||
          (ev.referer || '').toLowerCase().includes(q) ||
          (ev.device || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [recentLiveEvents, dateRange, selectedDevice, selectedCountry, linkHashParam, searchQuery]);

  // ── 3. Aggregate Real Traffic Data into Globe Markers & Floating Badges ───
  const { topBadges, globeMarkers } = useMemo(() => {
    const allEvents = [...filteredLiveEvents, ...events];
    const locationStats = new Map<string, { country: string; city?: string; lat: number; lon: number; count: number }>();
    let totalMappedVisits = 0;

    for (const ev of allEvents) {
      let lat = ev.latitude;
      let lon = ev.longitude;

      if ((lat == null || lon == null || isNaN(lat) || isNaN(lon)) && ev.country) {
        const fallback = COUNTRY_COORDINATES[ev.country];
        if (fallback) {
          lat = fallback[0];
          lon = fallback[1];
        }
      }

      if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
        const countryKey = ev.country && ev.country !== 'Unknown' && ev.country !== 'Local' ? ev.country : 'Global';
        const key = ev.city && ev.city !== 'Unknown' ? `${ev.city}, ${countryKey}` : countryKey;
        
        const existing = locationStats.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          locationStats.set(key, {
            country: countryKey,
            city: ev.city && ev.city !== 'Unknown' ? ev.city : undefined,
            lat,
            lon,
            count: 1,
          });
        }
        totalMappedVisits += 1;
      }
    }

    // Sort locations by visit volume descending
    const sortedLocations = Array.from(locationStats.entries())
      .map(([displayName, data]) => ({ displayName, ...data }))
      .sort((a, b) => b.count - a.count);

    // Map all unique active visitor locations for floating badges (ensures every mapped marker has its card)
    const topList: GlobeBadge[] = sortedLocations.map((item, idx) => ({
      id: `loc-badge-${idx}-${item.displayName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      name: (item.city || item.country).toUpperCase(),
      country: item.country,
      count: item.count,
      pct: totalMappedVisits > 0 ? Math.round((item.count / totalMappedVisits) * 100) : 100,
      lat: item.lat,
      lon: item.lon,
    }));

    // If a live visitor just arrived, render it firstly as signature "Pulse"
    if (latestArrival) {
      let lat = latestArrival.latitude;
      let lon = latestArrival.longitude;
      if ((lat == null || lon == null || isNaN(lat) || isNaN(lon)) && latestArrival.country) {
        const fallback = COUNTRY_COORDINATES[latestArrival.country];
        if (fallback) {
          lat = fallback[0];
          lon = fallback[1];
        }
      }
      if (lat != null && lon != null) {
        topList.unshift({
          id: `live-arrival-${latestArrival.id}`,
          name: (latestArrival.city && latestArrival.city !== 'Unknown' ? latestArrival.city : latestArrival.country || 'Live Visitor').toUpperCase(),
          country: latestArrival.country || 'Global',
          count: 1,
          pct: 100,
          lat,
          lon,
          isLive: true,
          isPulse: true,
        });
      }
    }

    // Pass markers to createGlobe
    const markers = sortedLocations.map(loc => ({
      location: [loc.lat, loc.lon] as [number, number],
      size: 0.045,
    }));

    if (latestArrival) {
      let lat = latestArrival.latitude;
      let lon = latestArrival.longitude;
      if ((lat == null || lon == null) && latestArrival.country) {
        const fallback = COUNTRY_COORDINATES[latestArrival.country];
        if (fallback) {
          lat = fallback[0];
          lon = fallback[1];
        }
      }
      if (lat != null && lon != null) {
        markers.push({
          location: [lat, lon] as [number, number],
          size: 0.08,
        });
      }
    }

    return { topBadges: topList, globeMarkers: markers };
  }, [filteredLiveEvents, events, latestArrival]);

  // Keep topBadgesRef synchronized for 60fps animation loop
  topBadgesRef.current = topBadges;

  // Available unique countries and links for filter dropdowns
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.country && e.country !== 'Unknown' && e.country !== 'Local') {
        set.add(e.country);
      }
    });
    return Array.from(set).sort();
  }, [events]);

  const availableLinks = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      if (e.shortUrlHash) {
        map.set(e.shortUrlHash, e.originalUrl);
      }
    });
    return Array.from(map.entries()).map(([hash, url]) => ({ hash, url }));
  }, [events]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDevice !== 'all') count++;
    if (selectedCountry) count++;
    if (selectedCampaign) count++;
    if (linkHashParam) count++;
    return count;
  }, [selectedDevice, selectedCountry, selectedCampaign, linkHashParam]);

  // ── 4. Pointer Drag & Touch Rotation Handlers ──────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDragging.current = true;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    pointerVelocity.current = { x: 0, y: 0 };
    focusTargetRef.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDragging.current) return;
    const dx = e.clientX - pointerStartPos.current.x;
    const dy = e.clientY - pointerStartPos.current.y;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };

    const speed = 0.005;
    phiRef.current += dx * speed;
    thetaRef.current = Math.max(-0.6, Math.min(0.6, thetaRef.current + dy * speed));
    pointerVelocity.current = { x: dx * speed, y: dy * speed };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  // ── 5. Initialize Cobe 3D Globe with Trim Monochrome Aesthetic ───────────────
  useEffect(() => {
    if (viewMode !== 'globe' || !canvasRef.current) return;

    let animId: number;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Signature Trim Monochrome Palette
    const baseColor: [number, number, number] = isDark ? [0.08, 0.08, 0.1] : [0.94, 0.94, 0.96];
    const glowColor: [number, number, number] = isDark ? [0.12, 0.22, 0.45] : [0.35, 0.55, 0.85];
    const markerColor: [number, number, number] = isDark ? [0, 0.6, 1.0] : [0, 0.55, 0.95];
    const mapBrightness = isDark ? 6.0 : 4.2;
    const diffuse = isDark ? 1.2 : 0.8;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 500 * 2,
      height: 500 * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: isDark ? 1 : 0,
      diffuse,
      mapSamples: 30000, // High-definition dot-matrix world map (mapSamples: 30000)
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      markers: globeMarkers,
    });

    globeRef.current = globe;

    const animate = () => {
      if (isPointerDragging.current) {
        // Dragging under mouse control
      } else if (Math.abs(pointerVelocity.current.x) > 0.0001 || Math.abs(pointerVelocity.current.y) > 0.0001) {
        // Momentum / inertia decay
        phiRef.current += pointerVelocity.current.x;
        thetaRef.current = Math.max(-0.6, Math.min(0.6, thetaRef.current + pointerVelocity.current.y));
        pointerVelocity.current.x *= 0.92;
        pointerVelocity.current.y *= 0.92;
      } else if (focusTargetRef.current && Date.now() < focusTargetRef.current.expiresAt) {
        // Swivel to incoming visitor
        let diffPhi = focusTargetRef.current.phi - phiRef.current;
        diffPhi = ((diffPhi + Math.PI) % (2 * Math.PI)) - Math.PI;
        phiRef.current += diffPhi * 0.05;
        thetaRef.current += (focusTargetRef.current.theta - thetaRef.current) * 0.05;
      } else if (isLive) {
        // Subtle constant ambient auto-rotation
        phiRef.current += 0.002;
        thetaRef.current += (0.22 - thetaRef.current) * 0.02;
      }

      globe.update({ phi: phiRef.current, theta: thetaRef.current });

      // Update projected 2D screen positions of floating cards
      for (const badge of topBadgesRef.current) {
        const el = badgeRefs.current[badge.id];
        if (el) {
          const pos = projectCoordinate(badge.lat, badge.lon, phiRef.current, thetaRef.current);
          el.style.left = `${pos.xPct * 100}%`;
          el.style.top = `${pos.yPct * 100}%`;
          el.style.opacity = pos.isVisible ? `${pos.opacity}` : '0';
          el.style.pointerEvents = pos.isVisible ? 'auto' : 'none';
          el.style.transform = `translate(-50%, -100%) translateY(-10px) scale(${pos.isVisible ? 1 : 0.85})`;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      globe.destroy();
    };
  }, [viewMode, theme, globeMarkers, isLive]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(1.4, prev + 0.15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.75, prev - 0.15));
  const handleResetOrientation = () => {
    setZoomLevel(1);
    thetaRef.current = 0.22;
    focusTargetRef.current = null;
    pointerVelocity.current = { x: 0, y: 0 };
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background text-foreground">
      
      {/* ── Top Filter & Control Toolbar ────────────────────────────────────── */}
      <div className="border-b border-border/60 bg-background px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Search, Filter Popover, Date Range */}
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex items-center bg-secondary/50 rounded-lg px-2.5 py-1.5 border border-border/70 focus-within:border-primary/60 focus-within:bg-background transition-all w-60 max-w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by slug, url, city..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Unified Filter Button */}
          <div className="relative" ref={filterRef}>
            <button 
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-border/90 bg-secondary text-foreground shadow-xs' 
                  : 'bg-background border-input text-foreground hover:bg-secondary'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold shadow-xs">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Filter Popover Menu */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-1.5 w-64 rounded-xl shadow-xl bg-popover border border-border/80 divide-y divide-border/60 focus:outline-none z-[60] overflow-hidden"
                >
                  {activeFilterCategory === 'none' ? (
                    <div className="p-1 space-y-0.5">
                      {/* Category: Device */}
                      <button 
                        type="button"
                        onClick={() => setActiveFilterCategory('device')}
                        className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-secondary/70 rounded-lg transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center">
                          <Monitor className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                          <span>Device Type</span>
                        </div>
                        {selectedDevice !== 'all' && (
                          <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md">
                            {selectedDevice}
                          </span>
                        )}
                      </button>

                      {/* Category: Country */}
                      <button 
                        type="button"
                        onClick={() => { setActiveFilterCategory('country'); setFilterSearch(''); }}
                        className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-secondary/70 rounded-lg transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center">
                          <MapPin className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                          <span>Country</span>
                        </div>
                        {selectedCountry && (
                          <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[90px]">
                            {selectedCountry}
                          </span>
                        )}
                      </button>

                      {/* Category: Link */}
                      <button 
                        type="button"
                        onClick={() => { setActiveFilterCategory('link'); setFilterSearch(''); }}
                        className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-foreground hover:bg-secondary/70 rounded-lg transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center">
                          <Layers className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                          <span>Short Link</span>
                        </div>
                        {linkHashParam && (
                          <span className="text-[10px] text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                            /{linkHashParam}
                          </span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {/* Submenu Header */}
                      <div className="p-2 border-b border-border/60 flex items-center justify-between bg-muted/20">
                        <button 
                          type="button"
                          onClick={() => setActiveFilterCategory('none')}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Back
                        </button>
                        <span className="text-xs font-semibold capitalize text-foreground">
                          {activeFilterCategory}
                        </span>
                        <div className="w-6" />
                      </div>

                      {/* Device Submenu */}
                      {activeFilterCategory === 'device' && (
                        <div className="p-1 space-y-0.5">
                          {['all', 'Desktop', 'Mobile', 'Tablet'].map((dev) => (
                            <button
                              key={dev}
                              type="button"
                              onClick={() => {
                                setSelectedDevice(dev);
                                setIsFilterOpen(false);
                                setActiveFilterCategory('none');
                                setPage(0);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                                selectedDevice === dev
                                  ? 'bg-secondary font-medium text-foreground'
                                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                              }`}
                            >
                              <span>{dev === 'all' ? 'All Devices' : dev}</span>
                              {selectedDevice === dev && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Country Submenu */}
                      {activeFilterCategory === 'country' && (
                        <div className="flex flex-col">
                          <div className="p-2 border-b border-border/60">
                            <input
                              type="text"
                              autoFocus={true}
                              placeholder="Search country..."
                              value={filterSearch}
                              onChange={(e) => setFilterSearch(e.target.value)}
                              className="w-full bg-secondary/50 rounded-md px-2 py-1 text-xs border border-border outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCountry(null);
                                setIsFilterOpen(false);
                                setActiveFilterCategory('none');
                                setPage(0);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary rounded-lg cursor-pointer"
                            >
                              All Countries
                            </button>
                            {availableCountries
                              .filter(c => c.toLowerCase().includes(filterSearch.toLowerCase()))
                              .map(country => (
                                <button
                                  key={country}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    setIsFilterOpen(false);
                                    setActiveFilterCategory('none');
                                    setPage(0);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                                    selectedCountry === country
                                      ? 'bg-secondary font-medium text-foreground'
                                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                  }`}
                                >
                                  <span className="truncate">{country}</span>
                                  {selectedCountry === country && <Check className="w-3.5 h-3.5 text-primary" />}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Link Submenu */}
                      {activeFilterCategory === 'link' && (
                        <div className="flex flex-col">
                          <div className="p-2 border-b border-border/60">
                            <input
                              type="text"
                              autoFocus={true}
                              placeholder="Search link hash..."
                              value={filterSearch}
                              onChange={(e) => setFilterSearch(e.target.value)}
                              className="w-full bg-secondary/50 rounded-md px-2 py-1 text-xs border border-border outline-none font-mono"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchParams(prev => {
                                  const u = new URLSearchParams(prev);
                                  u.delete('hash');
                                  return u;
                                });
                                setIsFilterOpen(false);
                                setActiveFilterCategory('none');
                                setPage(0);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary rounded-lg cursor-pointer"
                            >
                              All Links
                            </button>
                            {availableLinks
                              .filter(l => l.hash.toLowerCase().includes(filterSearch.toLowerCase()) || l.url.toLowerCase().includes(filterSearch.toLowerCase()))
                              .map(l => (
                                <button
                                  key={l.hash}
                                  type="button"
                                  onClick={() => {
                                    setSearchParams(prev => {
                                      const u = new URLSearchParams(prev);
                                      u.set('hash', l.hash);
                                      return u;
                                    });
                                    setIsFilterOpen(false);
                                    setActiveFilterCategory('none');
                                    setPage(0);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                                    linkHashParam === l.hash
                                      ? 'bg-secondary font-medium text-foreground'
                                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                  }`}
                                >
                                  <div className="flex flex-col text-left truncate">
                                    <span className="font-mono font-semibold text-foreground">/{l.hash}</span>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[170px]">{l.url}</span>
                                  </div>
                                  {linkHashParam === l.hash && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date Range Picker Component */}
          <DateRangePicker value={dateRange} onChange={(val) => { setDateRange(val); setPage(0); }} />
        </div>

        {/* Right: Globe Map Style Selector, Live Indicator, View Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Live Indicator Pill */}
          <button
            onClick={() => setIsLive(!isLive)}
            title={isLive ? 'Pause real-time stream' : 'Resume real-time stream'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isLive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
            </span>
            <span>{isLive ? 'Live' : 'Paused'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => fetchEvents(page)}
            disabled={isLoading}
            title="Refresh events"
            className="p-1.5 rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>



          {/* Segmented View Switcher */}
          <div className="flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border/70">
            <button
              onClick={() => setViewMode('stream')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'stream'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Stream</span>
            </button>
            <button
              onClick={() => setViewMode('globe')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'globe'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GlobeIcon className="w-3.5 h-3.5 text-primary" />
              <span>Globe 3D</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Compound Filter Pills ──────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="px-6 py-2 border-b border-border/40 bg-muted/10 flex flex-wrap items-center gap-2 shrink-0">
          {/* Device Pill */}
          {selectedDevice !== 'all' && (
            <div className="inline-flex items-center h-7 rounded-md border border-border/60 bg-secondary text-xs overflow-hidden divide-x divide-border/60">
              <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                <Monitor className="w-3 h-3" />
                <span>Device</span>
              </div>
              <div className="flex items-center px-2 h-full bg-background/60 text-muted-foreground font-medium">
                is
              </div>
              <div className="px-2.5 h-full flex items-center font-semibold text-foreground">
                {selectedDevice}
              </div>
              <button 
                type="button"
                onClick={() => { setSelectedDevice('all'); setPage(0); }}
                className="flex items-center justify-center px-1.5 h-full text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Country Pill */}
          {selectedCountry && (
            <div className="inline-flex items-center h-7 rounded-md border border-border/60 bg-secondary text-xs overflow-hidden divide-x divide-border/60">
              <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                <MapPin className="w-3 h-3" />
                <span>Country</span>
              </div>
              <div className="flex items-center px-2 h-full bg-background/60 text-muted-foreground font-medium">
                is
              </div>
              <div className="px-2.5 h-full flex items-center font-semibold text-foreground">
                {selectedCountry}
              </div>
              <button 
                type="button"
                onClick={() => { setSelectedCountry(null); setPage(0); }}
                className="flex items-center justify-center px-1.5 h-full text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Link Hash Pill */}
          {linkHashParam && (
            <div className="inline-flex items-center h-7 rounded-md border border-border/60 bg-secondary text-xs overflow-hidden divide-x divide-border/60">
              <div className="flex items-center gap-1.5 px-2.5 h-full font-medium text-foreground">
                <Layers className="w-3 h-3" />
                <span>Link</span>
              </div>
              <div className="flex items-center px-2 h-full bg-background/60 text-muted-foreground font-medium">
                is
              </div>
              <div className="px-2.5 h-full flex items-center font-mono font-semibold text-foreground">
                /{linkHashParam}
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSearchParams(prev => {
                    const u = new URLSearchParams(prev);
                    u.delete('hash');
                    return u;
                  });
                  setPage(0);
                }}
                className="flex items-center justify-center px-1.5 h-full text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Clear All Filters */}
          <button
            type="button"
            onClick={() => {
              setSelectedDevice('all');
              setSelectedCountry(null);
              setSearchParams(prev => {
                const u = new URLSearchParams(prev);
                u.delete('hash');
                return u;
              });
              setPage(0);
            }}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 ml-1 cursor-pointer transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Main Viewport Area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative flex">

        {/* MODE A: Stream Table View (Dub.co style) */}
        {viewMode === 'stream' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Table Container */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-muted/30 backdrop-blur border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-6">Event / Slug</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Referrer</th>
                    <th className="py-2.5 px-4">Campaign</th>
                    <th className="py-2.5 px-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {events.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Activity className="w-8 h-8 text-muted-foreground/40 stroke-1" />
                          <p className="text-xs font-medium text-foreground">No click events recorded</p>
                          <p className="text-[11px] text-muted-foreground max-w-xs">
                            Visits on your short links will stream here in real-time.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setActiveEvent(ev)}
                        className="group hover:bg-muted/30 dark:hover:bg-[#121215] cursor-pointer transition-colors"
                      >
                        {/* Short Link / Destination */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground font-mono group-hover:text-primary transition-colors">
                              /{ev.shortUrlHash}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                              ➔ {ev.originalUrl}
                            </span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4">
                          {getCountryBadge(ev.country, ev.city)}
                        </td>

                        {/* Device / Browser */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 text-foreground border border-border/40 text-[11px] font-medium">
                              {getDeviceIcon(ev.device)}
                              <span>{ev.device || 'Desktop'}</span>
                            </span>
                            {ev.browser && (
                              <span className="px-1.5 py-0.5 rounded-md bg-secondary/30 text-muted-foreground border border-border/30 text-[10px] font-mono">
                                {ev.browser}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Referrer */}
                        <td className="py-3 px-4">
                          <span className="text-muted-foreground truncate max-w-[130px] block font-mono text-[11px]">
                            {ev.referer ? ev.referer.replace(/^https?:\/\//, '') : '—'}
                          </span>
                        </td>

                        {/* UTM Campaign */}
                        <td className="py-3 px-4">
                          {ev.utmCampaign ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium max-w-[130px] truncate">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.utmCampaign}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>

                        {/* Relative Timestamp */}
                        <td className="py-3 px-6 text-right whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {formatRelativeTime(ev.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground shrink-0 bg-background">
              <span>Total events: {totalElements}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="p-1 rounded-md border border-border hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px]">
                  Page {page + 1} of {Math.max(1, Math.ceil(totalElements / pageSize))}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= totalElements || isLoading}
                  className="p-1 rounded-md border border-border hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODE B: Realtime 3D Globe View (Sink.cool style with INDEPENDENT PULSE SCROLL) */
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-210px)] min-h-[580px] max-h-[850px] overflow-hidden bg-background">
            
            {/* Left/Center: 3D WebGL Canvas Globe Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
              
              {/* Live Visitor Arrival HUD Chip (Slides down on new arrival) */}
              <AnimatePresence>
                {latestArrival && (
                  <motion.div
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.96 }}
                    className="absolute top-4 inset-x-0 mx-auto max-w-fit z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-popover/90 backdrop-blur-md border border-primary/40 shadow-xl text-xs font-medium"
                  >
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-foreground">
                      Incoming visit from <span className="font-semibold text-primary">{latestArrival.city && latestArrival.city !== 'Unknown' ? `${latestArrival.city}, ` : ''}{latestArrival.country || 'Global'}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/60">
                      /{latestArrival.shortUrlHash}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Minimal floating stats card (Sink.cool style) */}
              <div className="absolute top-4 left-6 z-10 flex flex-col gap-1 bg-card/80 backdrop-blur-md border border-border/70 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span>{isLive ? 'Live updates active' : 'Updates paused'}</span>
                </div>
                <div className="text-lg font-bold tracking-tight text-foreground">
                  {totalElements || events.length} <span className="text-xs font-normal text-muted-foreground">Visits</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                  <span>{globeMarkers.length} mapped</span>
                  <span>·</span>
                  <span className="text-primary font-medium">
                    {dateRange.type === 'preset' ? (
                      dateRange.value === '24h' ? 'Last 24h' :
                      dateRange.value === '7d' ? 'Last 7d' :
                      dateRange.value === '30d' ? 'Last 30d' :
                      dateRange.value === 'all' ? 'All time' : dateRange.value
                    ) : 'Custom range'}
                  </span>
                </div>
              </div>

              {/* Canvas Globe with Scale Animation, Drag Rotation & Interactive Floating Badges */}
              <div 
                className="relative w-full max-w-[500px] aspect-square flex items-center justify-center transition-transform duration-200 select-none touch-none cursor-grab active:cursor-grabbing"
                style={{ transform: `scale(${zoomLevel})` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%', maxWidth: '500px', aspectRatio: '1' }}
                  className="pointer-events-none"
                />

                {/* Floating Site Visitor Badges (COBE Official Default Look - cobe.vercel.app) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {topBadges.map((badge) => (
                    <div
                      key={badge.id}
                      ref={(el) => { badgeRefs.current[badge.id] = el; }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (badge.country) {
                          setSelectedCountry(badge.country);
                          setPage(0);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        opacity: 0,
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -100%) translateY(-10px)',
                        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                      }}
                      className="group cursor-pointer select-none"
                      title={badge.isLive ? `Live ping from ${badge.name}` : `Filter by ${badge.country} (${badge.count} visits)`}
                    >
                      {badge.isPulse ? (
                        /* Incoming Visitor Arrival: Signature Concentric Pulse Rings + COBE Badge */
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#000000d9] backdrop-blur-md border border-cyan-400 text-white shadow-2xl mb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                            </span>
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">PULSE</span>
                            <span className="text-white/40">·</span>
                            <span className="text-[11px] font-bold text-white uppercase">{badge.name}</span>
                          </div>
                          {/* Concentric expanding pulse wave */}
                          <div className="relative flex items-center justify-center w-10 h-10">
                            <span className="absolute inline-flex h-10 w-10 rounded-full bg-cyan-400/40 animate-ping" />
                            <span className="absolute inline-flex h-6 w-6 rounded-full border border-cyan-400/70 animate-pulse" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white ring-2 ring-cyan-500 shadow-[0_0_10px_#0099ff]" />
                          </div>
                        </div>
                      ) : globeBadgeOption === 'analytics' ? (
                        /* VIEW OPTION 1: "Analytics" (COBE Official Default Look - cobe.vercel.app) */
                        <div className="flex flex-col items-center">
                          <div className="flex flex-col px-2.5 py-1 rounded-[4px] bg-[#000000d9] backdrop-blur-md border border-white/15 hover:border-white/30 text-white shadow-2xl transition-all group-hover:scale-105 min-w-[90px]">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70 truncate">
                              {badge.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-bold text-white">
                                {badge.count} {badge.count === 1 ? 'visit' : 'visits'}
                              </span>
                              <span className="inline-flex items-center text-[10px] font-semibold text-[#34d399] font-mono">
                                ↑ {badge.pct}%
                              </span>
                            </div>
                          </div>
                          {/* Connector needle pin */}
                          <div className="w-[1.5px] h-2.5 bg-white/40 mx-auto" />
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-black shadow-[0_0_8px_#0099ff] mx-auto -mt-0.5" />
                        </div>
                      ) : globeBadgeOption === 'bars' ? (
                        /* VIEW OPTION 2: "Bars" (Count shown as percentage - COBE Official Default Look) */
                        <div className="flex flex-col items-center">
                          <div className="flex flex-col min-w-[110px] max-w-[150px] px-2.5 py-1.5 rounded-[4px] bg-[#000000d9] backdrop-blur-md border border-[#0099ff]/70 hover:border-[#0099ff] text-white shadow-2xl transition-all group-hover:scale-105">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-[9px] uppercase tracking-wider text-white truncate">
                                {badge.name}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-[#0099ff] shrink-0">
                                {badge.pct}%
                              </span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0099ff] rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(8, badge.pct)}%` }}
                              />
                            </div>
                          </div>
                          {/* Connector needle pin */}
                          <div className="w-[1.5px] h-2.5 bg-[#0099ff]/60 mx-auto" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0099ff] ring-2 ring-black shadow-[0_0_8px_#0099ff] mx-auto -mt-0.5" />
                        </div>
                      ) : (
                        /* VIEW OPTION 3: "Live Badge" (COBE Official Default Look) */
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#000000d9] backdrop-blur-md border border-white/20 hover:border-white/40 text-white shadow-2xl transition-all group-hover:scale-105">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-cyan-400">LIVE</span>
                            <span className="text-white/40">·</span>
                            <span className="truncate max-w-[120px] font-semibold text-white text-xs">{badge.name}</span>
                            <span className="font-mono text-[10px] text-white/60">· {badge.count}</span>
                          </div>
                          {/* Connector needle pin */}
                          <div className="w-[1.5px] h-2.5 bg-cyan-400/60 mx-auto" />
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-black shadow-[0_0_8px_#0099ff] mx-auto -mt-0.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Under-Globe Control Dock: 3 View Options (Analytics | Bars | Live Badge) + Zoom Controls */}
              <div className="absolute bottom-3 inset-x-0 mx-auto max-w-fit z-20 flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/90 p-1.5 rounded-2xl shadow-2xl">
                
                {/* 3 View Options Segmented Selector */}
                <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => setGlobeBadgeOption('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      globeBadgeOption === 'analytics'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                    title="Analytics view: counts and growth percentages"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span>Analytics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGlobeBadgeOption('bars')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      globeBadgeOption === 'bars'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                    title="Bars view: count shown as percentage"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    <span>Bars</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGlobeBadgeOption('live')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      globeBadgeOption === 'live'
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                    title="Live Badge view: realtime visitor beacons"
                  >
                    <Radio className="w-3.5 h-3.5 text-primary" />
                    <span>Live Badge</span>
                  </button>
                </div>

                <div className="w-[1px] h-5 bg-border/60 mx-0.5" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetOrientation}
                    title="Reset Orientation & Zoom"
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>{/* Right: Live Event Ticker Feed with INDEPENDENT SCROLL */}
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border/70 bg-card/40 flex flex-col h-full overflow-hidden">
              
              {/* Ticker Header */}
              <div className="p-3.5 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Recent Pulse
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/50">
                    {recentLiveEvents.length > 0 ? `${recentLiveEvents.length} live` : `${events.length} events`}
                  </span>
                </div>
              </div>

              {/* Ticker Scroll Area (Independently scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {(filteredLiveEvents.length > 0 ? filteredLiveEvents : events.slice(0, 30)).map((ev) => {
                  const isIncoming = latestArrival && latestArrival.id === ev.id;
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setActiveEvent(ev)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                        isIncoming
                          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40 shadow-sm'
                          : 'border-border/60 bg-card hover:border-primary/40 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-semibold text-foreground">
                          /{ev.shortUrlHash}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatRelativeTime(ev.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                        <MapPin className="w-3 h-3 text-primary shrink-0 opacity-80" />
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {ev.country && ev.country !== 'Unknown' ? `${ev.city && ev.city !== 'Unknown' ? `${ev.city}, ` : ''}${ev.country}` : 'Unknown Location'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                        <span className="truncate max-w-[150px]">{ev.browser || 'Unknown'} · {ev.os || ev.device || 'Desktop'}</span>
                        <span className="truncate max-w-[90px] font-mono">{ev.referer ? ev.referer.replace(/^https?:\/\//, '') : 'Direct'}</span>
                      </div>
                    </motion.div>
                  );
                })}

                {events.length === 0 && (
                  <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Radio className="w-5 h-5 text-muted-foreground animate-pulse" />
                    <span>Listening for incoming visitor clicks...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Slide-over Event Details Drawer (Dub Style) ────────────────────── */}
        <AnimatePresence>
          {activeEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
              onClick={() => setActiveEvent(null)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-background border-l border-border/80 h-full flex flex-col shadow-2xl p-6 overflow-y-auto"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6 shrink-0">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">Event Details</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      ID #{activeEvent.id} · {new Date(activeEvent.timestamp).toUTCString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveEvent(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Link Summary Card */}
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Link
                    </span>
                    <a
                      href={activeEvent.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs font-medium"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="font-mono text-sm font-semibold text-foreground mb-1">
                    /{activeEvent.shortUrlHash}
                  </div>
                  <p className="text-xs text-muted-foreground break-all">
                    {activeEvent.originalUrl}
                  </p>
                </div>

                {/* Audit Grid Details */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    
                    {/* Location Box */}
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Location
                      </span>
                      <div className="font-medium text-foreground">
                        {activeEvent.city || 'Unknown'}, {activeEvent.country || 'Unknown'}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {activeEvent.latitude != null && activeEvent.longitude != null 
                          ? `${activeEvent.latitude.toFixed(2)}°, ${activeEvent.longitude.toFixed(2)}°` 
                          : 'Coordinates unavailable'}
                      </span>
                    </div>

                    {/* Client Device Box */}
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Client
                      </span>
                      <div className="font-medium text-foreground">
                        {activeEvent.browser || 'Unknown'} · {activeEvent.os || 'Unknown'}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Class: {activeEvent.device || 'Desktop'}
                      </span>
                    </div>

                    {/* Referrer Box */}
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Referrer
                      </span>
                      <div className="font-mono text-foreground truncate" title={activeEvent.referer || 'Direct'}>
                        {activeEvent.referer || 'Direct / None'}
                      </div>
                    </div>

                    {/* Privacy Hashed IP Box */}
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Hashed IP (Privacy)
                      </span>
                      <div className="font-mono text-muted-foreground text-[11px] truncate">
                        {activeEvent.ipAddress ? `${activeEvent.ipAddress.substring(0, 16)}...` : 'Anonymized'}
                      </div>
                    </div>
                  </div>

                  {/* UTM Parameters (if any) */}
                  {(activeEvent.utmSource || activeEvent.utmMedium || activeEvent.utmCampaign) && (
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20 space-y-1.5 text-xs">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        UTM Campaign Tags
                      </span>
                      {activeEvent.utmCampaign && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-mono">utm_campaign:</span>
                          <span className="font-semibold text-foreground">{activeEvent.utmCampaign}</span>
                        </div>
                      )}
                      {activeEvent.utmSource && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-mono">utm_source:</span>
                          <span className="font-semibold text-foreground">{activeEvent.utmSource}</span>
                        </div>
                      )}
                      {activeEvent.utmMedium && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-mono">utm_medium:</span>
                          <span className="font-semibold text-foreground">{activeEvent.utmMedium}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Raw JSON Audit Payload */}
                <div className="mt-auto">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Raw Event JSON
                  </span>
                  <pre className="p-3 rounded-lg border border-border/50 bg-muted/40 font-mono text-[10px] text-muted-foreground overflow-x-auto select-all max-h-40">
                    {JSON.stringify(activeEvent, null, 2)}
                  </pre>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default EventsPage;
