import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { downloadFile } from './download.js';

let server: Server;
let baseURL: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'content-length': '5' });
      res.end('hello');
    } else if (req.url === '/big') {
      const body = Buffer.alloc(1024 * 32, 0x41);
      res.writeHead(200, { 'content-length': String(body.length) });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end('nope');
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  baseURL = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe('downloadFile', () => {
  it('writes the body and updates the supplied hash', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dl-'));
    const dst = join(dir, 'out.bin');
    const h = createHash('sha256');
    await downloadFile(`${baseURL}/ok`, dst, h, { showProgress: false });
    expect(readFileSync(dst, 'utf8')).toBe('hello');
    expect(h.digest('hex')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects on non-2xx', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dl-'));
    const dst = join(dir, 'out.bin');
    await expect(
      downloadFile(`${baseURL}/missing`, dst, null, { showProgress: false }),
    ).rejects.toThrow(/404/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles binary bodies of nontrivial size', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dl-'));
    const dst = join(dir, 'out.bin');
    await downloadFile(`${baseURL}/big`, dst, null, { showProgress: false });
    expect(readFileSync(dst).length).toBe(1024 * 32);
    rmSync(dir, { recursive: true, force: true });
  });
});
