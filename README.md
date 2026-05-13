# @theopenbee/claude-code-cn

Claude Code 中国大陆下载与配置工具。

- 默认从大陆 CDN 下载二进制（`https://dl.theopenbee.cn`）
- 交互式配置 10 个国内 Provider（KimiCode / Moonshot / DeepSeek / GLM / MiniMax / 阿里云 / 火山引擎 / 腾讯云 / 小米 Mimo / 自定义）

## 安装

```bash
npm i -g @theopenbee/claude-code-cn
# 或者
pnpm add -g @theopenbee/claude-code-cn
```

## 使用

```bash
ccc download                        # 下载到 ~/.claude-code-cn/bin/claude
ccc download --force                # 已存在也重新下载
ccc download --cdn-url <url>        # 覆盖 CDN

ccc env                             # 交互式选择 Provider 并写入 ~/.claude/settings.json
```

下载完成后，请将 `~/.claude-code-cn/bin` 加入你的 `PATH`：

```bash
export PATH="$HOME/.claude-code-cn/bin:$PATH"
```

## 支持的 Provider 与模型

`ccc env` 内置以下 Provider，选择后会自动写入对应的 `ANTHROPIC_BASE_URL` / 模型环境变量到 `~/.claude/settings.json`。

| Provider | 计费方式 / BaseURL | 可选模型 | 文档 |
| --- | --- | --- | --- |
| KimiCode | `https://api.kimi.com/coding/` | 由服务端路由（无需选择） | [文档](https://www.kimi.com/code/docs/third-party-tools/other-coding-agents.html) |
| Moonshot (Kimi) | `https://api.moonshot.cn/anthropic` | `kimi-k2.5` | [文档](https://platform.kimi.com/docs/guide/agent-support) |
| DeepSeek | `https://api.deepseek.com/anthropic` | `deepseek-v4-pro[1m]`（主）+ `deepseek-v4-flash`（haiku/subagent） | [文档](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/claude_code) |
| Zhipu (GLM) | `https://open.bigmodel.cn/api/anthropic` | `glm-5.1` | [文档](https://docs.bigmodel.cn/cn/coding-plan/tool/claude) |
| MiniMax | `https://api.minimaxi.com/anthropic` | `MiniMax-M2.7` | [文档](https://platform.minimaxi.com/docs/token-plan/claude-code) |
| 阿里云百炼 (Qwen) | Token Plan 团队版 | `qwen3.6-plus`、`qwen3.6-flash`、`deepseek-v4-pro`、`deepseek-v4-flash`、`deepseek-v3.2`、`kimi-k2.6`、`kimi-k2.5`、`glm-5.1`、`glm-5`、`MiniMax-M2.5` | [文档](https://help.aliyun.com/zh/model-studio/claude-code) |
|  | Coding Plan | `qwen3.6-plus`、`kimi-k2.5`、`glm-5`、`MiniMax-M2.5` |  |
|  | 按量计费 | `qwen3.6-max-preview`、`qwen3.6-plus(-2026-04-02)`、`qwen3.6-flash(-2026-04-16)`、`deepseek-v4-pro`、`deepseek-v4-flash`、`deepseek-v3.2`、`kimi-k2.6`、`kimi-k2.5`、`kimi-k2-thinking`、`glm-5.1`、`glm-5`、`glm-4.7`、`glm-4.6`、`MiniMax-M2.5`、`MiniMax-M2.1` |  |
| 火山引擎 (Doubao) | `https://ark.cn-beijing.volces.com/api/coding` | `doubao-seed-2.0-code`、`doubao-seed-2.0-pro`、`doubao-seed-2.0-lite`、`doubao-seed-code`、`minimax-latest`、`glm-5.1`、`deepseek-v3.2`、`kimi-k2.6` | [文档](https://www.volcengine.com/docs/82379/1928262?lang=zh) |
| 腾讯云 | Coding Plan | `tc-code-latest(auto)`、`hunyuan-2.0-instruct`、`hunyuan-2.0-thinking`、`minimax-m2.5`、`kimi-k2.5`、`glm-5`、`hunyuan-t1`、`hunyuan-turbos` | [文档](https://cloud.tencent.com/document/product/1823/130070) |
|  | Token Plan 企业版 | `deepseek-v4-pro`、`deepseek-v4-flash`、`glm-5.1`、`glm-5`、`kimi-k2.6`、`kimi-k2.5`、`minimax-m2.7`、`minimax-m2.5` |  |
|  | Token Plan 个人版 | `glm-5.1`、`glm-5`、`kimi-k2.5`、`minimax-m2.7`、`minimax-m2.5` |  |
| 小米 Mimo | 按量付费 / Token Plan | `mimo-v2.5-pro`、`mimo-v2.5-pro[1m]`、`mimo-v2.5`、`mimo-v2.5[1m]`、`mimo-v2-flash` | [文档](https://platform.xiaomimimo.com/docs/zh-CN/integration/claudecode) |
| 自定义 Provider | 自行填写 BaseURL | 由服务端决定 | — |

> 模型列表会随上游迭代变化，以 `ccc env` 交互菜单实际显示为准。

## 支持平台

darwin-arm64 / darwin-x64 / linux-arm64 / linux-x64 / linux-arm64-musl / linux-x64-musl

Windows 暂不支持。

## License

MIT
