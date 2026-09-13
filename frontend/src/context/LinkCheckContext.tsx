import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance';
import type { UrlEntry } from '../types';
import toast from 'react-hot-toast';

export interface LinkCheckItem {
  id: string;
  slug: string;
  url: string;
  folderName?: string;
  status: 'PENDING' | 'CHECKING' | 'NORMAL' | 'ABNORMAL' | 'NETWORK_ERROR';
  statusCode?: number;
  durationMs?: number;
  error?: string;
  redirectUrl?: string;
  hopsCount?: number;
  redirectChain?: string[];
  isHttpsDowngrade?: boolean;
  securityWarning?: string;
}

interface LinkCheckContextType {
  checkItems: LinkCheckItem[];
  setCheckItems: React.Dispatch<React.SetStateAction<LinkCheckItem[]>>;
  isRunning: boolean;
  timeoutSec: number;
  setTimeoutSec: (val: number) => void;
  batchSize: number;
  setBatchSize: (val: number) => void;
  startCheck: () => void;
  stopCheck: () => void;
  clearResults: () => void;
  updateCheckItem: (updated: LinkCheckItem) => void;
  syncRawLinks: (rawLinks: UrlEntry[], folderFilter: string, forceReset?: boolean) => void;
}

const STORAGE_KEY_ITEMS = 'link_check_items';
const STORAGE_KEY_RUNNING = 'link_check_is_running';

const extractHash = (shortUrl: string): string =>
  shortUrl.split('/').pop() ?? shortUrl;

const LinkCheckContext = createContext<LinkCheckContextType | null>(null);

export const LinkCheckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkItems, setCheckItems] = useState<LinkCheckItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (!saved) return [];
      const parsed: LinkCheckItem[] = JSON.parse(saved);
      return parsed.map((item) =>
        item.status === 'CHECKING' ? { ...item, status: 'PENDING' } : item
      );
    } catch {
      return [];
    }
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_RUNNING) === 'true';
    } catch {
      return false;
    }
  });

  const [timeoutSec, setTimeoutSec] = useState<number>(8);
  const [batchSize, setBatchSize] = useState<number>(6);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const checkItemsRef = useRef(checkItems);
  checkItemsRef.current = checkItems;

  const timeoutSecRef = useRef(timeoutSec);
  timeoutSecRef.current = timeoutSec;

  const batchSizeRef = useRef(batchSize);
  batchSizeRef.current = batchSize;

  // Persist checkItems to localStorage whenever they change
  useEffect(() => {
    try {
      if (checkItems.length > 0) {
        const sanitized = checkItems.map((item) =>
          item.status === 'CHECKING' ? { ...item, status: 'PENDING' } : item
        );
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(sanitized));
      }
    } catch {}
  }, [checkItems]);

  // Persist isRunning flag
  useEffect(() => {
    try {
      if (isRunning) {
        localStorage.setItem(STORAGE_KEY_RUNNING, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY_RUNNING);
      }
    } catch {}
  }, [isRunning]);

  const updateCheckItem = (updated: LinkCheckItem) => {
    setCheckItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  };

  const syncRawLinks = (
    rawLinks: UrlEntry[],
    folderFilter: string,
    forceReset = false
  ) => {
    const filtered = rawLinks.filter((l) => {
      if (folderFilter === 'all') return true;
      if (folderFilter === 'none') return !l.folderId;
      return l.folderId?.toString() === folderFilter;
    });

    setCheckItems((prev) => {
      // Don't overwrite if check is actively running
      if (isRunningRef.current && prev.length > 0 && !forceReset) {
        return prev;
      }

      if (!forceReset && prev.length > 0) {
        const prevMap = new Map(prev.map((item) => [item.id, item]));
        return filtered.map((l) => {
          const existing = prevMap.get(l.shortUrl);
          if (existing) {
            return {
              ...existing,
              status: existing.status === 'CHECKING' && !isRunningRef.current ? 'PENDING' : existing.status,
              url: l.longUrl,
              folderName: l.folderName || undefined,
            };
          }
          return {
            id: l.shortUrl,
            slug: extractHash(l.shortUrl),
            url: l.longUrl,
            folderName: l.folderName || undefined,
            status: 'PENDING',
          };
        });
      }

      return filtered.map((l) => ({
        id: l.shortUrl,
        slug: extractHash(l.shortUrl),
        url: l.longUrl,
        folderName: l.folderName || undefined,
        status: 'PENDING',
      }));
    });
  };

  const runBatchLoop = async (queue: LinkCheckItem[]) => {
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    setIsRunning(true);

    const effectiveBatchSize = Math.max(1, Math.min(batchSizeRef.current, 10));
    const effectiveTimeout = Math.max(1, Math.min(timeoutSecRef.current, 60));

    let currentIndex = 0;

    try {
      while (currentIndex < queue.length) {
        if (abortCtrl.signal.aborted) break;

        const currentBatch = queue.slice(currentIndex, currentIndex + effectiveBatchSize);
        const batchIds = new Set(currentBatch.map((b) => b.id));

        setCheckItems((prev) =>
          prev.map((item) => (batchIds.has(item.id) ? { ...item, status: 'CHECKING' } : item))
        );

        try {
          const res = await axiosInstance.post<{
            results: Array<{
              id: string;
              slug: string;
              url: string;
              statusCode: number;
              status: 'NORMAL' | 'ABNORMAL' | 'NETWORK_ERROR';
              durationMs: number;
              error?: string;
              redirectUrl?: string;
              hopsCount?: number;
              redirectChain?: string[];
              isHttpsDowngrade?: boolean;
              securityWarning?: string;
            }>;
          }>(
            '/links/check',
            {
              items: currentBatch.map((b) => ({ id: b.id, slug: b.slug, url: b.url })),
              timeoutSeconds: effectiveTimeout,
            },
            { signal: abortCtrl.signal }
          );

          const resultMap = new Map(res.data.results.map((r) => [r.id, r]));

          setCheckItems((prev) =>
            prev.map((item) => {
              const resData = resultMap.get(item.id);
              if (resData) {
                return {
                  ...item,
                  status: resData.status,
                  statusCode: resData.statusCode,
                  durationMs: resData.durationMs,
                  error: resData.error,
                  redirectUrl: resData.redirectUrl,
                  hopsCount: resData.hopsCount,
                  redirectChain: resData.redirectChain,
                  isHttpsDowngrade: resData.isHttpsDowngrade,
                  securityWarning: resData.securityWarning,
                };
              }
              return item;
            })
          );
        } catch (err: any) {
          if (axios.isCancel(err) || abortCtrl.signal.aborted) {
            break;
          }
          setCheckItems((prev) =>
            prev.map((item) =>
              batchIds.has(item.id)
                ? { ...item, status: 'NETWORK_ERROR', error: err.message || 'Batch request failed' }
                : item
            )
          );
        }

        currentIndex += effectiveBatchSize;
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const startCheck = () => {
    if (isRunningRef.current) return;
    const current = checkItemsRef.current;
    if (current.length === 0) {
      toast.error('No links to check. Select a folder or reload links.');
      return;
    }

    // Reset items to pending
    const reset = current.map((it) => ({
      ...it,
      status: 'PENDING' as const,
      statusCode: undefined,
      durationMs: undefined,
      error: undefined,
    }));

    setCheckItems(reset);
    runBatchLoop(reset);
  };

  // Resume check on page refresh if it was running
  useEffect(() => {
    try {
      const wasRunning = localStorage.getItem(STORAGE_KEY_RUNNING) === 'true';
      if (wasRunning) {
        const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
        const parsed: LinkCheckItem[] = saved ? JSON.parse(saved) : [];
        const pendingItems = parsed.filter(
          (it) => it.status === 'PENDING' || it.status === 'CHECKING'
        );
        if (pendingItems.length > 0) {
          runBatchLoop(pendingItems);
        } else {
          setIsRunning(false);
        }
      } else {
        setIsRunning(false);
      }
    } catch {
      setIsRunning(false);
    }
  }, []);

  const stopCheck = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setCheckItems((prev) =>
      prev.map((item) => (item.status === 'CHECKING' ? { ...item, status: 'PENDING' } : item))
    );
    toast('Check stopped', { icon: '⏹️' });
  };

  const clearResults = () => {
    if (isRunningRef.current) stopCheck();
    try {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_RUNNING);
    } catch {}
    setCheckItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: 'PENDING',
        statusCode: undefined,
        durationMs: undefined,
        error: undefined,
      }))
    );
    toast.success('Results cleared');
  };

  return (
    <LinkCheckContext.Provider
      value={{
        checkItems,
        setCheckItems,
        isRunning,
        timeoutSec,
        setTimeoutSec,
        batchSize,
        setBatchSize,
        startCheck,
        stopCheck,
        clearResults,
        updateCheckItem,
        syncRawLinks,
      }}
    >
      {children}
    </LinkCheckContext.Provider>
  );
};

export const useLinkCheck = (): LinkCheckContextType => {
  const ctx = useContext(LinkCheckContext);
  if (!ctx) throw new Error('useLinkCheck must be used within a LinkCheckProvider');
  return ctx;
};
export default LinkCheckContext;
