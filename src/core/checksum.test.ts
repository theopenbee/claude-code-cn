import { describe, expect, it } from 'vitest';
import { parseChecksumFile } from './checksum.js';

const sample = `
abc123  claude-1.2.3-darwin-arm64
deadbeef  claude-1.2.3-linux-x64
cafebabe  other-thing
`;

describe('parseChecksumFile', () => {
  it('returns the hash for the requested asset', () => {
    expect(parseChecksumFile(sample, 'claude-1.2.3-darwin-arm64')).toBe('abc123');
    expect(parseChecksumFile(sample, 'claude-1.2.3-linux-x64')).toBe('deadbeef');
  });

  it('throws when asset is not listed', () => {
    expect(() => parseChecksumFile(sample, 'claude-9.9.9-darwin-arm64')).toThrow(
      /未找到资产/,
    );
  });

  it('ignores blank and malformed lines', () => {
    const messy = '\n\n   \nbadline_without_two_fields\nfeed  claude-x';
    expect(parseChecksumFile(messy, 'claude-x')).toBe('feed');
  });
});
