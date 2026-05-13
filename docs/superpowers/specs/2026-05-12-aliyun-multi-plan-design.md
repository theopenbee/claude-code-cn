# 阿里云百炼多 Plan 适配设计

- 日期：2026-05-12
- 范围：`src/providers/{specs.ts,builders.ts,configure.ts,env-keys.ts}` 及对应单测

## 背景

阿里云百炼（DashScope）的 Anthropic 兼容入口目前有三种计费形态：

| Plan | Base URL | 模型范围 |
|------|----------|----------|
| Token Plan 团队版 | `https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic` | 10 个模型 |
| Coding Plan | `https://coding.dashscope.aliyuncs.com/apps/anthropic` | 4 个模型 |
| 按量计费 | `https://dashscope.aliyuncs.com/apps/anthropic` | 17 个模型（含 preview 与带日期版本） |

仓库当前仅适配 Coding Plan，且只写 `ANTHROPIC_MODEL` 而未写 `ANTHROPIC_DEFAULT_*` / `CLAUDE_CODE_SUBAGENT_MODEL`，与官方推荐的环境变量配置不一致。

## 目标

1. 用户运行 `ccc env` 选到 `Alibaba Cloud (Qwen)` 时，能先选 Plan，再看到当前 Plan 支持的模型清单。
2. 写出的 `~/.claude/settings.json` 与官方文档示例完全一致（包括 `ANTHROPIC_DEFAULT_HAIKU_MODEL / SONNET_MODEL / OPUS_MODEL / CLAUDE_CODE_SUBAGENT_MODEL`）。
3. 其它 Provider（特别是 Mimo，与本特性共用 `baseURLOptions`）零行为变更。

## 非目标

- 不动其它 Provider 的 env 字段。
- 不引入"自定义模型名"输入框；当前所有 Plan 的模型集是封闭枚举。
- 不在本期处理"按量计费下选 preview 模型时给出风险提示"之类的 UX。

## 设计

### 1. `BaseURLOption` 扩展（`src/providers/specs.ts`）

为 `BaseURLOption` 增加可选的 `models` 与 `modelDefault`：

```ts
export interface BaseURLOption {
  name: string;
  value: string;
  models?: readonly string[];
  modelDefault?: string;
}
```

兼容性：现有 Mimo 的 `baseURLOptions` 不带 `models`，运行时继续走顶层 `spec.modelOptions`，行为不变。

### 2. 阿里云 spec 重写

```ts
{
  name: 'Alibaba Cloud (Qwen)',
  keyPrompt: '请输入 阿里云百炼 API Key',
  baseURLPrompt: '请选择 阿里云 计费方式',
  baseURLOptions: [
    {
      name: 'Token Plan 团队版',
      value: 'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
      models: [
        'qwen3.6-plus', 'qwen3.6-flash',
        'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-v3.2',
        'kimi-k2.6', 'kimi-k2.5',
        'glm-5.1', 'glm-5',
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
        'qwen3.6-plus', 'qwen3.6-plus-2026-04-02',
        'qwen3.6-flash', 'qwen3.6-flash-2026-04-16',
        'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-v3.2',
        'kimi-k2.6', 'kimi-k2.5', 'kimi-k2-thinking',
        'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6',
        'MiniMax-M2.5', 'MiniMax-M2.1',
      ],
      modelDefault: 'qwen3.6-plus',
    },
  ],
  needClaudeJSON: false,
  buildEnv: ({ apiKey, baseURL, model }) => aliyunEnv(apiKey, baseURL ?? '', model ?? ''),
}
```

顶层 `modelOptions / modelDefault` 删除。

### 3. `aliyunEnv` 重写（`src/providers/builders.ts`）

签名从 `(apiKey, model)` 改为 `(apiKey, baseURL, model)`，不再走 `standardEnv`：

```ts
export function aliyunEnv(apiKey: string, baseURL: string, model: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_MODEL: model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: model,
    CLAUDE_CODE_SUBAGENT_MODEL: model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}
```

`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 与其它 CN provider（GLM/MiniMax/Mimo/Volcengine/Tencent）保持一致。

### 4. `configure.ts` 流程

baseURL 选完后，若命中的 `BaseURLOption` 带 `models`，用它覆盖顶层模型列表与默认值：

```ts
let modelOptions = spec.modelOptions;
let modelDefault = spec.modelDefault;
if (spec.baseURLOptions && baseURL) {
  const chosen = spec.baseURLOptions.find((o) => o.value === baseURL);
  if (chosen?.models) {
    modelOptions = [...chosen.models];
    modelDefault = chosen.modelDefault;
  }
}
```

提示顺序保持不变：Plan → API Key → Model。

### 5. `env-keys.ts`

`PROVIDER_ENV_KEYS` 已包含本特性涉及的全部键（`ANTHROPIC_AUTH_TOKEN / BASE_URL / MODEL / DEFAULT_HAIKU_MODEL / DEFAULT_SONNET_MODEL / DEFAULT_OPUS_MODEL / CLAUDE_CODE_SUBAGENT_MODEL / CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`），切换 Provider 时残留键的清理逻辑无需调整。

## 测试

- `builders.test.ts`：覆盖三个 Plan 的 baseURL，断言每个键值（特别是 `ANTHROPIC_DEFAULT_*` 与 `CLAUDE_CODE_SUBAGENT_MODEL` 都等于所选 model）。
- `specs.test.ts`：断言阿里云 spec 含三个 `baseURLOptions`，且每项 `models` 长度与 modelDefault 命中其中之一。
- `configure.test.ts`：模拟用户选不同 Plan，断言后续模型选择列表来源于该 Plan 的 `models` 而非顶层 `modelOptions`；保留 Mimo 既有用例不变（验证向后兼容）。

## 回滚

单点变更，回滚即 revert 单个 PR。`settings.json` 中残留的旧键由 `PROVIDER_ENV_KEYS` 清理逻辑自然处理，用户重跑 `ccc env` 即可恢复。
