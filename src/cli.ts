import { createRequire } from 'node:module';
import { Command } from 'commander';
import pc from 'picocolors';
import { runDownload } from './commands/download.js';
import { runEnv } from './commands/env.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();
program.name('ccc').description('Claude Code 中国大陆下载与配置工具').version(pkg.version);

program
  .command('download')
  .description('下载 Claude Code 二进制到 ~/.claude-code-cn/bin/claude')
  .option('--force', '已存在时也重新下载', false)
  .option('--cdn-url <url>', '覆盖默认 CDN 地址（默认 https://dl.theopenbee.cn）')
  .action(async (opts) => {
    await runDownload({ force: opts.force, cdnUrl: opts.cdnUrl });
  });

program
  .command('env')
  .description('交互式选择 Provider 并写入 ~/.claude/settings.json')
  .action(async () => {
    await runEnv();
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(pc.red(`错误: ${(err as Error).message}\n`));
  process.exit(1);
});
