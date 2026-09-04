import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Copy, Download, BarChart2, Check, QrCode, 
  Edit2, Trash2, CornerDownRight, Trophy, Lock, MoreVertical, XCircle,
  Folder as FolderIcon, Tag, Clock, FolderInput, Tags, AlertTriangle, Loader2, Power, X
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import ClickArrowIcon from './icons/ClickArrowIcon';
import type { CampaignGroup } from '../utils/utmExtractor';
import { extractUtmParams, formatChannelName } from '../utils/utmExtractor';
import type { UrlEntry } from '../types';
import axiosInstance from '../api/axiosInstance';

interface Folder {
  id: number;
  name: string;
  slug?: string;
}

interface TagItem {
  id: number;
  name: string;
  color?: string;
}

interface DisplayProperties {
  destinationUrl?: boolean;
  tags?: boolean;
  clicks?: boolean;
  createdAt?: boolean;
  campaignCreatedAt?: boolean;
  status?: boolean;
  password?: boolean;
}

interface CampaignGroupCardProps {
  campaign: CampaignGroup;
  displayDomain: string;
  protocol: string;
  displayProps?: DisplayProperties;
  onOpenQr: (hash: string) => void;
  onEditUrl?: (url: UrlEntry) => void;
  onDeleteUrl?: (url: UrlEntry) => void;
  initialExpanded?: boolean;
  folders?: Folder[];
  tags?: TagItem[];
  onRefresh?: () => void;
}

const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

export const CampaignGroupCard: React.FC<CampaignGroupCardProps> = ({
  campaign,
  displayDomain,
  protocol,
  displayProps = { destinationUrl: true, tags: true, clicks: true, createdAt: true, campaignCreatedAt: false, status: true, password: true },
  onOpenQr,
  onEditUrl,
  onDeleteUrl,
  initialExpanded = false,
  folders = [],
  tags = [],
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Bulk Action Modals State
  const [isMoveFolderModalOpen, setIsMoveFolderModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const [isAssignTagsModalOpen, setIsAssignTagsModalOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [isSetExpirationModalOpen, setIsSetExpirationModalOpen] = useState(false);
  const [expirationOption, setExpirationOption] = useState<'never' | '24h' | '7d' | '30d' | 'custom'>('never');
  const [customExpirationDate, setCustomExpirationDate] = useState('');

  const [isDeleteCampaignModalOpen, setIsDeleteCampaignModalOpen] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const isAnyMenuOpen = isHeaderMenuOpen || openItemMenuId !== null;

  const handleCopyAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsHeaderMenuOpen(false);
    const lines = campaign.links.map(u => {
      const utms = extractUtmParams(u.longUrl);
      const chan = formatChannelName(utms.source, utms.medium);
      const short = `${protocol}//${displayDomain}/${extractHash(u.shortUrl)}`;
      return `${chan}: ${short}`;
    });

    const fullText = `Campaign: ${campaign.campaignName}\n` + lines.join('\n');
    navigator.clipboard.writeText(fullText);
    toast.success(`Copied all ${campaign.links.length} campaign links`);
  };

  const handleExportCsv = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsHeaderMenuOpen(false);
    const rows = [
      ['Campaign', 'Channel', 'UTM Source', 'UTM Medium', 'Short URL', 'Clicks', 'Destination URL', 'Created At'],
      ...campaign.links.map(u => {
        const utms = extractUtmParams(u.longUrl);
        const chan = formatChannelName(utms.source, utms.medium);
        const short = `${protocol}//${displayDomain}/${extractHash(u.shortUrl)}`;
        return [
          `"${campaign.campaignName.replace(/"/g, '""')}"`,
          `"${chan.replace(/"/g, '""')}"`,
          `"${(utms.source || '').replace(/"/g, '""')}"`,
          `"${(utms.medium || '').replace(/"/g, '""')}"`,
          `"${short}"`,
          u.accessed_times || 0,
          `"${u.longUrl.replace(/"/g, '""')}"`,
          `"${new Date(u.createdAt).toISOString()}"`,
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaign.campaignName}_campaign_links.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported CSV for "${campaign.campaignName}"`);
  };

  const executeBulkAction = async (action: string, payload: any = {}) => {
    setIsBulkSubmitting(true);
    try {
      const hashes = campaign.links.map(u => extractHash(u.shortUrl));
      const res = await axiosInstance.post('/url/bulk-action', {
        hashes,
        action,
        ...payload,
      });
      toast.success(res.data?.message || `Successfully executed ${action}`);
      if (onRefresh) onRefresh();
      setIsMoveFolderModalOpen(false);
      setIsAssignTagsModalOpen(false);
      setIsSetExpirationModalOpen(false);
      setIsDeleteCampaignModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to perform ${action}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className={`bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-visible transition-all hover:border-zinc-300 dark:hover:border-zinc-700 relative ${isAnyMenuOpen ? 'z-30' : 'z-10'}`}>
      {/* Campaign Overview Row - Clicking anywhere toggles expansion */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3.5 cursor-pointer transition-colors select-none first:rounded-t-xl ${isExpanded ? 'rounded-t-xl bg-neutral-100/50 dark:bg-[#141417] hover:bg-neutral-100/80 dark:hover:bg-[#18181c]' : 'rounded-xl bg-background hover:bg-neutral-100/60 dark:hover:bg-[#151518]'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Round icon with gray border in dark mode */}
          <div className="w-9 h-9 rounded-full bg-secondary border border-zinc-200 dark:border-zinc-800 text-foreground flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] sm:text-base font-semibold text-foreground truncate">
                {campaign.campaignName}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-zinc-200 dark:border-zinc-800">
                {campaign.links.length} {campaign.links.length === 1 ? 'Channel' : 'Channels'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>
                Created {new Date(campaign.earliestCreatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {campaign.topChannel && campaign.totalClicks > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500 dark:text-amber-400">
                    <Trophy className="w-3 h-3 shrink-0" />
                    Top: {campaign.topChannel.name} ({campaign.topChannel.clicks} clicks)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar: Standalone-style Analytics button + 3-dot Menu */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
          {/* Analytics button matching standalone link design */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/analytics?campaign=${encodeURIComponent(campaign.campaignName)}`);
            }}
            className="flex items-center gap-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors px-2.5 py-1 rounded-lg border border-border cursor-pointer shadow-xs"
            title="View Campaign Analytics"
          >
            <ClickArrowIcon className="w-3 h-3 text-primary" />
            <span>{campaign.totalClicks.toLocaleString()}</span>
            <span className="hidden sm:inline ml-0.5 text-muted-foreground font-normal">clicks</span>
          </button>

          {/* 3-Dot Dropdown for Copy All, CSV Export, Analytics */}
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHeaderMenuOpen(prev => !prev);
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
              title="Campaign Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
              {isHeaderMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[75] bg-transparent cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHeaderMenuOpen(false);
                    }} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-xl z-[80] p-1 divide-y divide-border"
                  >
                    <div className="py-0.5">
                      <button
                        type="button"
                        onClick={handleCopyAll}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Copy All Links</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Export CSV</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen(false);
                          navigate(`/analytics?campaign=${encodeURIComponent(campaign.campaignName)}`);
                        }}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>View Analytics</span>
                        </div>
                      </button>
                    </div>

                    {/* Bulk Campaign Actions Section */}
                    <div className="py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen(false);
                          setSelectedFolderId(null);
                          setIsMoveFolderModalOpen(true);
                        }}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <FolderInput className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Move to Folder</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen(false);
                          setSelectedTagIds([]);
                          setIsAssignTagsModalOpen(true);
                        }}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Assign Tags</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen(false);
                          setExpirationOption('never');
                          setCustomExpirationDate('');
                          setIsSetExpirationModalOpen(true);
                        }}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Set Expiration</span>
                        </div>
                      </button>
                    </div>

                    <div className="py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen(false);
                          setIsDeleteCampaignModalOpen(true);
                        }}
                        className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Delete Campaign</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Expanded Links List with Solid Gray Divider */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-zinc-200 dark:border-zinc-800 overflow-visible bg-background rounded-b-xl"
          >
            <div>
              {campaign.links.map(url => {
                const hash = extractHash(url.shortUrl);
                const fullShortUrl = `${protocol}//${displayDomain}/${hash}`;
                const utms = extractUtmParams(url.longUrl);
                const channelLabel = formatChannelName(utms.source, utms.medium);

                return (
                  <motion.div 
                    layout 
                    initial={{ opacity: 0, y: 6 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.15 }} 
                    key={url.shortUrl} 
                    className="group relative flex items-center p-4 pl-8 sm:pl-10 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-b-0 hover:border-solid hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all"
                  >
                    {/* Favicon */}
                    <div className="shrink-0 mr-4">
                      <div className="w-9 h-9 rounded-full border border-border bg-secondary overflow-hidden flex items-center justify-center p-1">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${url.longUrl}&sz=64`} 
                          alt="Favicon" 
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Channel Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-200/70 dark:bg-[#202024] text-foreground border border-neutral-300/60 dark:border-[#2b2b30]">
                          {channelLabel}
                        </span>

                        <a href={fullShortUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground truncate hover:underline">
                          {displayDomain}/{hash}
                        </a>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(fullShortUrl);
                              setCopiedHash(url.shortUrl);
                              toast.success("Link copied to clipboard");
                              setTimeout(() => setCopiedHash(null), 2000);
                            }}
                            className={`p-1 rounded transition-colors ${copiedHash === url.shortUrl ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                            title="Copy link"
                          >
                            {copiedHash === url.shortUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            onClick={() => onOpenQr(hash)}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                            title="QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {displayProps.destinationUrl && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5 ml-0.5">
                            <CornerDownRight className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                              {url.longUrl}
                            </span>
                          </div>
                        )}
                        {displayProps.destinationUrl && (displayProps.campaignCreatedAt ?? false) && <span>•</span>}
                        {(displayProps.campaignCreatedAt ?? false) && (
                          <span>
                            {new Date(url.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      
                      {displayProps.tags && url.tags && url.tags.length > 0 && (
                        <div className="relative group/tag inline-flex items-center mt-1.5">
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-[#18181B] text-foreground border border-neutral-200/80 dark:border-[#27272A] shadow-sm"
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: url.tags[0].color || '#3b82f6' }}
                            />
                            <span>{url.tags[0].name}</span>
                            {url.tags.length > 1 && (
                              <span className="text-[10px] font-mono text-muted-foreground ml-0.5">
                                +{url.tags.length - 1}
                              </span>
                            )}
                          </span>
                          
                          {/* Tooltip */}
                          {url.tags.length > 1 && (
                            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tag:flex items-center bg-popover text-popover-foreground shadow-xl border border-border rounded-xl p-1.5 gap-1.5 z-[60] min-w-max">
                              {url.tags.map(t => (
                                <span 
                                  key={t.id} 
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-[#18181B] text-foreground border border-neutral-200/80 dark:border-[#27272A] shadow-sm"
                                >
                                  <span 
                                    className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: t.color || '#3b82f6' }}
                                  />
                                  <span>{t.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2.5 ml-4">
                      {displayProps.password && url.hasPassword && (
                        <div className="flex items-center justify-center p-1 rounded-md bg-secondary text-muted-foreground border border-border" title="Password Protected">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      {displayProps.status && url.expiresAt && (() => {
                        const expDate = new Date(url.expiresAt.endsWith('Z') ? url.expiresAt : url.expiresAt + 'Z');
                        const isExpired = !url.isActive || expDate < new Date();
                        if (!isExpired) {
                          return (
                            <div title={`${formatDistanceToNow(expDate)} remaining`} className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-xs font-medium cursor-help">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </div>
                          );
                        } else {
                          return (
                            <div title="Expired" className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg text-xs font-medium cursor-help">
                              <XCircle className="w-3.5 h-3.5" />
                              Expired
                            </div>
                          );
                        }
                      })()}
                      
                      {displayProps.clicks && (
                        <Link to={`/analytics/${hash}`} className="flex items-center gap-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors px-2.5 py-1 rounded-lg border border-border">
                          <ClickArrowIcon className="w-3 h-3 text-primary" />
                          {url.accessed_times}
                          <span className="hidden sm:inline ml-0.5 text-muted-foreground font-normal">clicks</span>
                        </Link>
                      )}
                      
                      <div className="relative">
                        <button 
                          onClick={() => setOpenItemMenuId(openItemMenuId === url.shortUrl ? null : url.shortUrl)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        
                        <AnimatePresence>
                          {openItemMenuId === url.shortUrl && (
                            <>
                              <div 
                                className="fixed inset-0 z-[75] bg-transparent cursor-default" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.1, ease: "easeOut" }}
                                className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-xl z-[80] p-1 divide-y divide-border"
                              >
                                <div className="py-0.5">
                                  <Link
                                    to={`/analytics/${hash}`}
                                    onClick={() => setOpenItemMenuId(null)}
                                    className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>Analytics</span>
                                    </div>
                                  </Link>
                                  {onEditUrl && (
                                    <button
                                      onClick={() => {
                                        onEditUrl(url);
                                        setOpenItemMenuId(null);
                                      }}
                                      className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Edit</span>
                                      </div>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      onOpenQr(hash);
                                      setOpenItemMenuId(null);
                                    }}
                                    className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>QR Code</span>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(fullShortUrl);
                                      setCopiedHash(url.shortUrl);
                                      toast.success("Link copied to clipboard");
                                      setTimeout(() => setCopiedHash(null), 2000);
                                      setOpenItemMenuId(null);
                                    }}
                                    className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>Copy Link</span>
                                    </div>
                                  </button>
                                </div>
                                {onDeleteUrl && (
                                  <div className="pt-1">
                                    <button
                                      onClick={() => {
                                        setOpenItemMenuId(null);
                                        onDeleteUrl(url);
                                      }}
                                      className="w-full flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete</span>
                                      </div>
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ======================================================== */}
      {/* Modals Portaled to Body to prevent stacking context clipping & blur issues */}
      {/* ======================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* 1. Bulk Move to Folder Modal */}
          <AnimatePresence>
            {isMoveFolderModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isBulkSubmitting && setIsMoveFolderModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-popover border border-border rounded-xl shadow-2xl overflow-hidden p-6 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FolderInput className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Move Campaign to Folder</h3>
                    <p className="text-xs text-muted-foreground">Move all {campaign.links.length} links in &quot;{campaign.campaignName}&quot;</p>
                  </div>
                </div>
                <button 
                  disabled={isBulkSubmitting}
                  onClick={() => setIsMoveFolderModalOpen(false)} 
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between border ${
                    selectedFolderId === null 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'border-border/60 text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-muted-foreground" />
                    <span>Root / No Folder</span>
                  </div>
                  {selectedFolderId === null && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                {folders.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between border ${
                      selectedFolderId === f.id 
                        ? 'bg-primary/10 text-primary border-primary/40' 
                        : 'border-border/60 text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    {selectedFolderId === f.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => setIsMoveFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => executeBulkAction('MOVE_FOLDER', { folderId: selectedFolderId })}
                  className="px-4 py-1.5 text-xs rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  {isBulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Move {campaign.links.length} Links
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 2. Bulk Assign Tags Modal */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isAssignTagsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isBulkSubmitting && setIsAssignTagsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-popover border border-border rounded-xl shadow-2xl overflow-hidden p-6 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Assign Tags to Campaign</h3>
                    <p className="text-xs text-muted-foreground">Select tags to apply across all {campaign.links.length} links</p>
                  </div>
                </div>
                <button 
                  disabled={isBulkSubmitting}
                  onClick={() => setIsAssignTagsModalOpen(false)} 
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4">
                {tags.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No tags created yet. Create tags from the dashboard sidebar first.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
                    {tags.map(t => {
                      const isSelected = selectedTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTagIds(prev => 
                              isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs' 
                              : 'bg-secondary/60 text-foreground border-border hover:bg-secondary'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{t.name}</span>
                          {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => setIsAssignTagsModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => executeBulkAction('ADD_TAGS', { tagIds: selectedTagIds })}
                  className="px-4 py-1.5 text-xs rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  {isBulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Apply Tags ({selectedTagIds.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 3. Bulk Set Expiration Modal */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isSetExpirationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isBulkSubmitting && setIsSetExpirationModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-popover border border-border rounded-xl shadow-2xl overflow-hidden p-6 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Set Campaign Expiration</h3>
                    <p className="text-xs text-muted-foreground">Applies expiration timestamp to all {campaign.links.length} links</p>
                  </div>
                </div>
                <button 
                  disabled={isBulkSubmitting}
                  onClick={() => setIsSetExpirationModalOpen(false)} 
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'never', label: 'Never (Active)' },
                    { id: '24h', label: 'In 24 Hours' },
                    { id: '7d', label: 'In 7 Days' },
                    { id: '30d', label: 'In 30 Days' },
                    { id: 'custom', label: 'Custom Date' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpirationOption(opt.id as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                        expirationOption === opt.id 
                          ? 'bg-primary/10 text-primary border-primary/40 font-semibold' 
                          : 'bg-secondary/40 text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {expirationOption === 'custom' && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-foreground mb-1">Select Custom Date & Time</label>
                    <input 
                      type="datetime-local"
                      value={customExpirationDate}
                      onChange={e => setCustomExpirationDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => setIsSetExpirationModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => {
                    let expiresAt: string | null = null;
                    if (expirationOption === '24h') {
                      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                    } else if (expirationOption === '7d') {
                      expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
                    } else if (expirationOption === '30d') {
                      expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
                    } else if (expirationOption === 'custom' && customExpirationDate) {
                      expiresAt = new Date(customExpirationDate).toISOString();
                    }
                    executeBulkAction('SET_EXPIRATION', { expiresAt });
                  }}
                  className="px-4 py-1.5 text-xs rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  {isBulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Expiration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 4. Bulk Delete Campaign Modal */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isDeleteCampaignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isBulkSubmitting && setIsDeleteCampaignModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-popover border border-border rounded-xl shadow-2xl overflow-hidden p-6 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Delete Entire Campaign?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <div className="py-4 text-xs text-muted-foreground leading-relaxed">
                You are about to permanently delete all <strong className="text-foreground">{campaign.links.length} links</strong> and their tracking analytics associated with <strong className="text-foreground">&quot;{campaign.campaignName}&quot;</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => setIsDeleteCampaignModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkSubmitting}
                  onClick={() => executeBulkAction('DELETE')}
                  className="px-4 py-1.5 text-xs rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isBulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete {campaign.links.length} Links
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
};
