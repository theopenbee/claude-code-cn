// src/core/installer.ts
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import { UnsupportedPlatformError } from '../utils/errors.js';
import { parseChecksumFile } from './checksum.js';
import { downloadFile } from './download.js';
import { type Platform, buildAssetName, isSupportedPlatform, platformString } from './platform.js';
import { fetchLatestVersion } from './version.js';

export interface InstallOptions {
  cdnBase: string;
  force: boolean;
  platform: Platform;
  stateDir: string;
  showProgress?: boolean;
}

export async function install(opts: InstallOptions): Promise<string> {
  const binDir = join(opts.stateDir, 'bin');
  const destPath = join(binDir, 'claude');

  if (!opts.force) {
    try {
      await stat(destPath);
      return destPath;
    } catch {
      // does not exist — continue
    }
  }

  if (!isSupportedPlatform(opts.platform)) {
    throw new UnsupportedPlatformError(opts.platform.os, opts.platform.arch);
  }

  await mkdir(binDir, { recursive: true });

  process.stdout.write('正在获取最新版本...\n');
  const version = await fetchLatestVersion(opts.cdnBase);
  const versionNum = version.replace(/^v/, '');
  process.stdout.write(`最新版本: ${version}\n`);

  const platStr = platformString(opts.platform);
  const base = `${opts.cdnBase}/claude-code-releases/${versionNum}`;
  const checksumURL = `${base}/checksums-sha256.txt`;
  const binaryURL = `${base}/${platStr}/claude`;
  const assetName = buildAssetName(opts.platform, version);

  const tmpDir = await mkdtemp(join(tmpdir(), 'claude-code-cn-'));
  const checksumPath = join(tmpDir, 'checksums-sha256.txt');
  const tmpBinaryPath = `${destPath}.tmp`;

  let checksumAvailable = true;
  try {
    await downloadFile(checksumURL, checksumPath, null, { showProgress: false });
  } catch (err) {
    checksumAvailable = false;
    process.stderr.write(
      pc.yellow(`warning: 无法下载 checksums-sha256.txt, 将跳过校验 (${(err as Error).message})\n`),
    );
  }

  process.stdout.write(`正在下载 Claude ${version} (${platStr})...\n`);
  const hash = createHash('sha256');
  try {
    await downloadFile(binaryURL, tmpBinaryPath, hash, {
      showProgress: opts.showProgress !== false,
      label: '下载中',
    });

    if (checksumAvailable) {
      process.stdout.write('正在校验 SHA-256...\n');
      const data = await readFile(checksumPath, 'utf8');
      const expected = parseChecksumFile(data, assetName);
      const actual = hash.digest('hex');
      if (actual !== expected) {
        throw new Error(`SHA-256 不匹配\n  expected: ${expected}\n  got:      ${actual}`);
      }
      process.stdout.write('SHA-256 校验通过。\n');
    }

    await chmod(tmpBinaryPath, 0o755);
    await rename(tmpBinaryPath, destPath);
  } catch (err) {
    await rm(tmpBinaryPath, { force: true });
    throw err;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  return destPath;
}
