import type { UrlEntry } from '../types';

export interface ExtractedUtmParams {
  campaign: string | null;
  source: string | null;
  medium: string | null;
  term: string | null;
  content: string | null;
}

export interface CampaignGroup {
  campaignName: string;
  totalClicks: number;
  links: UrlEntry[];
  topChannel: { name: string; clicks: number } | null;
  latestCreatedAt: string;
  earliestCreatedAt: string;
}

/** Extract UTM parameters safely from a long URL */
export function extractUtmParams(urlStr: string): ExtractedUtmParams {
  if (!urlStr) {
    return { campaign: null, source: null, medium: null, term: null, content: null };
  }

  try {
    const url = new URL(urlStr);
    return {
      campaign: url.searchParams.get('utm_campaign') || null,
      source: url.searchParams.get('utm_source') || null,
      medium: url.searchParams.get('utm_medium') || null,
      term: url.searchParams.get('utm_term') || null,
      content: url.searchParams.get('utm_content') || null,
    };
  } catch {
    // Regex fallback if relative or malformed URL
    const matchCampaign = urlStr.match(/[?&]utm_campaign=([^&#]+)/);
    const matchSource = urlStr.match(/[?&]utm_source=([^&#]+)/);
    const matchMedium = urlStr.match(/[?&]utm_medium=([^&#]+)/);
    const matchTerm = urlStr.match(/[?&]utm_term=([^&#]+)/);
    const matchContent = urlStr.match(/[?&]utm_content=([^&#]+)/);

    return {
      campaign: matchCampaign ? decodeURIComponent(matchCampaign[1]) : null,
      source: matchSource ? decodeURIComponent(matchSource[1]) : null,
      medium: matchMedium ? decodeURIComponent(matchMedium[1]) : null,
      term: matchTerm ? decodeURIComponent(matchTerm[1]) : null,
      content: matchContent ? decodeURIComponent(matchContent[1]) : null,
    };
  }
}

/** Formats a clean, readable channel name from UTM source / medium */
export function formatChannelName(source: string | null, _medium?: string | null): string {
  if (!source) return 'Direct / Link';
  const clean = source.trim().toLowerCase();
  
  const PRESET_MAP: Record<string, string> = {
    twitter: 'Twitter / X',
    x: 'Twitter / X',
    facebook: 'Facebook',
    fb: 'Facebook',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    email: 'Email Newsletter',
    newsletter: 'Email Newsletter',
    whatsapp: 'WhatsApp',
    reddit: 'Reddit',
    telegram: 'Telegram',
    discord: 'Discord',
    pinterest: 'Pinterest',
    threads: 'Threads',
  };

  if (PRESET_MAP[clean]) {
    return PRESET_MAP[clean];
  }

  // Capitalize custom channel name
  return source.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Group a list of UrlEntries by their utm_campaign */
export function groupUrlsByCampaign(urls: UrlEntry[]): {
  campaigns: CampaignGroup[];
  ungrouped: UrlEntry[];
} {
  const map = new Map<string, { displayKey: string; links: UrlEntry[] }>();
  const ungrouped: UrlEntry[] = [];

  for (const url of urls) {
    const { campaign } = extractUtmParams(url.longUrl);
    if (!campaign || campaign.trim() === '') {
      ungrouped.push(url);
    } else {
      const normalizedKey = campaign.trim().toLowerCase();
      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, { displayKey: campaign.trim(), links: [] });
      }
      map.get(normalizedKey)!.links.push(url);
    }
  }

  const campaigns: CampaignGroup[] = [];

  map.forEach(({ displayKey, links }) => {
    // Sort links in campaign by clicks desc, then created date desc
    const sortedLinks = [...links].sort((a, b) => {
      const clicksDiff = (b.accessed_times || 0) - (a.accessed_times || 0);
      if (clicksDiff !== 0) return clicksDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const totalClicks = sortedLinks.reduce((sum, u) => sum + (u.accessed_times || 0), 0);

    // Compute top performing channel
    const channelClicksMap = new Map<string, number>();
    for (const u of sortedLinks) {
      const utms = extractUtmParams(u.longUrl);
      const chanName = formatChannelName(utms.source, utms.medium);
      channelClicksMap.set(chanName, (channelClicksMap.get(chanName) || 0) + (u.accessed_times || 0));
    }

    let topChannel: { name: string; clicks: number } | null = null;
    channelClicksMap.forEach((clicks, name) => {
      if (!topChannel || clicks > topChannel.clicks) {
        topChannel = { name, clicks };
      }
    });

    const timestamps = sortedLinks.map(u => new Date(u.createdAt).getTime()).filter(t => !isNaN(t));
    const latestCreatedAt = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();
    const earliestCreatedAt = timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : new Date().toISOString();

    campaigns.push({
      campaignName: displayKey,
      totalClicks,
      links: sortedLinks,
      topChannel,
      latestCreatedAt,
      earliestCreatedAt,
    });
  });

  // Sort campaigns by latest activity date desc
  campaigns.sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime());

  return { campaigns, ungrouped };
}
