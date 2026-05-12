import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mergeJSONFile } from './json-merge.js';

describe('mergeJSONFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'json-merge-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a new file when missing', async () => {
    const p = join(dir, 'a.json');
    await mergeJSONFile(p, (m) => {
      m.foo = 1;
    });
    const data = JSON.parse(readFileSync(p, 'utf8'));
    expect(data).toEqual({ foo: 1 });
  });

  it('merges into existing object preserving other keys', async () => {
    const p = join(dir, 'b.json');
    writeFileSync(p, JSON.stringify({ a: 1, b: 2 }));
    await mergeJSONFile(p, (m) => {
      m.b = 22;
      m.c = 3;
    });
    const data = JSON.parse(readFileSync(p, 'utf8'));
    expect(data).toEqual({ a: 1, b: 22, c: 3 });
  });

  it('overwrites when existing file has invalid JSON', async () => {
    const p = join(dir, 'c.json');
    writeFileSync(p, '{not json');
    await mergeJSONFile(p, (m) => {
      m.x = 1;
    });
    const data = JSON.parse(readFileSync(p, 'utf8'));
    expect(data).toEqual({ x: 1 });
  });

  it('writes pretty-printed JSON with trailing newline', async () => {
    const p = join(dir, 'd.json');
    await mergeJSONFile(p, (m) => {
      m.foo = 'bar';
    });
    const raw = readFileSync(p, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw).toContain('  "foo": "bar"');
  });
});
