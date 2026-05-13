import type { ProviderEnv } from './env-keys.js';

interface SingleModelExtras {
  subagent?: boolean;
  apiTimeoutMs?: string;
  disableNonessentialTraffic?: boolean;
  enableToolSearch?: 'true' | 'false';
}

function singleModelEnv(
  baseURL: string,
  apiKey: string,
  model: string,
  extras: SingleModelExtras = {},
): ProviderEnv {
  const env: ProviderEnv = {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_MODEL: model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: model,
  };
  if (extras.subagent) env.CLAUDE_CODE_SUBAGENT_MODEL = model;
  if (extras.disableNonessentialTraffic) env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  if (extras.apiTimeoutMs) env.API_TIMEOUT_MS = extras.apiTimeoutMs;
  if (extras.enableToolSearch !== undefined) env.ENABLE_TOOL_SEARCH = extras.enableToolSearch;
  return env;
}

export function kimiCodeEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
    ANTHROPIC_API_KEY: apiKey,
    ENABLE_TOOL_SEARCH: 'false',
  };
}

export function moonshotEnv(apiKey: string): ProviderEnv {
  return singleModelEnv('https://api.moonshot.cn/anthropic', apiKey, 'kimi-k2.5', {
    subagent: true,
    enableToolSearch: 'false',
  });
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
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5.1',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.1',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
    API_TIMEOUT_MS: '3000000',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function minimaxEnv(apiKey: string): ProviderEnv {
  return singleModelEnv('https://api.minimaxi.com/anthropic', apiKey, 'MiniMax-M2.7', {
    apiTimeoutMs: '3000000',
    disableNonessentialTraffic: true,
  });
}

export function standardEnv(baseURL: string, apiKey: string, model: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_MODEL: model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function aliyunEnv(apiKey: string, baseURL: string, model: string): ProviderEnv {
  return singleModelEnv(baseURL, apiKey, model, {
    subagent: true,
    disableNonessentialTraffic: true,
  });
}

export function volcengineEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://ark.cn-beijing.volces.com/api/coding', apiKey, model);
}

export function mimoEnv(apiKey: string, baseURL: string, model: string): ProviderEnv {
  return singleModelEnv(baseURL, apiKey, model, {
    apiTimeoutMs: '3000000',
    disableNonessentialTraffic: true,
  });
}

export function customEnv(apiKey: string, baseURL: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_AUTH_TOKEN: apiKey,
  };
}
