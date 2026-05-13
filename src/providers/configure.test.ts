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

  it('Aliyun Coding Plan: prompts plan → key → model and writes coding base URL', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)') // provider
      .mockResolvedValueOnce('https://coding.dashscope.aliyuncs.com/apps/anthropic') // plan
      .mockResolvedValueOnce('kimi-k2.5'); // model
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://coding.dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('ALI_KEY');
    expect(out.env.ANTHROPIC_MODEL).toBe('kimi-k2.5');
    expect(out.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('kimi-k2.5');
    expect(out.env.CLAUDE_CODE_SUBAGENT_MODEL).toBe('kimi-k2.5');
  });

  it('Aliyun Token Plan: model select offers Token Plan models only', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)')
      .mockResolvedValueOnce('https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic')
      .mockResolvedValueOnce('deepseek-v4-pro');
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe(
      'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
    );
    expect(out.env.ANTHROPIC_MODEL).toBe('deepseek-v4-pro');

    const modelCall = mockedSelect.mock.calls[2]?.[0] as unknown as {
      choices: ReadonlyArray<{ value: string }>;
      default?: string;
    };
    expect(modelCall.choices.map((c) => c.value)).toEqual([
      'qwen3.6-plus',
      'qwen3.6-flash',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'deepseek-v3.2',
      'kimi-k2.6',
      'kimi-k2.5',
      'glm-5.1',
      'glm-5',
      'MiniMax-M2.5',
    ]);
    expect(modelCall.default).toBe('qwen3.6-plus');
  });

  it('Aliyun 按量计费: model select offers pay-as-you-go list including preview', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)')
      .mockResolvedValueOnce('https://dashscope.aliyuncs.com/apps/anthropic')
      .mockResolvedValueOnce('qwen3.6-max-preview');
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_MODEL).toBe('qwen3.6-max-preview');

    const modelCall = mockedSelect.mock.calls[2]?.[0] as unknown as {
      choices: ReadonlyArray<{ value: string }>;
    };
    expect(modelCall.choices.map((c) => c.value)).toContain('qwen3.6-max-preview');
    expect(modelCall.choices.map((c) => c.value)).toContain('MiniMax-M2.1');
    expect(modelCall.choices.length).toBe(17);
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

  it('uses select for Xiaomi Mimo baseURL and model and writes both', async () => {
    mockedSelect
      .mockResolvedValueOnce('Xiaomi Mimo') // provider
      .mockResolvedValueOnce('https://token-plan-cn.xiaomimimo.com/anthropic') // baseURL choice
      .mockResolvedValueOnce('mimo-v2.5-pro[1m]'); // model choice
    mockedInput.mockResolvedValueOnce('MIMO_KEY');

    const result = await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://token-plan-cn.xiaomimimo.com/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('MIMO_KEY');
    expect(out.env.ANTHROPIC_MODEL).toBe('mimo-v2.5-pro[1m]');
    expect(out.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('mimo-v2.5-pro[1m]');
    expect(result.wroteClaudeJSON).toBe(true);
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
