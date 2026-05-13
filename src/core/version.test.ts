import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLatestVersion, normalizeTag } from './version.js';

describe('normalizeTag', () => {
  it('adds v prefix', () => {
    expect(normalizeTag('1.2.3')).toBe('v1.2.3');
  });
  it('keeps existing v', () => {
    expect(normalizeTag('v1.2.3')).toBe('v1.2.3');
  });
  it('trims whitespace', () => {
    expect(normalizeTag('  1.2.3\n')).toBe('v1.2.3');
  });
  it('throws on empty', () => {
    expect(() => normalizeTag('')).toThrow(/版本号为空/);
    expect(() => normalizeTag('   ')).toThrow(/版本号为空/);
  });
});

describe('fetchLatestVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches <cdn>/claude-code-releases/latest.txt and normalizes', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '1.2.3\n',
    }));
    vi.stubGlobal('fetch', fetchMock);
    const v = await fetchLatestVersion('https://cdn.test');
    expect(v).toBe('v1.2.3');
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/claude-code-releases/latest.txt');
  });

  it('throws on non-200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })),
    );
    await expect(fetchLatestVersion('https://cdn.test')).rejects.toThrow(/404/);
  });
});
