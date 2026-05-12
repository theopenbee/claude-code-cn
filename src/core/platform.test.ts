import { describe, expect, it } from 'vitest';
import {
  type Platform,
  buildAssetName,
  isMuslWith,
  isSupportedPlatform,
  mapArch,
  platformString,
} from './platform.js';

describe('mapArch', () => {
  it.each([
    ['x64', 'x64'],
    ['arm64', 'arm64'],
    ['ia32', 'ia32'],
  ])('maps %s -> %s', (input, want) => {
    expect(mapArch(input)).toBe(want);
  });
});

describe('isMuslWith', () => {
  it('true when glob returns matches', () => {
    expect(isMuslWith(() => ['/lib/ld-musl-x86_64.so.1'])).toBe(true);
  });
  it('false when no match', () => {
    expect(isMuslWith(() => [])).toBe(false);
  });
  it('false when glob throws', () => {
    expect(
      isMuslWith(() => {
        throw new Error('eperm');
      }),
    ).toBe(false);
  });
});

describe('isSupportedPlatform', () => {
  const supported: Platform[] = [
    { os: 'darwin', arch: 'arm64', variant: '' },
    { os: 'darwin', arch: 'x64', variant: '' },
    { os: 'linux', arch: 'arm64', variant: '' },
    { os: 'linux', arch: 'x64', variant: '' },
    { os: 'linux', arch: 'arm64', variant: 'musl' },
    { os: 'linux', arch: 'x64', variant: 'musl' },
  ];
  const unsupported: Platform[] = [
    { os: 'win32', arch: 'x64', variant: '' },
    { os: 'darwin', arch: 'ia32', variant: '' },
    { os: 'linux', arch: 'ia32', variant: '' },
    { os: 'darwin', arch: 'arm64', variant: 'musl' },
  ];
  it.each(supported)('supports %o', (p) => {
    expect(isSupportedPlatform(p)).toBe(true);
  });
  it.each(unsupported)('rejects %o', (p) => {
    expect(isSupportedPlatform(p)).toBe(false);
  });
});

describe('platformString', () => {
  it('os-arch when no variant', () => {
    expect(platformString({ os: 'darwin', arch: 'arm64', variant: '' })).toBe('darwin-arm64');
  });
  it('os-arch-variant when variant', () => {
    expect(platformString({ os: 'linux', arch: 'x64', variant: 'musl' })).toBe('linux-x64-musl');
  });
});

describe('buildAssetName', () => {
  it('claude-<ver>-<plat>', () => {
    expect(buildAssetName({ os: 'linux', arch: 'arm64', variant: 'musl' }, 'v1.2.3')).toBe(
      'claude-1.2.3-linux-arm64-musl',
    );
  });
  it('strips v prefix from version', () => {
    expect(buildAssetName({ os: 'darwin', arch: 'x64', variant: '' }, '1.2.3')).toBe(
      'claude-1.2.3-darwin-x64',
    );
  });
});
