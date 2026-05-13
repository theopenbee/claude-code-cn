# 阿里云百炼多 Plan 适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `ccc env` 在选择阿里云时先选 Token Plan 团队版 / Coding Plan / 按量计费，再展示该 Plan 对应的模型列表，写出与官方示例完全一致的 `~/.claude/settings.json`。

**Architecture:** 给 `BaseURLOption` 加可选 `models / modelDefault`，让每个 Plan 自带模型清单；`configure.ts` 在选完 baseURL 后用对应 Plan 的模型清单覆盖顶层 `modelOptions`；`aliyunEnv` 扩展为接收 baseURL 并写齐 `ANTHROPIC_DEFAULT_HAIKU_MODEL / SONNET_MODEL / OPUS_MODEL / CLAUDE_CODE_SUBAGENT_MODEL`。

**Tech Stack:** TypeScript, Vitest, @inquirer/prompts, Biome。

参考 spec：`docs/superpowers/specs/2026-05-12-aliyun-multi-plan-design.md`

---

### Task 1: 扩展 `BaseURLOption` 类型

**Files:**
- Modify: `src/providers/specs.ts` (BaseURLOption interface)

- [ ] **Step 1: 修改类型**

把 `src/providers/specs.ts` 顶部的 `BaseURLOption` 定义改为：

```ts
export interface BaseURLOption {
  name: string;
  value: string;
  models?: readonly string[];
  modelDefault?: string;
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: PASS（Mimo 不带 `models` 仍然合法，因为新增字段都是可选的）

- [ ] **Step 3: Commit**

```bash
git add src/providers/specs.ts
git commit -m "refactor(specs): allow per-baseURL model lists on BaseURLOption"
```

---

### Task 2: 改写 `aliyunEnv` builder（TDD：先改测试）

**Files:**
- Modify: `src/providers/builders.test.ts:77-84` (aliyun test)
- Modify: `src/providers/builders.ts:73-75` (aliyunEnv body + signature)

- [ ] **Step 1: 用新签名/新键集重写失败的测试**

把 `src/providers/builders.test.ts` 里现有的 aliyun 用例：

```ts
  it('aliyunEnv with selected model', () => {
    expect(aliyunEnv('K', 'qwen3.5-plus')).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'qwen3.5-plus',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });
```

替换为三个分 Plan 的用例：

```ts
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
```

- [ ] **Step 2: 运行 builders 测试，确认失败**

Run: `pnpm vitest run src/providers/builders.test.ts`
Expected: FAIL — TypeScript 报参数数量不对，或断言不通过。

- [ ] **Step 3: 改写 `aliyunEnv` 实现**

把 `src/providers/builders.ts` 中的：

```ts
export function aliyunEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://coding.dashscope.aliyuncs.com/apps/anthropic', apiKey, model);
}
```

改为：

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

注：保留 `standardEnv` 不动（Volcengine / Tencent 仍在用）。

- [ ] **Step 4: 运行 builders 测试，确认通过**

Run: `pnpm vitest run src/providers/builders.test.ts`
Expected: PASS（aliyun 三个用例 + 其它原有用例）。

注：此时 `specs.ts` 中 `aliyunEnv(apiKey, model ?? '')` 调用还是旧签名，TS 会报错 — 这是预期的，下一个 Task 一起修。先不跑 `pnpm typecheck`。

- [ ] **Step 5: 暂不提交**

留到 Task 3 一起改完 specs.ts 后做一次"builder + spec"原子提交，避免中间状态 typecheck 红。

---

### Task 3: 重写阿里云 spec（TDD：先改测试）

**Files:**
- Modify: `src/providers/specs.test.ts:33-37` (旧 aliyun 用例)
- Modify: `src/providers/specs.ts:77-83` (aliyun spec)

- [ ] **Step 1: 用新结构重写失败的测试**

把 `src/providers/specs.test.ts` 中：

```ts
  it('Aliyun has model options with qwen3.5-plus default', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    expect(s.modelOptions).toEqual(['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5']);
    expect(s.modelDefault).toBe('qwen3.5-plus');
  });
```

替换为：

```ts
  it('Aliyun offers three plan baseURL options with their own model lists', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    expect(s.baseURLPrompt).toBeTruthy();
    expect(s.baseURLOptions?.map((o) => o.name)).toEqual([
      'Token Plan 团队版',
      'Coding Plan',
      '按量计费',
    ]);
    expect(s.baseURLOptions?.map((o) => o.value)).toEqual([
      'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
      'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      'https://dashscope.aliyuncs.com/apps/anthropic',
    ]);
    expect(s.modelOptions).toBeUndefined();
    expect(s.modelDefault).toBeUndefined();
  });

  it('Aliyun Token Plan lists all 10 models with qwen3.6-plus default', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    const plan = s.baseURLOptions?.find((o) => o.name === 'Token Plan 团队版');
    expect(plan?.modelDefault).toBe('qwen3.6-plus');
    expect(plan?.models).toEqual([
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
    ]);
  });

  it('Aliyun Coding Plan lists 4 models with qwen3.6-plus default', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    const plan = s.baseURLOptions?.find((o) => o.name === 'Coding Plan');
    expect(plan?.modelDefault).toBe('qwen3.6-plus');
    expect(plan?.models).toEqual(['qwen3.6-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5']);
  });

  it('Aliyun 按量计费 lists 17 models including preview and dated versions', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    const plan = s.baseURLOptions?.find((o) => o.name === '按量计费');
    expect(plan?.modelDefault).toBe('qwen3.6-plus');
    expect(plan?.models).toEqual([
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
    ]);
  });
```

- [ ] **Step 2: 运行 specs 测试，确认失败**

Run: `pnpm vitest run src/providers/specs.test.ts`
Expected: FAIL — 新用例都找不到 baseURLOptions/models。

- [ ] **Step 3: 重写 aliyun spec**

把 `src/providers/specs.ts` 中 `Alibaba Cloud (Qwen)` 条目（行 76-83）替换为：

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
```

注意：移除原来的 `modelOptions / modelDefault` 顶层字段；`buildEnv` 改为透传 `baseURL`。

- [ ] **Step 4: 运行 specs 测试 + typecheck**

Run: `pnpm vitest run src/providers/specs.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 跑一次全量 builders + specs 套件**

Run: `pnpm vitest run src/providers/builders.test.ts src/providers/specs.test.ts`
Expected: PASS（验证 Task 2 与 Task 3 的改动是自洽的）。

- [ ] **Step 6: Commit**

```bash
git add src/providers/builders.ts src/providers/builders.test.ts src/providers/specs.ts src/providers/specs.test.ts
git commit -m "feat(aliyun): support Token Plan / Coding Plan / 按量计费 with per-plan models"
```

---

### Task 4: 让 `configure.ts` 用 Plan 对应的模型列表（TDD：先改测试）

**Files:**
- Modify: `src/providers/configure.test.ts:75-87` (旧 aliyun 用例)
- Modify: `src/providers/configure.ts:46-74` (选 baseURL 后填充 modelOptions)

- [ ] **Step 1: 重写失败的 aliyun configure 用例**

把 `src/providers/configure.test.ts` 中：

```ts
  it('prompts for model selection for Aliyun and writes the chosen model', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)') // provider
      .mockResolvedValueOnce('kimi-k2.5'); // model
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://coding.dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('ALI_KEY');
    expect(out.env.ANTHROPIC_MODEL).toBe('kimi-k2.5');
  });
```

替换为：

```ts
  it('Aliyun Coding Plan: prompts plan → key → model and writes coding base URL', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)') // provider
      .mockResolvedValueOnce('https://coding.dashscope.aliyuncs.com/apps/anthropic') // plan
      .mockResolvedValueOnce('kimi-k2.5'); // model
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://coding.dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('ALI_KEY');
    expect(out.env.ANTHROPIC_MODEL).toBe('kimi-k2.5');
    expect(out.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('kimi-k2.5');
    expect(out.env.CLAUDE_CODE_SUBAGENT_MODEL).toBe('kimi-k2.5');
  });

  it('Aliyun Token Plan: model select offers Token Plan models only', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)')
      .mockResolvedValueOnce('https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic')
      .mockResolvedValueOnce('deepseek-v4-pro');
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe(
      'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
    );
    expect(out.env.ANTHROPIC_MODEL).toBe('deepseek-v4-pro');

    // 第 3 次 select 调用（model）拿到的 choices 必须来源于 Token Plan 的 models
    const modelCall = mockedSelect.mock.calls[2][0] as {
      choices: Array<{ value: string }>;
      default?: string;
    };
    expect(modelCall.choices.map((c) => c.value)).toEqual([
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
    ]);
    expect(modelCall.default).toBe('qwen3.6-plus');
  });

  it('Aliyun 按量计费: model select offers pay-as-you-go list including preview', async () => {
    mockedSelect
      .mockResolvedValueOnce('Alibaba Cloud (Qwen)')
      .mockResolvedValueOnce('https://dashscope.aliyuncs.com/apps/anthropic')
      .mockResolvedValueOnce('qwen3.6-max-preview');
    mockedInput.mockResolvedValueOnce('ALI_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://dashscope.aliyuncs.com/apps/anthropic');
    expect(out.env.ANTHROPIC_MODEL).toBe('qwen3.6-max-preview');

    const modelCall = mockedSelect.mock.calls[2][0] as {
      choices: Array<{ value: string }>;
    };
    expect(modelCall.choices.map((c) => c.value)).toContain('qwen3.6-max-preview');
    expect(modelCall.choices.map((c) => c.value)).toContain('MiniMax-M2.1');
    expect(modelCall.choices.length).toBe(17);
  });
```

- [ ] **Step 2: 运行 configure 测试，确认失败**

Run: `pnpm vitest run src/providers/configure.test.ts`
Expected: FAIL — 顶层 `modelOptions` 为 undefined，模型选择被跳过；token plan / 按量计费用例的 select 顺序与现在的实现也对不上。

- [ ] **Step 3: 在 `configure.ts` 中加入 baseURL → models 覆盖逻辑**

`src/providers/configure.ts` 当前从行 46 开始的 baseURL 选择段之后，是 `const apiKey = ...` 然后 `const modelOptions = spec.modelOptions;`。把这一段（从 baseURL 选择结束到 model 选择结束）改为：

```ts
  let baseURL: string | undefined;
  if (spec.baseURLPrompt) {
    const message = spec.baseURLPrompt;
    const baseURLOptions = spec.baseURLOptions;
    if (baseURLOptions && baseURLOptions.length > 0) {
      baseURL = await ask(() =>
        select({
          message,
          choices: baseURLOptions.map((o) => ({ name: o.name, value: o.value })),
        }),
      );
    } else {
      baseURL = await ask(() => input({ message }));
    }
  }

  const apiKey = await ask(() => input({ message: spec.keyPrompt }));

  let modelOptions = spec.modelOptions;
  let modelDefault = spec.modelDefault;
  if (spec.baseURLOptions && baseURL) {
    const chosen = spec.baseURLOptions.find((o) => o.value === baseURL);
    if (chosen?.models) {
      modelOptions = [...chosen.models];
      modelDefault = chosen.modelDefault;
    }
  }

  let model: string | undefined;
  if (modelOptions && modelOptions.length > 0) {
    model = await ask(() =>
      select({
        message: '请选择模型',
        choices: modelOptions.map((m) => ({ name: m, value: m })),
        default: modelDefault,
      }),
    );
  }
```

注意：原代码中 `const modelOptions = spec.modelOptions;` 是 const，新代码必须用 `let` 才能被 plan-specific 列表覆盖；`spec.modelDefault` 也要 lift 到 `let modelDefault`。

- [ ] **Step 4: 跑 configure 测试**

Run: `pnpm vitest run src/providers/configure.test.ts`
Expected: PASS。

- [ ] **Step 5: 跑全量测试 + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全部 PASS。

注：覆盖率门槛若有失败请贴回报错；本次改动应不会降低覆盖率，aliyun 路径反而新增了三条用例。

- [ ] **Step 6: Commit**

```bash
git add src/providers/configure.ts src/providers/configure.test.ts
git commit -m "feat(configure): drive model list from selected baseURL option"
```

---

### Task 5: 端到端校对（手工 dry-run）

**Files:** 无修改。仅做一次构建 + 静态校验。

- [ ] **Step 1: 构建**

Run: `pnpm build`
Expected: PASS，`dist/cli.js` 重新生成。

- [ ] **Step 2: 比对生成的 env 与官方示例**

打开 `src/providers/builders.ts` 中的 `aliyunEnv`，对照 spec 文档里官方给的三段 JSON：键集合需为
`ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL / ANTHROPIC_MODEL / ANTHROPIC_DEFAULT_HAIKU_MODEL / ANTHROPIC_DEFAULT_SONNET_MODEL / ANTHROPIC_DEFAULT_OPUS_MODEL / CLAUDE_CODE_SUBAGENT_MODEL`，且对应值与所选 model 一致。本仓库额外保留的 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'` 是项目内其它 CN provider 的统一做法，不与官方示例冲突。

无文件修改，无需 commit。

---

## 自检（已在写完后做过一次）

- 覆盖：spec 中"类型扩展 / spec / builder / configure / env-keys / 测试"六处，分别对应 Task 1 / 3 / 2 / 4 / —（env-keys 已含所需键，无需改）/ 2 & 3 & 4。
- 类型一致性：`aliyunEnv(apiKey, baseURL, model)` 在 builder、specs 和测试中签名一致；`BaseURLOption.models` 在 specs、configure、specs.test 中字段名一致。
- 无占位符。
