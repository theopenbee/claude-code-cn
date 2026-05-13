import { readdirSync } from 'node:fs';

export interface Platform {
  os: string;
  arch: string;
  variant: '' | 'musl';
}

export function isMuslWith(globFn: () => string[]): boolean {
  try {
    return globFn().length > 0;
  } catch {
    return false;
  }
}

function scanMuslLoaders(): string[] {
  const re = /^ld-musl-.*\.so/;
  return readdirSync('/lib')
    .filter((n) => re.test(n))
    .map((n) => `/lib/${n}`);
}

export function isMusl(): boolean {
  return isMuslWith(scanMuslLoaders);
}

export function detectPlatform(): Platform {
  const os = process.platform;
  const arch = process.arch;
  const variant: '' | 'musl' = os === 'linux' && isMusl() ? 'musl' : '';
  return { os, arch, variant };
}

const SUPPORTED = new Set<string>([
  'darwin|arm64|',
  'darwin|x64|',
  'linux|arm64|',
  'linux|x64|',
  'linux|arm64|musl',
  'linux|x64|musl',
]);

export function isSupportedPlatform(p: Platform): boolean {
  return SUPPORTED.has(`${p.os}|${p.arch}|${p.variant}`);
}

export function platformString(p: Platform): string {
  return p.variant ? `${p.os}-${p.arch}-${p.variant}` : `${p.os}-${p.arch}`;
}

export function buildAssetName(p: Platform, version: string): string {
  const ver = version.replace(/^v/, '');
  return `claude-${ver}-${platformString(p)}`;
}
