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

  it('builds env via buildEnv', () => {
    const km = PROVIDER_SPECS.find((x) => x.name === 'KimiCode') as ProviderSpec;
    expect(km.buildEnv('K', '')).toMatchObject({ ANTHROPIC_API_KEY: 'K' });
  });
});
