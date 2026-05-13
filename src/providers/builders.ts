import type { ProviderEnv } from './env-keys.js';

export function kimiCodeEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
    ANTHROPIC_API_KEY: apiKey,
    ENABLE_TOOL_SEARCH: 'false',
  };
}

export function moonshotEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: 'kimi-k2.5',
    ANTHROPIC_SMALL_FAST_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2.5',
    CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ENABLE_TOOL_SEARCH: 'false',
    API_TIMEOUT_MS: '600000',
  };
}

export function deepseekEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: 'deepseek-v4-pro[1m]',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'deepseek-v4-pro[1m]',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'deepseek-v4-pro[1m]',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'deepseek-v4-flash',
    CLAUDE_CODE_SUBAGENT_MODEL: 'deepseek-v4-flash',
    CLAUDE_CODE_EFFORT_LEVEL: 'max',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    API_TIMEOUT_MS: '600000',
  };
}

export function glmEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5-turbo',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
    API_TIMEOUT_MS: '3000000',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function minimaxEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    API_TIMEOUT_MS: '3000000',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.7',
  };
}

function standardEnv(baseURL: string, apiKey: string, model: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_MODEL: model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function aliyunEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://coding.dashscope.aliyuncs.com/apps/anthropic', apiKey, model);
}

export function volcengineEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://ark.cn-beijing.volces.com/api/coding', apiKey, model);
}

export function tencentEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://api.lkeap.cloud.tencent.com/coding/anthropic', apiKey, model);
}

export function mimoEnv(apiKey: string, baseURL: string, model: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    API_TIMEOUT_MS: '3000000',
  };
}

export function customEnv(apiKey: string, baseURL: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_AUTH_TOKEN: apiKey,
  };
}
