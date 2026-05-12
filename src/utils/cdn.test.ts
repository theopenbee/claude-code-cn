import { describe, expect, it } from 'vitest';
import { DEFAULT_CDN_BASE, resolveCDN } from './cdn.js';

describe('resolveCDN', () => {
  it('returns user-provided URL when set', () => {
    expect(resolveCDN('https://mirror.example.com')).toBe('https://mirror.example.com');
  });

  it('falls back to default when empty', () => {
    expect(resolveCDN(undefined)).toBe(DEFAULT_CDN_BASE);
    expect(resolveCDN('')).toBe(DEFAULT_CDN_BASE);
  });

  it('strips trailing slash', () => {
    expect(resolveCDN('https://x.test/')).toBe('https://x.test');
  });

  it('DEFAULT_CDN_BASE is https://dl.theopenbee.cn', () => {
    expect(DEFAULT_CDN_BASE).toBe('https://dl.theopenbee.cn');
  });
});
