import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseUrlUtms,
  buildUrlWithUtms,
  getSavedUtmTemplates,
  saveUtmTemplate,
  deleteUtmTemplate,
  POPULAR_UTM_PRESETS,
} from './utmUtils';

describe('utmUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('parseUrlUtms', () => {
    it('returns default empty result for empty or invalid strings', () => {
      const res = parseUrlUtms('');
      expect(res.hasUtms).toBe(false);
      expect(res.utms.source).toBe('');
    });

    it('extracts standard UTM parameters and returns clean baseUrl', () => {
      const url = 'https://dub.co/pricing?utm_source=twitter&utm_medium=social&utm_campaign=launch&utm_term=shortener&utm_content=btn#features';
      const res = parseUrlUtms(url);

      expect(res.hasUtms).toBe(true);
      expect(res.utms.source).toBe('twitter');
      expect(res.utms.medium).toBe('social');
      expect(res.utms.campaign).toBe('launch');
      expect(res.utms.term).toBe('shortener');
      expect(res.utms.content).toBe('btn');
      expect(res.baseUrl).toBe('https://dub.co/pricing#features');
    });

    it('preserves non-UTM query parameters in baseUrl and parses ref', () => {
      const url = 'https://example.com/shop?category=shoes&utm_source=newsletter&ref=affiliate123';
      const res = parseUrlUtms(url);

      expect(res.hasUtms).toBe(true);
      expect(res.utms.source).toBe('newsletter');
      expect(res.utms.ref).toBe('affiliate123');
      expect(res.baseUrl).toBe('https://example.com/shop?category=shoes');
    });
  });

  describe('buildUrlWithUtms', () => {
    it('builds URL with active UTM parameters', () => {
      const baseUrl = 'https://example.com/pricing';
      const utms = {
        source: 'twitter',
        medium: 'social',
        campaign: 'summer_sale',
        term: '',
        content: '',
      };
      const result = buildUrlWithUtms(baseUrl, utms);
      expect(result).toBe('https://example.com/pricing?utm_source=twitter&utm_medium=social&utm_campaign=summer_sale');
    });

    it('preserves existing query parameters and hash anchors', () => {
      const baseUrl = 'https://example.com/pricing?plan=pro#faq';
      const utms = {
        source: 'google',
        medium: 'cpc',
        campaign: '',
        term: '',
        content: '',
      };
      const result = buildUrlWithUtms(baseUrl, utms);
      expect(result).toContain('plan=pro');
      expect(result).toContain('utm_source=google');
      expect(result).toContain('utm_medium=cpc');
      expect(result.endsWith('#faq')).toBe(true);
    });

    it('handles custom key-value parameters', () => {
      const baseUrl = 'https://example.com';
      const utms = {
        source: 'linkedin',
        medium: 'social',
        campaign: '',
        term: '',
        content: '',
      };
      const custom = [
        { id: '1', key: 'ref', value: 'partner_abc' },
        { id: '2', key: 'coupon', value: 'SAVE20' },
      ];
      const result = buildUrlWithUtms(baseUrl, utms, custom);
      expect(result).toContain('utm_source=linkedin');
      expect(result).toContain('ref=partner_abc');
      expect(result).toContain('coupon=SAVE20');
    });
  });

  describe('Template Management in LocalStorage', () => {
    it('saves, retrieves, and deletes UTM templates in localStorage', () => {
      expect(getSavedUtmTemplates()).toEqual([]);

      const utms = {
        source: 'newsletter',
        medium: 'email',
        campaign: 'weekly_digest',
        term: '',
        content: '',
      };

      const updated = saveUtmTemplate('Weekly Digest', utms);
      expect(updated.length).toBe(1);
      expect(updated[0].name).toBe('Weekly Digest');
      expect(updated[0].utms.source).toBe('newsletter');

      const retrieved = getSavedUtmTemplates();
      expect(retrieved.length).toBe(1);

      const afterDelete = deleteUtmTemplate(updated[0].id);
      expect(afterDelete.length).toBe(0);
      expect(getSavedUtmTemplates().length).toBe(0);
    });
  });

  describe('POPULAR_UTM_PRESETS', () => {
    it('has popular platform presets defined', () => {
      expect(POPULAR_UTM_PRESETS.length).toBeGreaterThanOrEqual(5);
      const twitter = POPULAR_UTM_PRESETS.find((p) => p.id === 'twitter');
      expect(twitter?.utms.source).toBe('twitter');
      expect(twitter?.utms.medium).toBe('social');
    });
  });
});
