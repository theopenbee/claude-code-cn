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

export interface ProviderSpec {
  name: string;
  keyPrompt: string;
  baseURLPrompt?: string;
  modelOptions?: string[];
  modelDefault?: string;
  needClaudeJSON: boolean;
  buildEnv: (apiKey: string, modelOrBaseURL: string) => ProviderEnv;
}

export const PROVIDER_SPECS: readonly ProviderSpec[] = [
  {
    name: 'KimiCode',
    keyPrompt: '请输入 KimiCode API Key',
    needClaudeJSON: false,
    buildEnv: kimiCodeEnv,
  },
  {
    name: 'Moonshot (Kimi)',
    keyPrompt: '请输入 Moonshot API Key',
    needClaudeJSON: false,
    buildEnv: moonshotEnv,
  },
  {
    name: 'DeepSeek',
    keyPrompt: '请输入 DeepSeek API Key',
    needClaudeJSON: false,
    buildEnv: deepseekEnv,
  },
  {
    name: 'Zhipu (GLM)',
    keyPrompt: '请输入 智谱 GLM API Key',
    needClaudeJSON: true,
    buildEnv: glmEnv,
  },
  {
    name: 'MiniMax',
    keyPrompt: '请输入 MiniMax API Key',
    needClaudeJSON: true,
    buildEnv: minimaxEnv,
  },
  {
    name: 'Alibaba Cloud (Qwen)',
    keyPrompt: '请输入 阿里云百炼 API Key',
    modelOptions: ['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5'],
    modelDefault: 'qwen3.5-plus',
    needClaudeJSON: false,
    buildEnv: aliyunEnv,
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
    buildEnv: volcengineEnv,
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
    buildEnv: tencentEnv,
  },
  {
    name: 'Xiaomi Mimo',
    keyPrompt: '请输入 小米 Mimo Token',
    baseURLPrompt: '请输入 小米 Mimo Base URL',
    needClaudeJSON: true,
    buildEnv: mimoEnv,
  },
  {
    name: 'Custom provider',
    keyPrompt: '请输入 自定义 Provider Token',
    baseURLPrompt: '请输入 自定义 Provider Base URL',
    needClaudeJSON: false,
    buildEnv: customEnv,
  },
];
