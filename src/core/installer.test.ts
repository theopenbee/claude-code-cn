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

  it('throws on SHA-256 mismatch and cleans up the tmp file', async () => {
    // Set up a server whose binary body doesn't match the checksum file
    const badServer = createServer((req, res) => {
      if (req.url === '/claude-code-releases/latest.txt') {
        res.writeHead(200);
        res.end('1.2.3');
      } else if (req.url === '/claude-code-releases/1.2.3/checksums-sha256.txt') {
        // Claim a hash that won't match the body below
        res.writeHead(200);
        res.end('0000000000000000000000000000000000000000000000000000000000000000  claude-1.2.3-linux-x64\n');
      } else if (req.url === '/claude-code-releases/1.2.3/linux-x64/claude') {
        res.writeHead(200, { 'content-length': '5' });
        res.end('XXXXX');
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((r) => badServer.listen(0, r));
    const badCdn = `http://127.0.0.1:${(badServer.address() as AddressInfo).port}`;
    const stateDir = mkdtempSync(join(tmpdir(), 'inst-'));
    try {
      await expect(
        install({
          cdnBase: badCdn,
          force: false,
          platform: { os: 'linux', arch: 'x64', variant: '' },
          stateDir,
          showProgress: false,
        }),
      ).rejects.toThrow(/SHA-256 不匹配/);
      // The .tmp file should be cleaned up; destPath should not exist
      expect(() => statSync(join(stateDir, 'bin', 'claude'))).toThrow();
    } finally {
      badServer.close();
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  it('falls back to no-verify when checksums file is 404 and still installs', async () => {
    // Server that 404s the checksum file but serves a valid binary
    const partialServer = createServer((req, res) => {
      if (req.url === '/claude-code-releases/latest.txt') {
        res.writeHead(200);
        res.end('1.2.3');
      } else if (req.url === '/claude-code-releases/1.2.3/checksums-sha256.txt') {
        res.writeHead(404);
        res.end('nope');
      } else if (req.url === '/claude-code-releases/1.2.3/linux-x64/claude') {
        res.writeHead(200, { 'content-length': String(fakeBinary.length) });
        res.end(fakeBinary);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((r) => partialServer.listen(0, r));
    const partialCdn = `http://127.0.0.1:${(partialServer.address() as AddressInfo).port}`;
    const stateDir = mkdtempSync(join(tmpdir(), 'inst-'));
    try {
      const dest = await install({
        cdnBase: partialCdn,
        force: false,
        platform: { os: 'linux', arch: 'x64', variant: '' },
        stateDir,
        showProgress: false,
      });
      expect(readFileSync(dest)).toEqual(fakeBinary);
    } finally {
      partialServer.close();
      rmSync(stateDir, { recursive: true, force: true });
    }
  });
});
