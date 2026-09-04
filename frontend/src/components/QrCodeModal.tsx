import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, Copy, Check, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker } from 'react-colorful';
import toast from 'react-hot-toast';
import { generateQrMatrix } from '../utils/qrMatrix';

export interface QrConfig {
  hasLogo: boolean;
  dotStyle: 'square' | 'dots' | 'diamonds';
  markerCenter: 'square' | 'round';
  markerBorder: 'square' | 'rounded' | 'circle';
  color: string;
  bgColor: string;
}

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl: string;
  hash?: string;
  initialConfig?: QrConfig;
  onSave?: (config: QrConfig) => void;
}

export type DotStyle = 'square' | 'dots' | 'diamonds';
export type MarkerCenter = 'square' | 'round';
export type MarkerBorder = 'square' | 'rounded' | 'circle';
export type ExportFormat = 'png' | 'jpeg' | 'svg';

const THEME_COLORS = [
  '#0099ff', // Framer electric blue (Site primary)
  '#ffffff', // Clean white
  '#000000', // Deep black
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#71717a', // Zinc
];

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  shortUrl,
  hash,
  initialConfig,
  onSave,
}) => {
  const isSiteDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const defaultPatternColor = isSiteDark ? '#ffffff' : '#000000';
  const defaultBgColor = isSiteDark ? '#000000' : '#ffffff';
  
  const [hasLogo, setHasLogo] = useState(initialConfig?.hasLogo ?? true);
  const [dotStyle, setDotStyle] = useState<DotStyle>(initialConfig?.dotStyle ?? 'diamonds');
  const [markerCenter, setMarkerCenter] = useState<MarkerCenter>(initialConfig?.markerCenter ?? 'round');
  const [markerBorder, setMarkerBorder] = useState<MarkerBorder>(initialConfig?.markerBorder ?? 'rounded');
  const [color, setColor] = useState<string>(initialConfig?.color ?? defaultPatternColor);
  const [bgColor, setBgColor] = useState<string>(initialConfig?.bgColor ?? defaultBgColor);
  const [activePicker, setActivePicker] = useState<'pattern' | 'bg' | null>(null);
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const qrSvgRef = useRef<SVGSVGElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close color picker or format dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
        setIsFormatMenuOpen(false);
      }
    };
    if (activePicker || isFormatMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePicker, isFormatMenuOpen]);

  // Generate 2D boolean module matrix
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(shortUrl || 'https://trim.ly/preview');
    } catch {
      return generateQrMatrix('https://trim.ly');
    }
  }, [shortUrl]);

  const size = matrix.length;

  const handleCopyImage = async () => {
    if (!qrSvgRef.current) return;
    try {
      const svgElement = qrSvgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const svgUrl = URLObj.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        URLObj.revokeObjectURL(svgUrl);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setIsCopied(true);
            toast.success('QR Code copied to clipboard');
            setTimeout(() => setIsCopied(false), 2000);
          } catch {
            toast.error('Failed to copy to clipboard');
          }
        }, 'image/png');
      };
      img.src = svgUrl;
    } catch {
      toast.error('Failed to copy QR code');
    }
  };

  const handleDownload = (format: ExportFormat) => {
    if (!qrSvgRef.current) return;
    setIsDownloading(true);
    setIsFormatMenuOpen(false);
    try {
      const svgElement = qrSvgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);

      if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${hash || 'code'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        toast.success('Downloaded SVG');
        return;
      }

      // PNG or JPEG
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const svgUrl = URLObj.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsDownloading(false);
          return;
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        URLObj.revokeObjectURL(svgUrl);

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';
        const dataUrl = canvas.toDataURL(mimeType, 0.95);

        const a = document.createElement('a');
        a.download = `qr-${hash || 'code'}.${fileExt}`;
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsDownloading(false);
        toast.success(`Downloaded ${format.toUpperCase()}`);
      };
      img.src = svgUrl;
    } catch {
      setIsDownloading(false);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        hasLogo,
        dotStyle,
        markerCenter,
        markerBorder,
        color,
        bgColor,
      });
    }
    toast.success('QR Code changes saved');
  };

  if (!isOpen) return null;

  // Finder pattern module checker
  const isFinderPattern = (x: number, y: number) => {
    if (x < 7 && y < 7) return true; // Top-Left
    if (x >= size - 7 && y < 7) return true; // Top-Right
    if (x < 7 && y >= size - 7) return true; // Bottom-Left
    return false;
  };

  // Center logo excavation area
  const isLogoExcavation = (x: number, y: number) => {
    if (!hasLogo) return false;
    const center = size / 2;
    const radius = size > 25 ? 3.5 : 2.5;
    return Math.abs(x + 0.5 - center) < radius && Math.abs(y + 0.5 - center) < radius;
  };

  // Render corner finder pattern marker
  const renderFinderPattern = (offsetX: number, offsetY: number, key: string) => {
    return (
      <g key={key} transform={`translate(${offsetX}, ${offsetY})`}>
        {/* Outer border (7x7) */}
        {markerBorder === 'square' && (
          <path
            d="M 0 0 H 7 V 7 H 0 Z M 1 1 V 6 H 6 V 1 Z"
            fill={color}
            fillRule="evenodd"
          />
        )}
        {markerBorder === 'rounded' && (
          <rect
            x="0.5"
            y="0.5"
            width="6"
            height="6"
            rx="1.75"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        )}
        {markerBorder === 'circle' && (
          <rect
            x="0.5"
            y="0.5"
            width="6"
            height="6"
            rx="3"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        )}

        {/* Inner center (3x3) */}
        {markerCenter === 'square' && (
          <rect
            x="2"
            y="2"
            width="3"
            height="3"
            rx="0.3"
            fill={color}
          />
        )}
        {markerCenter === 'round' && (
          <circle
            cx="3.5"
            cy="3.5"
            r="1.5"
            fill={color}
          />
        )}
      </g>
    );
  };

  const centerPos = size / 2;
  const logoBoxSize = size > 25 ? 6 : 5;

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="bg-background text-foreground border border-border rounded-xl shadow-lg w-full max-w-[390px] overflow-visible flex flex-col z-[201] relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <div>
              <h2 className="text-sm font-semibold text-foreground">QR Code</h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[280px] font-mono mt-0.5">
                {shortUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body */}
          <div ref={pickerRef} className="px-5 py-3 space-y-3 relative">
            
            {/* Live QR Preview Box */}
            <div className="w-full h-40 rounded-lg border border-dashed border-border bg-secondary/30 flex items-center justify-center relative overflow-hidden group">
              {/* Subtle Grid Canvas Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />

              {/* Centered QR Card (Flat, no 3D shadow) */}
              <div 
                className="rounded-lg p-2.5 border border-border flex items-center justify-center relative transition-colors shadow-none"
                style={{ backgroundColor: bgColor }}
              >
                <svg
                  ref={qrSvgRef}
                  viewBox={`0 0 ${size + 4} ${size + 4}`}
                  className="w-28 h-28"
                >
                  <rect
                    x="0"
                    y="0"
                    width={size + 4}
                    height={size + 4}
                    fill={bgColor}
                  />
                  <g transform="translate(2, 2)">
                    {/* Corner Finder Patterns */}
                    {renderFinderPattern(0, 0, 'tl')}
                    {renderFinderPattern(size - 7, 0, 'tr')}
                    {renderFinderPattern(0, size - 7, 'bl')}

                    {/* Data Modules */}
                    {matrix.map((row, y) =>
                      row.map((cell, x) => {
                        if (!cell) return null;
                        if (isFinderPattern(x, y)) return null;
                        if (isLogoExcavation(x, y)) return null;

                        // Style 1: Circles / Dots
                        if (dotStyle === 'dots') {
                          return (
                            <circle
                              key={`${x}-${y}`}
                              cx={x + 0.5}
                              cy={y + 0.5}
                              r="0.4"
                              fill={color}
                            />
                          );
                        }

                        // Style 2: Diamonds (Geometric Angled Tiles)
                        if (dotStyle === 'diamonds') {
                          return (
                            <polygon
                              key={`${x}-${y}`}
                              points={`${x + 0.5},${y + 0.08} ${x + 0.92},${y + 0.5} ${x + 0.5},${y + 0.92} ${x + 0.08},${y + 0.5}`}
                              fill={color}
                            />
                          );
                        }

                        // Style 3: Squares (Classic Cubes)
                        return (
                          <rect
                            key={`${x}-${y}`}
                            x={x + 0.06}
                            y={y + 0.06}
                            width="0.88"
                            height="0.88"
                            fill={color}
                          />
                        );
                      })
                    )}

                    {/* Center Brand Logo (Borderless cutout) */}
                    {hasLogo && (
                      <g transform={`translate(${centerPos - logoBoxSize / 2}, ${centerPos - logoBoxSize / 2})`}>
                        <rect
                          x="0"
                          y="0"
                          width={logoBoxSize}
                          height={logoBoxSize}
                          rx={logoBoxSize / 4}
                          fill={bgColor}
                        />
                        <image
                          href="/trim-logo.svg"
                          x={logoBoxSize * 0.12}
                          y={logoBoxSize * 0.12}
                          width={logoBoxSize * 0.76}
                          height={logoBoxSize * 0.76}
                        />
                      </g>
                    )}
                  </g>
                </svg>
              </div>

              {/* Floating Quick Action Icons (Top-Right) */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-md p-0.5">
                {/* Small Download Button with Format Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
                    title="Download QR Code (PNG, JPEG, SVG)"
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <ChevronDown className={`w-2.5 h-2.5 opacity-70 transition-transform ${isFormatMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Format Dropdown Menu */}
                  <AnimatePresence>
                    {isFormatMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        className="absolute top-full mt-1.5 right-0 bg-card border border-border rounded-lg shadow-lg p-1 w-28 z-50 flex flex-col gap-0.5"
                      >
                        {(['png', 'jpeg', 'svg'] as ExportFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => handleDownload(fmt)}
                            disabled={isDownloading}
                            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer text-foreground hover:bg-secondary"
                          >
                            <span>{fmt.toUpperCase()}</span>
                            <Download className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Copy Image Button */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  title="Copy Image to Clipboard"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Row 1: Logo & Dot Style */}
            <div className="grid grid-cols-2 gap-2">
              {/* Logo Switcher */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Logo</span>
                <div className="flex items-center p-0.5 bg-secondary/40 rounded-lg border border-border gap-0.5">
                  <button
                    type="button"
                    onClick={() => setHasLogo(true)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      hasLogo
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasLogo(false)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      !hasLogo
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    None
                  </button>
                </div>
              </div>

              {/* 3 Distinct Dot Styles */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Dot Style</span>
                <div className="flex items-center p-0.5 bg-secondary/40 rounded-lg border border-border gap-0.5">
                  {/* Style 1: Squares */}
                  <button
                    type="button"
                    onClick={() => setDotStyle('square')}
                    title="Squares"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      dotStyle === 'square'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                      <span className="bg-current rounded-[0.5px]" />
                      <span className="bg-current rounded-[0.5px]" />
                      <span className="bg-current rounded-[0.5px]" />
                      <span className="bg-current rounded-[0.5px]" />
                    </div>
                  </button>
                  {/* Style 2: Dots */}
                  <button
                    type="button"
                    onClick={() => setDotStyle('dots')}
                    title="Dots"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      dotStyle === 'dots'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                      <span className="bg-current rounded-full" />
                      <span className="bg-current rounded-full" />
                      <span className="bg-current rounded-full" />
                      <span className="bg-current rounded-full" />
                    </div>
                  </button>
                  {/* Style 3: Diamonds */}
                  <button
                    type="button"
                    onClick={() => setDotStyle('diamonds')}
                    title="Diamonds"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      dotStyle === 'diamonds'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                      <span className="bg-current rotate-45 scale-75" />
                      <span className="bg-current rotate-45 scale-75" />
                      <span className="bg-current rotate-45 scale-75" />
                      <span className="bg-current rotate-45 scale-75" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Marker Center & Marker Border */}
            <div className="grid grid-cols-2 gap-2">
              {/* Marker Center */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Marker Center</span>
                <div className="flex items-center p-0.5 bg-secondary/40 rounded-lg border border-border gap-0.5">
                  <button
                    type="button"
                    onClick={() => setMarkerCenter('square')}
                    title="Square center"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      markerCenter === 'square'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-3 h-3 border border-current rounded-[1px] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-current rounded-[0.5px]" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkerCenter('round')}
                    title="Round center"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      markerCenter === 'round'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-3 h-3 border border-current rounded-[1px] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-current rounded-full" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Marker Border */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Marker Border</span>
                <div className="flex items-center p-0.5 bg-secondary/40 rounded-lg border border-border gap-0.5">
                  <button
                    type="button"
                    onClick={() => setMarkerBorder('square')}
                    title="Square outer"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      markerBorder === 'square'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-3 h-3 border-2 border-current rounded-[1px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkerBorder('rounded')}
                    title="Rounded outer"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      markerBorder === 'rounded'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-3 h-3 border-2 border-current rounded-md" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkerBorder('circle')}
                    title="Circle outer"
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                      markerBorder === 'circle'
                        ? 'bg-primary text-white font-medium shadow-none'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-3 h-3 border-2 border-current rounded-full" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Colors (Pattern Color & Background Color with Modern Pickers) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 relative">
              
              {/* Pattern Color Selector */}
              <div className="space-y-1 relative">
                <span className="text-[11px] font-medium text-muted-foreground">Pattern Color</span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePicker(activePicker === 'pattern' ? null : 'pattern');
                    setIsFormatMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 bg-secondary/40 hover:bg-secondary/70 border border-border rounded-md w-full transition-colors cursor-pointer"
                >
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono font-medium text-foreground uppercase truncate">
                    {color}
                  </span>
                </button>

                {/* Pattern Color Popover */}
                <AnimatePresence>
                  {activePicker === 'pattern' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute z-50 bottom-full mb-2 left-0 p-3 bg-card border border-border rounded-lg shadow-lg space-y-2.5 w-[218px]"
                    >
                      <div className="modern-color-picker">
                        <HexColorPicker color={color} onChange={setColor} />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        {THEME_COLORS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setColor(hex)}
                            className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 transition-transform hover:scale-110 cursor-pointer ${
                              color.toLowerCase() === hex.toLowerCase()
                                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                                : ''
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Background Color Selector */}
              <div className="space-y-1 relative">
                <span className="text-[11px] font-medium text-muted-foreground">Background</span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePicker(activePicker === 'bg' ? null : 'bg');
                    setIsFormatMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 bg-secondary/40 hover:bg-secondary/70 border border-border rounded-md w-full transition-colors cursor-pointer"
                >
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0"
                    style={{ backgroundColor: bgColor }}
                  />
                  <span className="text-xs font-mono font-medium text-foreground uppercase truncate">
                    {bgColor}
                  </span>
                </button>

                {/* Background Color Popover */}
                <AnimatePresence>
                  {activePicker === 'bg' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute z-50 bottom-full mb-2 right-0 p-3 bg-card border border-border rounded-lg shadow-lg space-y-2.5 w-[218px]"
                    >
                      <div className="modern-color-picker">
                        <HexColorPicker color={bgColor} onChange={setBgColor} />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        {THEME_COLORS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setBgColor(hex)}
                            className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 transition-transform hover:scale-110 cursor-pointer ${
                              bgColor.toLowerCase() === hex.toLowerCase()
                                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                                : ''
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>

          {/* Footer Actions: Cancel and Save changes */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-secondary/20 relative">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save changes</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
