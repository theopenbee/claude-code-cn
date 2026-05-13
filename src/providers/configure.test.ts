import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

import { confirm, input, select } from '@inquirer/prompts';
import { configureProvider } from './configure.js';

const mockedSelect = vi.mocked(select);
const mockedInput = vi.mocked(input);
const mockedConfirm = vi.mocked(confirm);

let dir: string;
let settingsPath: string;
let claudeJsonPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cfg-'));
  settingsPath = join(dir, 'settings.json');
  claudeJsonPath = join(dir, 'claude.json');
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('configureProvider', () => {
  it('writes settings.json with KimiCode env when chosen', async () => {
    mockedSelect.mockResolvedValueOnce('KimiCode'); // provider
    mockedInput.mockResolvedValueOnce('KIMI_KEY'); // api key

    const result = await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
      ANTHROPIC_API_KEY: 'KIMI_KEY',
    });
    expect(result.wroteClaudeJSON).toBe(false);
  });

  it('prompts for baseURL before key for Custom and writes both', async () => {
    mockedSelect.mockResolvedValueOnce('Custom provider');
    mockedInput
      .mockResolvedValueOnce('https://x.example') // baseURL prompted first
      .mockResolvedValueOnce('TOKEN'); // then key

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://x.example');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('TOKEN');
  });

  it('writes claude.json when provider has needClaudeJSON (GLM)', async () => {
    mockedSelect.mockResolvedValueOnce('Zhipu (GLM)');
    mockedInput.mockResolvedValueOnce('GLM_KEY');

    const result = await configureProvider({ settingsPath, claudeJsonPath });

    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const cjson = JSON.parse(readFileSync(claudeJsonPath, 'utf8'));
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(cjson.hasCompletedOnboarding).toBe(true);
    expect(result.wroteClaudeJSON).toBe(true);
  });

  it('prompts for model selection for Aliyun and writes the chosen model', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)') // provider
      .mockResolvedValueOnce('kimi-k2.5'); // model
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://coding.dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('ALI_KEY');
    expect(out.env.ANTHROPIC_MODEL).toBe('kimi-k2.5');
  });

  it('removes stale provider env keys before writing', async () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: 'old-url',
          ANTHROPIC_API_KEY: 'old-key',
          UNRELATED: 'keep-me',
        },
      }),
    );
    // existing file → confirm("skip?") — answer no
    mockedConfirm.mockResolvedValueOnce(false);
    mockedSelect.mockResolvedValueOnce('DeepSeek');
    mockedInput.mockResolvedValueOnce('DS_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });
    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.UNRELATED).toBe('keep-me');
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('DS_KEY');
    expect(out.env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('skips when user confirms skip', async () => {
    writeFileSync(settingsPath, JSON.stringify({ env: { ANTHROPIC_API_KEY: 'keep' } }));
    mockedConfirm.mockResolvedValueOnce(true);

    await configureProvider({ settingsPath, claudeJsonPath });
    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_API_KEY).toBe('keep');
    expect(mockedSelect).not.toHaveBeenCalled();
  });
});
