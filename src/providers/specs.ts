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
import type { ProviderEnv } from './env-keys.js';

export interface BaseURLOption {
  name: string;
  value: string;
  models?: readonly string[];
  modelDefault?: string;
}

export interface BuildEnvArgs {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export interface ProviderSpec {
  name: string;
  keyPrompt: string;
  baseURLPrompt?: string;
  baseURLOptions?: readonly BaseURLOption[];
  modelOptions?: string[];
  modelDefault?: string;
  needClaudeJSON: boolean;
  buildEnv: (args: BuildEnvArgs) => ProviderEnv;
}

const MIMO_MODELS = [
  'mimo-v2.5-pro',
  'mimo-v2.5-pro[1m]',
  'mimo-v2.5',
  'mimo-v2.5[1m]',
  'mimo-v2-flash',
];

export const PROVIDER_SPECS: readonly ProviderSpec[] = [
  {
    name: 'KimiCode',
    keyPrompt: '请输入 KimiCode API Key',
    needClaudeJSON: false,
    buildEnv: ({ apiKey }) => kimiCodeEnv(apiKey),
  },
  {
    name: 'Moonshot (Kimi)',
    keyPrompt: '请输入 Moonshot API Key',
    needClaudeJSON: false,
    buildEnv: ({ apiKey }) => moonshotEnv(apiKey),
  },
  {
    name: 'DeepSeek',
    keyPrompt: '请输入 DeepSeek API Key',
    needClaudeJSON: false,
    buildEnv: ({ apiKey }) => deepseekEnv(apiKey),
  },
  {
    name: 'Zhipu (GLM)',
    keyPrompt: '请输入 智谱 GLM API Key',
    needClaudeJSON: true,
    buildEnv: ({ apiKey }) => glmEnv(apiKey),
  },
  {
    name: 'MiniMax',
    keyPrompt: '请输入 MiniMax API Key',
    needClaudeJSON: true,
    buildEnv: ({ apiKey }) => minimaxEnv(apiKey),
  },
  {
    name: 'Alibaba Cloud (Qwen)',
    keyPrompt: '请输入 阿里云百炼 API Key',
    baseURLPrompt: '请选择 阿里云 计费方式',
    baseURLOptions: [
      {
        name: 'Token Plan 团队版',
        value: 'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
        models: [
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
        ],
        modelDefault: 'qwen3.6-plus',
      },
      {
        name: 'Coding Plan',
        value: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
        models: ['qwen3.6-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5'],
        modelDefault: 'qwen3.6-plus',
      },
      {
        name: '按量计费',
        value: 'https://dashscope.aliyuncs.com/apps/anthropic',
        models: [
          'qwen3.6-max-preview',
          'qwen3.6-plus',
          'qwen3.6-plus-2026-04-02',
          'qwen3.6-flash',
          'qwen3.6-flash-2026-04-16',
          'deepseek-v4-pro',
          'deepseek-v4-flash',
          'deepseek-v3.2',
          'kimi-k2.6',
          'kimi-k2.5',
          'kimi-k2-thinking',
          'glm-5.1',
          'glm-5',
          'glm-4.7',
          'glm-4.6',
          'MiniMax-M2.5',
          'MiniMax-M2.1',
        ],
        modelDefault: 'qwen3.6-plus',
      },
    ],
    needClaudeJSON: false,
    buildEnv: ({ apiKey, baseURL, model }) => aliyunEnv(apiKey, baseURL ?? '', model ?? ''),
  },
  {
    name: 'Volcengine (Doubao)',
    keyPrompt: '请输入 火山引擎 API Key',
    modelOptions: [
      'doubao-seed-2.0-code',
      'doubao-seed-2.0-pro',
      'doubao-seed-2.0-lite',
      'doubao-seed-code',
      'minimax-latest',
      'glm-5.1',
      'deepseek-v3.2',
      'kimi-k2.6',
    ],
    modelDefault: 'doubao-seed-2.0-code',
    needClaudeJSON: true,
    buildEnv: ({ apiKey, model }) => volcengineEnv(apiKey, model ?? ''),
  },
  {
    name: 'Tencent Cloud',
    keyPrompt: '请输入 腾讯云 API Key',
    modelOptions: [
      'tc-code-latest（auto）',
      'hunyuan-2.0-instruct',
      'hunyuan-2.0-thinking',
      'minimax-m2.5',
      'kimi-k2.5',
      'glm-5',
      'hunyuan-t1',
      'hunyuan-turbos',
    ],
    modelDefault: 'tc-code-latest（auto）',
    needClaudeJSON: true,
    buildEnv: ({ apiKey, model }) => tencentEnv(apiKey, model ?? ''),
  },
  {
    name: 'Xiaomi Mimo',
    keyPrompt: '请输入 小米 Mimo Token',
    baseURLPrompt: '请选择 小米 Mimo 计费方式',
    baseURLOptions: [
      { name: '按量付费', value: 'https://api.xiaomimimo.com/anthropic' },
      { name: 'Token Plan', value: 'https://token-plan-cn.xiaomimimo.com/anthropic' },
    ],
    modelOptions: MIMO_MODELS,
    modelDefault: 'mimo-v2.5-pro',
    needClaudeJSON: true,
    buildEnv: ({ apiKey, baseURL, model }) =>
      mimoEnv(apiKey, baseURL ?? '', model ?? 'mimo-v2.5-pro'),
  },
  {
    name: 'Custom provider',
    keyPrompt: '请输入 自定义 Provider Token',
    baseURLPrompt: '请输入 自定义 Provider Base URL',
    needClaudeJSON: false,
    buildEnv: ({ apiKey, baseURL }) => customEnv(apiKey, baseURL ?? ''),
  },
];
