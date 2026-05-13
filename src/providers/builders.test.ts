import { describe, expect, it } from 'vitest';
import {
  aliyunEnv,
  customEnv,
  deepseekEnv,
  glmEnv,
  kimiCodeEnv,
  mimoEnv,
  minimaxEnv,
  moonshotEnv,
  tencentEnv,
  volcengineEnv,
} from './builders.js';

describe('provider env builders', () => {
  it('kimiCodeEnv', () => {
    expect(kimiCodeEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
      ANTHROPIC_API_KEY: 'K',
      ENABLE_TOOL_SEARCH: 'false',
    });
  });

  it('moonshotEnv', () => {
    expect(moonshotEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'kimi-k2.5',
      ANTHROPIC_SMALL_FAST_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ENABLE_TOOL_SEARCH: 'false',
      API_TIMEOUT_MS: '600000',
    });
  });

  it('deepseekEnv', () => {
    expect(deepseekEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'deepseek-v4-pro[1m]',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'deepseek-v4-pro[1m]',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'deepseek-v4-pro[1m]',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'deepseek-v4-flash',
      CLAUDE_CODE_SUBAGENT_MODEL: 'deepseek-v4-flash',
      CLAUDE_CODE_EFFORT_LEVEL: 'max',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '600000',
    });
  });

  it('glmEnv', () => {
    expect(glmEnv('K')).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5-turbo',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });

  it('minimaxEnv', () => {
    expect(minimaxEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ANTHROPIC_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.7',
    });
  });

  it('aliyunEnv with selected model', () => {
    expect(aliyunEnv('K', 'qwen3.5-plus')).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'qwen3.5-plus',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });

  it('volcengineEnv with selected model', () => {
    expect(volcengineEnv('K', 'doubao-seed-2.0-code')).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://ark.cn-beijing.volces.com/api/coding',
      ANTHROPIC_MODEL: 'doubao-seed-2.0-code',
    });
  });

  it('tencentEnv with selected model', () => {
    expect(tencentEnv('K', 'tc-code-latest（auto）')).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://api.lkeap.cloud.tencent.com/coding/anthropic',
      ANTHROPIC_MODEL: 'tc-code-latest（auto）',
    });
  });

  it('mimoEnv with user-provided baseURL', () => {
    expect(mimoEnv('K', 'https://mimo.example')).toEqual({
      ANTHROPIC_BASE_URL: 'https://mimo.example',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'mimo-v2.5-pro',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '3000000',
    });
  });

  it('customEnv just wires baseURL + token', () => {
    expect(customEnv('K', 'https://custom.example')).toEqual({
      ANTHROPIC_BASE_URL: 'https://custom.example',
      ANTHROPIC_AUTH_TOKEN: 'K',
    });
  });
});
