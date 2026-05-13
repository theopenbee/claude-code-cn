import { describe, expect, it } from 'vitest';
import { InterruptedError, UnsupportedPlatformError } from './errors.js';

describe('errors', () => {
  it('InterruptedError carries name and message', () => {
    const e = new InterruptedError();
    expect(e.name).toBe('InterruptedError');
    expect(e.message).toBe('interrupted');
    expect(e).toBeInstanceOf(Error);
  });

  it('UnsupportedPlatformError reports os/arch', () => {
    const e = new UnsupportedPlatformError('win32', 'x64');
    expect(e.name).toBe('UnsupportedPlatformError');
    expect(e.message).toContain('win32');
    expect(e.message).toContain('x64');
  });
});
