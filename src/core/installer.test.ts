// src/core/installer.test.ts
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { install } from './installer.js';

const fakeBinary = Buffer.from('FAKE_CLAUDE_BINARY_BODY');
const fakeHash = createHash('sha256').update(fakeBinary).digest('hex');
const platformAssetName = 'claude-1.2.3-linux-x64';
const checksumsBody = `${fakeHash}  ${platformAssetName}\n`;

let server: Server;
let cdn: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/claude-code-releases/latest.txt') {
      res.writeHead(200);
      res.end('1.2.3');
    } else if (req.url === '/claude-code-releases/1.2.3/checksums-sha256.txt') {
      res.writeHead(200);
      res.end(checksumsBody);
    } else if (req.url === '/claude-code-releases/1.2.3/linux-x64/claude') {
      res.writeHead(200, { 'content-length': String(fakeBinary.length) });
      res.end(fakeBinary);
    } else {
      res.writeHead(404);
      res.end('nope');
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  cdn = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

describe('install', () => {
  it('downloads, verifies, chmods and renames to destPath', async () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'inst-'));
    const dest = await install({
      cdnBase: cdn,
      force: false,
      platform: { os: 'linux', arch: 'x64', variant: '' },
      stateDir,
      showProgress: false,
    });
    expect(dest).toBe(join(stateDir, 'bin', 'claude'));
    expect(readFileSync(dest)).toEqual(fakeBinary);
    // mode includes execute bit
    expect(statSync(dest).mode & 0o111).not.toBe(0);
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('skips when binary exists and force=false', async () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'inst-'));
    const dest = join(stateDir, 'bin', 'claude');
    // pre-create
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(stateDir, 'bin'), { recursive: true });
    writeFileSync(dest, 'preexisting');
    const out = await install({
      cdnBase: cdn,
      force: false,
      platform: { os: 'linux', arch: 'x64', variant: '' },
      stateDir,
      showProgress: false,
    });
    expect(out).toBe(dest);
    expect(readFileSync(dest, 'utf8')).toBe('preexisting');
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('throws UnsupportedPlatformError on unsupported platform', async () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'inst-'));
    await expect(
      install({
        cdnBase: cdn,
        force: false,
        platform: { os: 'win32', arch: 'x64', variant: '' },
        stateDir,
        showProgress: false,
      }),
    ).rejects.toThrow(/win32/);
    rmSync(stateDir, { recursive: true, force: true });
  });
});
