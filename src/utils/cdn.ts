export const DEFAULT_CDN_BASE = 'https://dl.theopenbee.cn';

export function resolveCDN(input: string | undefined): string {
  const v = (input ?? '').trim();
  if (!v) return DEFAULT_CDN_BASE;
  return v.replace(/\/+$/, '');
}
