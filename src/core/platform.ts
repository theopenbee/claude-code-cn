import { readdirSync } from 'node:fs';

export type SupportedOS = 'darwin' | 'linux';
export type Arch = string;

export interface Platform {
  os: string;
  arch: string;
  variant: '' | 'musl';
}

export function mapArch(arch: string): string {
  // Node 'x64' already matches the asset naming; keep this as a hook for future translations.
  return arch;
}

// Glob abstraction kept simple: caller supplies a function that returns matches
// for a pattern. The default scans /lib for ld-musl-*.so* without pulling in
// a glob library. Node 22's fs.glob is intentionally avoided for ≥18 compatibility.
export function isMuslWith(globFn: (pattern: string) => string[]): boolean {
  try {
    return globFn('/lib/ld-musl-*.so*').length > 0;
  } catch {
    return false;
  }
}

function defaultGlob(pattern: string): string[] {
  // Only the specific pattern '/lib/ld-musl-*.so*' is needed.
  if (pattern !== '/lib/ld-musl-*.so*') return [];
  const names = readdirSync('/lib');
  const re = /^ld-musl-.*\.so/;
  return names.filter((n) => re.test(n)).map((n) => `/lib/${n}`);
}

export function isMusl(): boolean {
  return isMuslWith(defaultGlob);
}

export function detectPlatform(): Platform {
  const os = process.platform;
  const arch = mapArch(process.arch);
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
