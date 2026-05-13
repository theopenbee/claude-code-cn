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
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
      ENABLE_TOOL_SEARCH: 'false',
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
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5.1',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.1',
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
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.7',
    });
  });

  it('aliyunEnv writes full default model family for Token Plan', () => {
    expect(
      aliyunEnv(
        'K',
        'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
        'qwen3.6-plus',
      ),
    ).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'qwen3.6-plus',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'qwen3.6-plus',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'qwen3.6-plus',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'qwen3.6-plus',
      CLAUDE_CODE_SUBAGENT_MODEL: 'qwen3.6-plus',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });

  it('aliyunEnv wires baseURL for Coding Plan', () => {
    expect(
      aliyunEnv('K', 'https://coding.dashscope.aliyuncs.com/apps/anthropic', 'kimi-k2.5'),
    ).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
    });
  });

  it('aliyunEnv wires baseURL for 按量计费', () => {
    expect(
      aliyunEnv('K', 'https://dashscope.aliyuncs.com/apps/anthropic', 'qwen3.6-max-preview'),
    ).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://dashscope.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'qwen3.6-max-preview',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'qwen3.6-max-preview',
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

  it('mimoEnv with user-provided baseURL and model', () => {
    expect(mimoEnv('K', 'https://mimo.example', 'mimo-v2.5-pro[1m]')).toEqual({
      ANTHROPIC_BASE_URL: 'https://mimo.example',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'mimo-v2.5-pro[1m]',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'mimo-v2.5-pro[1m]',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'mimo-v2.5-pro[1m]',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'mimo-v2.5-pro[1m]',
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
