import { describe, expect, it } from 'vitest';
import { PROVIDER_SPECS, type ProviderSpec } from './specs.js';

describe('PROVIDER_SPECS', () => {
  it('lists 10 providers in the documented order', () => {
    expect(PROVIDER_SPECS.map((s) => s.name)).toEqual([
      'KimiCode',
      'Moonshot (Kimi)',
      'DeepSeek',
      'Zhipu (GLM)',
      'MiniMax',
      'Alibaba Cloud (Qwen)',
      'Volcengine (Doubao)',
      'Tencent Cloud',
      'Xiaomi Mimo',
      'Custom provider',
    ]);
  });

  it('marks NeedClaudeJSON correctly', () => {
    const map: Record<string, boolean> = Object.fromEntries(
      PROVIDER_SPECS.map((s) => [s.name, s.needClaudeJSON]),
    );
    expect(map['Zhipu (GLM)']).toBe(true);
    expect(map.MiniMax).toBe(true);
    expect(map['Volcengine (Doubao)']).toBe(true);
    expect(map['Tencent Cloud']).toBe(true);
    expect(map['Xiaomi Mimo']).toBe(true);
    expect(map.KimiCode).toBe(false);
    expect(map['Custom provider']).toBe(false);
  });

  it('Aliyun has model options with qwen3.5-plus default', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    expect(s.modelOptions).toEqual(['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5']);
    expect(s.modelDefault).toBe('qwen3.5-plus');
  });

  it('Mimo and Custom prompt for baseURL', () => {
    const mimo = PROVIDER_SPECS.find((x) => x.name === 'Xiaomi Mimo') as ProviderSpec;
    const custom = PROVIDER_SPECS.find((x) => x.name === 'Custom provider') as ProviderSpec;
    expect(mimo.baseURLPrompt).toBeTruthy();
    expect(custom.baseURLPrompt).toBeTruthy();
  });

  it('Mimo offers preset baseURL options (按量付费 / Token Plan)', () => {
    const mimo = PROVIDER_SPECS.find((x) => x.name === 'Xiaomi Mimo') as ProviderSpec;
    expect(mimo.baseURLOptions).toEqual([
      { name: '按量付费', value: 'https://api.xiaomimimo.com/anthropic' },
      { name: 'Token Plan', value: 'https://token-plan-cn.xiaomimimo.com/anthropic' },
    ]);
  });

  it('Mimo lists the supported models with mimo-v2.5-pro default', () => {
    const mimo = PROVIDER_SPECS.find((x) => x.name === 'Xiaomi Mimo') as ProviderSpec;
    expect(mimo.modelOptions).toEqual([
      'mimo-v2.5-pro',
      'mimo-v2.5-pro[1m]',
      'mimo-v2.5',
      'mimo-v2.5[1m]',
      'mimo-v2-flash',
    ]);
    expect(mimo.modelDefault).toBe('mimo-v2.5-pro');
  });

  it('Custom provider has no preset baseURL options (still free text)', () => {
    const custom = PROVIDER_SPECS.find((x) => x.name === 'Custom provider') as ProviderSpec;
    expect(custom.baseURLOptions).toBeUndefined();
  });

  it('builds env via buildEnv', () => {
    const km = PROVIDER_SPECS.find((x) => x.name === 'KimiCode') as ProviderSpec;
    expect(km.buildEnv({ apiKey: 'K' })).toMatchObject({ ANTHROPIC_API_KEY: 'K' });
  });

  it('every spec.buildEnv returns a non-empty env when given full args', () => {
    for (const spec of PROVIDER_SPECS) {
      const env = spec.buildEnv({
        apiKey: 'K',
        model: spec.modelDefault ?? 'm',
        baseURL: spec.baseURLOptions?.[0]?.value ?? 'https://example.test',
      });
      expect(Object.keys(env).length).toBeGreaterThan(0);
    }
  });

  it('Mimo buildEnv wires baseURL and model into the env', () => {
    const mimo = PROVIDER_SPECS.find((x) => x.name === 'Xiaomi Mimo') as ProviderSpec;
    const env = mimo.buildEnv({
      apiKey: 'T',
      baseURL: 'https://token-plan-cn.xiaomimimo.com/anthropic',
      model: 'mimo-v2-flash',
    });
    expect(env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://token-plan-cn.xiaomimimo.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'T',
      ANTHROPIC_MODEL: 'mimo-v2-flash',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'mimo-v2-flash',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'mimo-v2-flash',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'mimo-v2-flash',
    });
  });
});
