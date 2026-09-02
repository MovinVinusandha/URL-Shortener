import axiosInstance from '../api/axiosInstance';

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  ref?: string;
}

export interface CustomParam {
  id: string;
  key: string;
  value: string;
}

export interface UtmTemplate {
  id: string | number;
  name: string;
  utms: UtmParams;
  customParams?: { key: string; value: string }[];
  isDefault?: boolean;
  createdAt: number;
}

export interface UtmTemplateBackendDto {
  id: number;
  name: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  ref?: string;
  isDefault?: boolean;
  customParams?: string;
  createdAt?: string;
}

export interface UtmPreset {
  id: string;
  name: string;
  iconName: string;
  utms: Partial<UtmParams>;
  badgeColor?: string;
}

export const POPULAR_UTM_PRESETS: UtmPreset[] = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    iconName: 'twitter',
    utms: { source: 'twitter', medium: 'social' },
    badgeColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    iconName: 'linkedin',
    utms: { source: 'linkedin', medium: 'social' },
    badgeColor: 'text-blue-600 bg-blue-600/10 border-blue-600/20',
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    iconName: 'mail',
    utms: { source: 'newsletter', medium: 'email' },
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    iconName: 'search',
    utms: { source: 'google', medium: 'cpc' },
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    iconName: 'youtube',
    utms: { source: 'youtube', medium: 'video' },
    badgeColor: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    iconName: 'facebook',
    utms: { source: 'facebook', medium: 'social' },
    badgeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    iconName: 'message-square',
    utms: { source: 'reddit', medium: 'community' },
    badgeColor: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    iconName: 'flame',
    utms: { source: 'producthunt', medium: 'launch' },
    badgeColor: 'text-amber-600 bg-amber-600/10 border-amber-600/20',
  },
];

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'] as const;

/**
 * Extracts base URL (protocol, host, path, non-UTM query params, and hash)
 * along with existing UTM parameters and custom query parameters from a URL string.
 */
export function parseUrlUtms(rawUrl: string): {
  baseUrl: string;
  utms: UtmParams;
  customParams: CustomParam[];
  hasUtms: boolean;
} {
  const defaultResult = {
    baseUrl: rawUrl,
    utms: { source: '', medium: '', campaign: '', term: '', content: '', ref: '' },
    customParams: [],
    hasUtms: false,
  };

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return defaultResult;
  }

  const trimmed = rawUrl.trim();
  let parsedUrl: URL;

  try {
    // Handle URLs without protocol by checking if it starts with standard schemes
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      parsedUrl = new URL(trimmed);
    } else {
      parsedUrl = new URL(`https://${trimmed}`);
    }
  } catch {
    return defaultResult;
  }

  const utms: UtmParams = {
    source: parsedUrl.searchParams.get('utm_source') || '',
    medium: parsedUrl.searchParams.get('utm_medium') || '',
    campaign: parsedUrl.searchParams.get('utm_campaign') || '',
    term: parsedUrl.searchParams.get('utm_term') || '',
    content: parsedUrl.searchParams.get('utm_content') || '',
    ref: parsedUrl.searchParams.get('ref') || '',
  };

  const customParams: CustomParam[] = [];
  const nonUtmParams = new URLSearchParams();

  parsedUrl.searchParams.forEach((val, key) => {
    if (UTM_KEYS.includes(key as any)) {
      // It's a standard UTM / ref param
    } else {
      nonUtmParams.append(key, val);
    }
  });

  const hasUtms = Object.values(utms).some((v) => v && v.trim() !== '');

  // Reconstruct clean base URL without UTM parameters
  const originAndPath = `${parsedUrl.origin}${parsedUrl.pathname}`;
  const remainingQuery = nonUtmParams.toString();
  const hash = parsedUrl.hash;

  let cleanBaseUrl = originAndPath;
  if (remainingQuery) {
    cleanBaseUrl += `?${remainingQuery}`;
  }
  if (hash) {
    cleanBaseUrl += hash;
  }

  return {
    baseUrl: cleanBaseUrl,
    utms,
    customParams,
    hasUtms,
  };
}

/**
 * Builds an updated full URL with the given UTM parameters and custom key-value pairs,
 * preserving any existing non-UTM query params and hash fragments.
 */
export function buildUrlWithUtms(
  baseUrl: string,
  utms: UtmParams,
  customParams: CustomParam[] = []
): string {
  if (!baseUrl || !baseUrl.trim()) {
    return '';
  }

  const trimmed = baseUrl.trim();
  let parsedUrl: URL;
  let hasValidScheme = true;

  try {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      parsedUrl = new URL(trimmed);
    } else {
      hasValidScheme = false;
      parsedUrl = new URL(`https://${trimmed}`);
    }
  } catch {
    return baseUrl;
  }

  // Remove existing UTM params and ref
  UTM_KEYS.forEach((key) => {
    parsedUrl.searchParams.delete(key);
  });

  // Append populated UTM values in standard order
  if (utms.source && utms.source.trim()) {
    parsedUrl.searchParams.set('utm_source', utms.source.trim());
  }
  if (utms.medium && utms.medium.trim()) {
    parsedUrl.searchParams.set('utm_medium', utms.medium.trim());
  }
  if (utms.campaign && utms.campaign.trim()) {
    parsedUrl.searchParams.set('utm_campaign', utms.campaign.trim());
  }
  if (utms.term && utms.term.trim()) {
    parsedUrl.searchParams.set('utm_term', utms.term.trim());
  }
  if (utms.content && utms.content.trim()) {
    parsedUrl.searchParams.set('utm_content', utms.content.trim());
  }
  if (utms.ref && utms.ref.trim()) {
    parsedUrl.searchParams.set('ref', utms.ref.trim());
  }

  // Append custom parameters
  customParams.forEach((param) => {
    if (param.key && param.key.trim()) {
      parsedUrl.searchParams.set(param.key.trim(), param.value ? param.value.trim() : '');
    }
  });

  let finalUrl = parsedUrl.toString();
  if (!hasValidScheme && finalUrl.startsWith('https://')) {
    finalUrl = finalUrl.replace(/^https:\/\//, '');
  }

  return finalUrl;
}

/**
 * Local Storage helpers for UTM Templates
 */
const STORAGE_KEY = 'trim_utm_templates_v1';

export function getSavedUtmTemplates(): UtmTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveUtmTemplate(
  name: string,
  utms: UtmParams,
  customParams: CustomParam[] = [],
  isDefault: boolean = false
): UtmTemplate[] {
  try {
    let existing = getSavedUtmTemplates();
    if (isDefault) {
      existing = existing.map((t) => ({ ...t, isDefault: false }));
    }
    const newTemplate: UtmTemplate = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      utms: { ...utms },
      customParams: customParams.filter((p) => p.key.trim()).map((p) => ({ key: p.key.trim(), value: p.value.trim() })),
      isDefault,
      createdAt: Date.now(),
    };
    const updated = [newTemplate, ...existing.filter((t) => t.name.toLowerCase() !== name.trim().toLowerCase())];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function mapBackendDtoToTemplate(dto: UtmTemplateBackendDto): UtmTemplate {
  let parsedCustomParams: { key: string; value: string }[] = [];
  if (dto.customParams) {
    try {
      parsedCustomParams = JSON.parse(dto.customParams);
    } catch {
      parsedCustomParams = [];
    }
  }

  return {
    id: dto.id,
    name: dto.name,
    utms: {
      source: dto.source || '',
      medium: dto.medium || '',
      campaign: dto.campaign || '',
      term: dto.term || '',
      content: dto.content || '',
      ref: dto.ref || '',
    },
    customParams: parsedCustomParams,
    isDefault: Boolean(dto.isDefault),
    createdAt: dto.createdAt ? new Date(dto.createdAt).getTime() : Date.now(),
  };
}

export async function fetchUtmTemplatesApi(): Promise<UtmTemplate[]> {
  try {
    const res = await axiosInstance.get<UtmTemplateBackendDto[]>('/utm-templates');
    const mapped = res.data.map(mapBackendDtoToTemplate);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    } catch {
      // ignore storage quota error
    }
    return mapped;
  } catch {
    return getSavedUtmTemplates();
  }
}

export async function createUtmTemplateApi(
  name: string,
  utms: UtmParams,
  customParams: CustomParam[] = [],
  isDefault?: boolean
): Promise<UtmTemplate> {
  const cleanCustomParams = customParams
    .filter((p) => p.key && p.key.trim())
    .map((p) => ({ key: p.key.trim(), value: p.value.trim() }));

  const payload = {
    name: name.trim(),
    source: utms.source?.trim() || null,
    medium: utms.medium?.trim() || null,
    campaign: utms.campaign?.trim() || null,
    term: utms.term?.trim() || null,
    content: utms.content?.trim() || null,
    ref: utms.ref?.trim() || null,
    isDefault: isDefault ?? false,
    customParams: cleanCustomParams.length > 0 ? JSON.stringify(cleanCustomParams) : null,
  };

  const res = await axiosInstance.post<UtmTemplateBackendDto>('/utm-templates', payload);
  return mapBackendDtoToTemplate(res.data);
}

export async function updateUtmTemplateApi(
  id: string | number,
  name: string,
  utms: UtmParams,
  customParams: CustomParam[] = [],
  isDefault?: boolean
): Promise<UtmTemplate> {
  const cleanCustomParams = customParams
    .filter((p) => p.key && p.key.trim())
    .map((p) => ({ key: p.key.trim(), value: p.value.trim() }));

  const payload = {
    name: name.trim(),
    source: utms.source?.trim() || null,
    medium: utms.medium?.trim() || null,
    campaign: utms.campaign?.trim() || null,
    term: utms.term?.trim() || null,
    content: utms.content?.trim() || null,
    ref: utms.ref?.trim() || null,
    isDefault: isDefault !== undefined ? isDefault : undefined,
    customParams: cleanCustomParams.length > 0 ? JSON.stringify(cleanCustomParams) : null,
  };

  const res = await axiosInstance.put<UtmTemplateBackendDto>(`/utm-templates/${id}`, payload);
  return mapBackendDtoToTemplate(res.data);
}

export async function toggleDefaultUtmTemplateApi(id: string | number): Promise<UtmTemplate> {
  const res = await axiosInstance.patch<UtmTemplateBackendDto>(`/utm-templates/${id}/default`);
  return mapBackendDtoToTemplate(res.data);
}

export async function deleteUtmTemplateApi(id: string | number): Promise<void> {
  await axiosInstance.delete(`/utm-templates/${id}`);
}

export function updateUtmTemplate(
  id: string | number,
  name: string,
  utms: UtmParams,
  customParams: CustomParam[] = [],
  isDefault?: boolean
): UtmTemplate[] {
  try {
    let existing = getSavedUtmTemplates();
    if (isDefault) {
      existing = existing.map((t) => ({ ...t, isDefault: false }));
    }
    const updated = existing.map((t) => {
      if (t.id === id || String(t.id) === String(id)) {
        return {
          ...t,
          name: name.trim(),
          utms: { ...utms },
          customParams: customParams.filter((p) => p.key.trim()).map((p) => ({ key: p.key.trim(), value: p.value.trim() })),
          ...(isDefault !== undefined ? { isDefault } : {}),
        };
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function toggleDefaultUtmTemplate(templateId: string | number): UtmTemplate[] {
  try {
    const existing = getSavedUtmTemplates();
    const target = existing.find((t) => t.id === templateId || String(t.id) === String(templateId));
    const nextIsDefault = !target?.isDefault;
    const updated = existing.map((t) => {
      if (t.id === templateId || String(t.id) === String(templateId)) {
        return { ...t, isDefault: nextIsDefault };
      }
      return nextIsDefault ? { ...t, isDefault: false } : t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function deleteUtmTemplate(templateId: string | number): UtmTemplate[] {
  try {
    const existing = getSavedUtmTemplates();
    const updated = existing.filter((t) => t.id !== templateId && String(t.id) !== String(templateId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
