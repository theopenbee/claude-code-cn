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
    modelOptions: ['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5'],
    modelDefault: 'qwen3.5-plus',
    needClaudeJSON: false,
    buildEnv: ({ apiKey, model }) => aliyunEnv(apiKey, model ?? ''),
  },
  {
    name: 'Volcengine (Doubao)',
    keyPrompt: '请输入 火山引擎 API Key',
    modelOptions: [
      'doubao-seed-2.0-code',
      'doubao-seed-2.0-pro',
      'doubao-seed-2.0-lite',
      'doubao-seed-code',
      'minimax-m2.5',
      'glm-4.7',
      'deepseek-v3.2',
      'kimi-k2.5',
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
