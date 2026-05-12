# claude-code-cn 设计稿

- 包名：`@theopenbee/claude-code-cn`
- 可执行命令：`ccc`
- 日期：2026-05-12
- 状态：待评审

## 1. 目标与范围

为中国大陆用户提供 Claude Code 二进制的快速下载与 Provider 配置工具。功能 1:1 对齐参考项目 `github.com/theopenbee/openbee2` 中 `openbee claude download` 与 `openbee claude env` 的行为，去除 GitHub 下载分支，默认走大陆 CDN。

MVP 仅包含两条子命令：

- `ccc download` — 下载 Claude Code 二进制到 `~/.claude-code-cn/bin/claude`
- `ccc env` — 交互式选择 Provider，写入 `~/.claude/settings.json`（及部分场景下的 `~/.claude.json`）

非目标（本期不做）：图形界面、Windows 支持、自升级（`ccc self-update`）、多版本管理、Provider Key 的安全存储（仅写入 settings.json 与上游保持一致）。

## 2. CLI 设计

### 2.1 命令树

```
ccc
├── download [--force] [--cdn-url <url>]
└── env
```

参数说明：
- `--force`：强制重新下载，即使 `~/.claude-code-cn/bin/claude` 已存在
- `--cdn-url <url>`：覆盖默认 CDN 根地址（默认 `https://dl.theopenbee.cn`）

### 2.2 退出码

- `0`：成功；或 `download` 时发现已存在二进制并跳过；或交互被 Ctrl+C 取消
- `1`：业务错误（下载失败、校验失败、写入失败、当前平台不支持等）

## 3. `ccc download` 流程

1. 解析 flags，确定 CDN 根 URL。
2. 检测平台 `(os, arch, variant)`：
   - `os`：`process.platform` → `darwin` / `linux`，其它一律退出报"不支持"
   - `arch`：`process.arch` → `arm64`、`x64`（`x64` 由 Node `x64` 直接对应，参考实现 amd64→x64 在 Node 上已是 x64）
   - `variant`：仅 linux 时检查 `/lib/ld-musl-*.so*` 是否存在；命中则 `musl`
3. 检查目标路径 `~/.claude-code-cn/bin/claude`：
   - 存在且未 `--force` → 打印"已安装，使用 --force 重新下载" → 退出 0
4. 拉取最新版本：GET `<cdn>/claude-code-releases/latest.txt`，解析为形如 `v1.2.3` 或 `1.2.3` 的纯文本版本号，归一化为带 `v` 前缀。
5. 构造 URL：
   - 校验和：`<cdn>/claude-code-releases/<version-no-v>/checksums-sha256.txt`
   - 二进制：`<cdn>/claude-code-releases/<version-no-v>/<os>-<arch>[-musl]/claude`
6. 下载到临时目录 `os.tmpdir()/claude-code-cn-<rand>/`：
   - 先下载校验和（失败则警告并跳过校验，与参考项目一致）
   - 流式下载二进制到 `<dest>.tmp`，同时用 `node:crypto` 的 `createHash('sha256')` 边写边算
   - 显示 `cli-progress` 进度条
7. 校验：从 `checksums-sha256.txt` 中找到 `claude-<version-no-v>-<os>-<arch>[-musl]` 这一行，比对 hex
8. `chmod 0o755`，原子 `rename` 到最终路径
9. 打印 `Claude 已安装到: <path>` 与 `请将 ~/.claude-code-cn/bin 加入 PATH，例如：\n  export PATH="$HOME/.claude-code-cn/bin:$PATH"`

### 3.1 支持平台

```
darwin-arm64
darwin-x64
linux-arm64
linux-x64
linux-arm64-musl
linux-x64-musl
```

其它（包括 Windows、freebsd、linux 32 位）一律拒绝并提示手动安装。

## 4. `ccc env` 流程

1. 检测 `~/.claude/settings.json` 是否存在：若存在，先 `confirm`（默认 Yes）询问"已检测到现有配置，是否跳过？"。跳过则退出 0。
2. `select` Provider（10 个，与上游一致，见 §4.1）。
3. 按 Provider 的 spec 顺序询问：
   - Mimo / Custom：先问 Base URL，再问 API Key
   - Aliyun / Volcengine / Tencent：问 API Key，然后 `select` 模型
   - 其余：仅问 API Key
4. 构造该 Provider 的 env map（见 §4.2）。
5. 合并写入 `~/.claude/settings.json`：
   - 读现有 JSON，定位 `env` 子对象
   - 先删掉所有"已知 provider 变量键"（清理上一次的残留）
   - 再写入新 env map
   - JSON 缩进 2 空格，末尾保留换行
6. 若 Provider 标记 `NeedClaudeJSON=true`（GLM/MiniMax/Volcengine/Tencent/Mimo），合并写入 `~/.claude.json` 的 `hasCompletedOnboarding=true`，其余字段保持原样。
7. 打印"已写入 ~/.claude/settings.json"（如适用再加一行 ~/.claude.json）。
8. Ctrl+C：用 inquirer 的 cancelled 异常映射为 `ErrInterrupted`，静默退出 0。

### 4.1 Provider 列表

| 显示名 | 需要模型选择 | 需要 BaseURL 输入 | 写 `~/.claude.json` |
|---|---|---|---|
| KimiCode | 否 | 否 | 否 |
| Moonshot (Kimi) | 否 | 否 | 否 |
| DeepSeek | 否 | 否 | 否 |
| Zhipu (GLM) | 否 | 否 | 是 |
| MiniMax | 否 | 否 | 是 |
| Alibaba Cloud (Qwen) | 是 | 否 | 否 |
| Volcengine (Doubao) | 是 | 否 | 是 |
| Tencent Cloud | 是 | 否 | 是 |
| Xiaomi Mimo | 否 | 是 | 是 |
| Custom provider | 否 | 是 | 否 |

### 4.2 Provider env map

| Provider | 关键变量 | 备注 |
|---|---|---|
| KimiCode | `ANTHROPIC_BASE_URL=https://api.kimi.com/coding/`, `ANTHROPIC_API_KEY=<key>`, `ENABLE_TOOL_SEARCH=false` | 用 `API_KEY` 而非 `AUTH_TOKEN` |
| Moonshot | `ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic`, `ANTHROPIC_AUTH_TOKEN=<key>`, model 全套写为 `kimi-k2.5`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `ENABLE_TOOL_SEARCH=false`, `API_TIMEOUT_MS=600000` | |
| DeepSeek | `ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`, `ANTHROPIC_AUTH_TOKEN=<key>`, `ANTHROPIC_MODEL=deepseek-chat`, `ANTHROPIC_SMALL_FAST_MODEL=deepseek-chat`, disable nonessential, `API_TIMEOUT_MS=600000` | |
| GLM | `ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic`, haiku=glm-4.5-air, sonnet=glm-5-turbo, opus=glm-5.1, `API_TIMEOUT_MS=3000000` | |
| MiniMax | `ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic`, model 全套=MiniMax-M2.7, `API_TIMEOUT_MS=3000000` | |
| Aliyun (Qwen) | `ANTHROPIC_BASE_URL=https://coding.dashscope.aliyuncs.com/apps/anthropic`, `ANTHROPIC_MODEL=<选中>` | 模型: qwen3.5-plus / kimi-k2.5 / glm-5 / MiniMax-M2.5；默认 qwen3.5-plus |
| Volcengine | `ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/coding`, `ANTHROPIC_MODEL=<选中>` | 默认 doubao-seed-2.0-code，可选见 §A |
| Tencent | `ANTHROPIC_BASE_URL=https://api.lkeap.cloud.tencent.com/coding/anthropic`, `ANTHROPIC_MODEL=<选中>` | 默认 tc-code-latest（auto） |
| Mimo | `ANTHROPIC_BASE_URL=<用户输入>`, `ANTHROPIC_AUTH_TOKEN=<key>`, model 全套=mimo-v2.5-pro, `API_TIMEOUT_MS=3000000` | |
| Custom | `ANTHROPIC_BASE_URL=<用户输入>`, `ANTHROPIC_AUTH_TOKEN=<key>` | 不写模型与超时 |

完整 env key 与字面值以参考实现 `internal/ai/engine/claude/provider.go` 为准；本设计要求 1:1 对齐。

### 4.3 已知 provider 变量键

写入前会先 `delete` 这一组 key：

```
ANTHROPIC_AUTH_TOKEN
ANTHROPIC_API_KEY
ANTHROPIC_BASE_URL
ANTHROPIC_MODEL
ANTHROPIC_SMALL_FAST_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL
CLAUDE_CODE_SUBAGENT_MODEL
ENABLE_TOOL_SEARCH
API_TIMEOUT_MS
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
```

## 5. 模块划分

每个模块单一职责，可独立测试：

```
src/
├── cli.ts                # 入口，shebang，commander 注册子命令
├── commands/
│   ├── download.ts       # download 子命令：参数 → service.download → 打印
│   └── env.ts            # env 子命令：providerPicker → service.writeSettings
├── core/
│   ├── platform.ts       # detectPlatform()、isSupported()、isMusl()、buildAssetName()
│   ├── version.ts        # fetchLatestVersion(cdn)、normalizeTag()
│   ├── download.ts       # downloadFile(url, dest, hash?) 流式下载 + 进度条
│   ├── checksum.ts       # parseChecksumFile(text, assetName)
│   └── installer.ts      # install(cdn, force): 串起 platform→version→download→verify→rename
├── providers/
│   ├── specs.ts          # providerSpecs 数组（10 个），纯数据
│   ├── env-keys.ts       # providerEnvKeys 常量数组
│   ├── builders.ts       # 各 provider 的 env map 工厂（kimiCodeEnv 等）
│   └── configure.ts      # configureProvider()：交互 + 写盘
├── utils/
│   ├── paths.ts          # stateDir() = ~/.claude-code-cn；binPath()
│   ├── json-merge.ts     # mergeJSONFile(path, mutate)
│   └── errors.ts         # InterruptedError、UnsupportedPlatformError 等
└── types.ts              # 公共类型
```

## 6. 技术栈

| 维度 | 选择 |
|---|---|
| 语言 | TypeScript 5（`strict: true`） |
| Runtime 目标 | Node ≥ 18 |
| 模块体系 | ESM（`"type":"module"`） |
| CLI 解析 | `commander` |
| 交互 prompt | `@inquirer/prompts`（select/input/confirm） |
| 下载 | `node:fetch` + `node:stream/promises.pipeline` |
| 进度条 | `cli-progress` |
| 颜色 | `picocolors` |
| 校验 | `node:crypto` 内置（流式 SHA-256） |
| 构建 | `tsup`（一次出 ESM bundle + d.ts） |
| 测试 | `vitest` |
| Lint/Format | `biome` |
| 包管理 | `pnpm` |

`package.json` 关键字段：
```json
{
  "name": "@theopenbee/claude-code-cn",
  "type": "module",
  "bin": { "ccc": "./dist/cli.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "publishConfig": { "access": "public", "provenance": true }
}
```

## 7. 测试策略

| 模块 | 测试要点 |
|---|---|
| `platform.ts` | `mapArch`、`isMusl`（注入 fake glob/fs）、`buildAssetName`、`isSupported` 全枚举 |
| `version.ts` | 用 `vitest` 的 `vi.stubGlobal('fetch', ...)` mock 200/404、各种 tag_name |
| `checksum.ts` | 已知 fixture 文件，匹配/未匹配/空文件 |
| `installer.ts` | 端到端走临时目录 + httptest（用 `undici` 的 `MockAgent`）：完整下载、SHA 不匹配、checksums 404 时 fallback |
| `providers/builders.ts` | 每个 provider 工厂函数的 env map 快照（snapshot test）|
| `providers/configure.ts` | mock `@inquirer/prompts` 的导出函数，验证 IO 顺序与 json-merge |
| `utils/json-merge.ts` | 现有 JSON 损坏时覆盖；保留无关字段 |

覆盖率门槛：核心模块（platform/checksum/installer/builders/json-merge）≥ 85%。

## 8. CI / Release

`.github/workflows/ci.yml`（push & PR）：
- 触发：`push` 到任意分支、`pull_request`
- 矩阵：Node 18 / 20 / 22
- 步骤：`pnpm install --frozen-lockfile` → `pnpm biome check .` → `pnpm test` → `pnpm build`

`.github/workflows/release.yml`（自动发布）：
- 触发：`push` tag `v*`
- Permissions：`contents: read`、`id-token: write`（npm provenance 必需）
- 步骤：
  1. checkout
  2. setup-node 22 + setup-pnpm
  3. `pnpm install --frozen-lockfile`
  4. `pnpm build`
  5. `pnpm test`
  6. `pnpm publish --provenance --no-git-checks --access public`
- Secret：`NPM_TOKEN`（仓库 settings 配置）

本地发布脚本：`package.json` 加 `"release": "pnpm version patch && git push --follow-tags"`。

## 9. 仓库结构

```
.
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── docs/superpowers/specs/   # 本设计稿与后续 plan
├── src/                      # 见 §5
├── tests/                    # 与 src 平行的测试树，或就近写 *.test.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsup.config.ts
├── biome.json
├── vitest.config.ts
├── README.md
├── LICENSE
└── .gitignore
```

## 10. 错误处理

- 当前平台不支持：打印支持平台列表 + 手动安装提示 → 退出 1
- 下载失败（网络）：打印失败 URL 与错误，临时文件自动清理 → 退出 1
- 校验和文件 404：警告 + 跳过校验（与上游一致），继续安装
- 二进制 SHA256 不匹配：打印 expected/got，清理临时文件 → 退出 1
- 写 settings.json 时 JSON 损坏：警告 + 覆盖（与上游一致）
- Ctrl+C 中断 prompt：静默退出 0

## 11. 未来扩展（不在本期）

- `ccc upgrade`：自更新 npm 包
- `ccc status`：打印 claude 路径/版本、当前 settings.json 中的 provider
- Windows 支持（上游也尚未支持）
- 用 OS keychain 存 API Key（避免明文落盘）

## 附录 A — Provider 模型选项

- Aliyun (Qwen)：`qwen3.5-plus`（默认）/ `kimi-k2.5` / `glm-5` / `MiniMax-M2.5`
- Volcengine (Doubao)：`doubao-seed-2.0-code`（默认）/ `doubao-seed-2.0-pro` / `doubao-seed-2.0-lite` / `doubao-seed-code` / `minimax-m2.5` / `glm-4.7` / `deepseek-v3.2` / `kimi-k2.5`
- Tencent：`tc-code-latest（auto）`（默认）/ `hunyuan-2.0-instruct` / `hunyuan-2.0-thinking` / `minimax-m2.5` / `kimi-k2.5` / `glm-5` / `hunyuan-t1` / `hunyuan-turbos`
