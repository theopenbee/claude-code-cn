import { createHash } from 'node:crypto';
import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises';
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

async function fetchChecksumText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function install(opts: InstallOptions): Promise<string> {
  const binDir = join(opts.stateDir, 'bin');
  const destPath = join(binDir, 'claude');

  if (!opts.force) {
    try {
      await stat(destPath);
      return destPath;
    } catch {}
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
  const tmpBinaryPath = `${destPath}.tmp`;

  let checksumText: string | null = null;
  try {
    checksumText = await fetchChecksumText(checksumURL);
  } catch (err) {
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

    if (checksumText) {
      process.stdout.write('正在校验 SHA-256...\n');
      const expected = parseChecksumFile(checksumText, assetName);
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
  }

  return destPath;
}
