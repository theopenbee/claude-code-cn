import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { install } from '../core/installer.js';
import { detectPlatform } from '../core/platform.js';
import { resolveCDN } from '../utils/cdn.js';
import { binDir, claudeBinPath, stateDir } from '../utils/paths.js';

export interface DownloadCliOptions {
  force?: boolean;
  cdnUrl?: string;
}

export async function runDownload(opts: DownloadCliOptions): Promise<void> {
  const cdn = resolveCDN(opts.cdnUrl);
  const dest = claudeBinPath();

  if (!opts.force && existsSync(dest)) {
    process.stdout.write(pc.green(`已安装: ${dest}\n`));
    process.stdout.write(pc.dim('使用 --force 重新下载\n'));
    return;
  }

  process.stdout.write(pc.dim(`使用 CDN: ${cdn}\n`));
  const path = await install({
    cdnBase: cdn,
    force: Boolean(opts.force),
    platform: detectPlatform(),
    stateDir: stateDir(),
  });
  process.stdout.write(pc.green(`Claude 已安装到: ${path}\n`));
  process.stdout.write(
    pc.dim(
      `请将 ${binDir()} 加入 PATH，例如:\n  export PATH="${binDir()}:$PATH"\n`,
    ),
  );
}
