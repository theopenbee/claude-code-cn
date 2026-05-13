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

## 支持平台

darwin-arm64 / darwin-x64 / linux-arm64 / linux-x64 / linux-arm64-musl / linux-x64-musl

Windows 暂不支持。

## License

MIT
