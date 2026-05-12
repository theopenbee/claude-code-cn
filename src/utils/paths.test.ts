import { describe, expect, it, vi } from 'vitest';
import { binDir, claudeBinPath, claudeJsonPath, claudeSettingsPath, stateDir } from './paths.js';

describe('paths', () => {
  it('stateDir returns ~/.claude-code-cn', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(stateDir()).toBe('/tmp/test-home/.claude-code-cn');
    vi.unstubAllEnvs();
  });

  it('binDir returns stateDir/bin', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(binDir()).toBe('/tmp/test-home/.claude-code-cn/bin');
    vi.unstubAllEnvs();
  });

  it('claudeBinPath returns binDir/claude', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeBinPath()).toBe('/tmp/test-home/.claude-code-cn/bin/claude');
    vi.unstubAllEnvs();
  });

  it('claudeSettingsPath returns ~/.claude/settings.json', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeSettingsPath()).toBe('/tmp/test-home/.claude/settings.json');
    vi.unstubAllEnvs();
  });

  it('claudeJsonPath returns ~/.claude.json', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeJsonPath()).toBe('/tmp/test-home/.claude.json');
    vi.unstubAllEnvs();
  });
});
