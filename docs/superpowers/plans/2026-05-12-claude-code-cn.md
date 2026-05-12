# claude-code-cn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI `ccc` (npm package `@theopenbee/claude-code-cn`) that downloads Claude Code binaries from a mainland-China CDN and configures Claude Code providers, then publishes to npm via GitHub Actions on tag push.

**Architecture:** ESM Node CLI. `src/cli.ts` is the commander entry. Two subcommands (`download`, `env`) delegate to `src/commands/*`. Side-effect-free logic lives in `src/core/*` (platform detection, version fetch, file download, checksum verify, install orchestration) and `src/providers/*` (provider data + env builders + interactive configure). Utilities (paths, json-merge, errors) in `src/utils/*`. Streamed SHA-256 verification, `cli-progress` bar, atomic rename on install.

**Tech Stack:** TypeScript 5 (strict) · Node ≥18 · ESM · commander · @inquirer/prompts · cli-progress · picocolors · tsup · vitest · biome · pnpm. GitHub Actions for CI matrix + tag-triggered `pnpm publish --provenance`.

**Spec:** see `docs/superpowers/specs/2026-05-12-claude-code-cn-design.md`. Reference implementation in `/Users/tengyongzhi/work/bot-workspaces/openbee2/internal/ai/engine/claude/` (Go).

---

## File Map

| Path | Responsibility |
|---|---|
| `package.json` | npm manifest, bin entry `ccc`, scripts, deps |
| `tsconfig.json` | strict TS, NodeNext, ESM |
| `tsup.config.ts` | ESM bundle with shebang, dts |
| `vitest.config.ts` | vitest + coverage thresholds |
| `biome.json` | lint/format config |
| `.gitignore` | node_modules, dist, coverage |
| `.npmignore` | (optional, `files` whitelist preferred) |
| `README.md` | install + usage |
| `src/cli.ts` | shebang + commander program |
| `src/commands/download.ts` | `ccc download` handler |
| `src/commands/env.ts` | `ccc env` handler |
| `src/core/platform.ts` | platform detection & asset name |
| `src/core/version.ts` | fetch latest version from CDN `latest.txt` |
| `src/core/checksum.ts` | parse `checksums-sha256.txt` |
| `src/core/download.ts` | streaming HTTP download + progress + hash |
| `src/core/installer.ts` | orchestrate the whole download flow |
| `src/providers/env-keys.ts` | list of all anthropic env keys we manage |
| `src/providers/builders.ts` | one factory function per provider |
| `src/providers/specs.ts` | data table describing each provider's interactive flow |
| `src/providers/configure.ts` | interactive provider selection & write |
| `src/utils/paths.ts` | `~/.claude-code-cn` paths |
| `src/utils/json-merge.ts` | read/mutate/write JSON file |
| `src/utils/errors.ts` | `InterruptedError`, `UnsupportedPlatformError` |
| `src/utils/cdn.ts` | default CDN URL constant + resolver |
| `.github/workflows/ci.yml` | push/PR matrix |
| `.github/workflows/release.yml` | tag → npm publish |

Tests sit next to source as `*.test.ts`.

---

## Task 1: Repository scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `biome.json`
- Create: `vitest.config.ts`
- Create: `tsup.config.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@theopenbee/claude-code-cn",
  "version": "0.0.0",
  "description": "Claude Code 中国大陆下载与配置工具",
  "type": "module",
  "bin": { "ccc": "./dist/cli.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build && pnpm test",
    "release": "pnpm version patch && git push --follow-tags"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "cli-progress": "^3.12.0",
    "commander": "^12.1.0",
    "picocolors": "^1.0.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/cli-progress": "^3.11.6",
    "@types/node": "^22.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/theopenbee/claude-code-cn.git"
  },
  "license": "MIT",
  "keywords": ["claude", "claude-code", "anthropic", "china", "cdn"]
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules
dist
coverage
.DS_Store
*.log
.vitest-cache
.tsbuildinfo
```

- [ ] **Step 4: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "files": { "include": ["src/**/*.ts"] },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always" }
  },
  "organizeImports": { "enabled": true }
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/cli.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
```

- [ ] **Step 6: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: true,
  dts: false,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
});
```

- [ ] **Step 7: Install dependencies**

Run: `pnpm install`
Expected: lockfile created, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json .gitignore biome.json vitest.config.ts tsup.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold TS toolchain (tsup, vitest, biome, pnpm)"
```

---

## Task 2: Utility — paths

**Files:**
- Create: `src/utils/paths.ts`
- Create: `src/utils/paths.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/paths.test.ts
import { describe, expect, it, vi } from 'vitest';
import { binDir, claudeBinPath, claudeSettingsPath, claudeJsonPath, stateDir } from './paths.js';

describe('paths', () => {
  it('stateDir returns ~/.claude-code-cn', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(stateDir()).toBe('/tmp/test-home/.claude-code-cn');
    vi.unstubAllEnvs();
  });

  it('binDir returns stateDir/bin', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(binDir()).toBe('/tmp/test-home/.claude-code-cn/bin');
    vi.unstubAllEnvs();
  });

  it('claudeBinPath returns binDir/claude', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeBinPath()).toBe('/tmp/test-home/.claude-code-cn/bin/claude');
    vi.unstubAllEnvs();
  });

  it('claudeSettingsPath returns ~/.claude/settings.json', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeSettingsPath()).toBe('/tmp/test-home/.claude/settings.json');
    vi.unstubAllEnvs();
  });

  it('claudeJsonPath returns ~/.claude.json', () => {
    vi.stubEnv('HOME', '/tmp/test-home');
    expect(claudeJsonPath()).toBe('/tmp/test-home/.claude.json');
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm test src/utils/paths.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/utils/paths.ts
import { homedir } from 'node:os';
import { join } from 'node:path';

export function stateDir(): string {
  return join(homedir(), '.claude-code-cn');
}

export function binDir(): string {
  return join(stateDir(), 'bin');
}

export function claudeBinPath(): string {
  return join(binDir(), 'claude');
}

export function claudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

export function claudeJsonPath(): string {
  return join(homedir(), '.claude.json');
}
```

- [ ] **Step 4: Run test — verify passes**

Run: `pnpm test src/utils/paths.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/utils/paths.ts src/utils/paths.test.ts
git commit -m "feat(utils): add path helpers for ~/.claude-code-cn and ~/.claude"
```

---

## Task 3: Utility — errors

**Files:**
- Create: `src/utils/errors.ts`
- Create: `src/utils/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/errors.test.ts
import { describe, expect, it } from 'vitest';
import { InterruptedError, UnsupportedPlatformError } from './errors.js';

describe('errors', () => {
  it('InterruptedError carries name and message', () => {
    const e = new InterruptedError();
    expect(e.name).toBe('InterruptedError');
    expect(e.message).toBe('interrupted');
    expect(e).toBeInstanceOf(Error);
  });

  it('UnsupportedPlatformError reports os/arch', () => {
    const e = new UnsupportedPlatformError('win32', 'x64');
    expect(e.name).toBe('UnsupportedPlatformError');
    expect(e.message).toContain('win32');
    expect(e.message).toContain('x64');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm test src/utils/errors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/utils/errors.ts
export class InterruptedError extends Error {
  constructor() {
    super('interrupted');
    this.name = 'InterruptedError';
  }
}

export class UnsupportedPlatformError extends Error {
  constructor(
    public readonly os: string,
    public readonly arch: string,
  ) {
    super(
      `当前平台 (${os}/${arch}) 不支持 Claude Code 自动下载。\n` +
        '支持的平台: darwin-arm64, darwin-x64, linux-arm64, linux-x64, linux-arm64-musl, linux-x64-musl\n' +
        '请手动安装。',
    );
    this.name = 'UnsupportedPlatformError';
  }
}
```

- [ ] **Step 4: Run test — verify passes**

Run: `pnpm test src/utils/errors.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/utils/errors.ts src/utils/errors.test.ts
git commit -m "feat(utils): add InterruptedError and UnsupportedPlatformError"
```

---

## Task 4: Utility — json-merge

**Files:**
- Create: `src/utils/json-merge.ts`
- Create: `src/utils/json-merge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/json-merge.test.ts
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
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm test src/utils/json-merge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/utils/json-merge.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function mergeJSONFile(
  path: string,
  apply: (m: Record<string, unknown>) => void,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(path, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existing = parsed as Record<string, unknown>;
      }
    } catch {
      process.stderr.write(`warning: ${path} 不是合法 JSON, 将覆盖\n`);
    }
  } catch {
    // file missing — start fresh
  }
  apply(existing);
  const out = `${JSON.stringify(existing, null, 2)}\n`;
  await writeFile(path, out, 'utf8');
}
```

- [ ] **Step 4: Run test — verify passes**

Run: `pnpm test src/utils/json-merge.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/utils/json-merge.ts src/utils/json-merge.test.ts
git commit -m "feat(utils): add mergeJSONFile for safe JSON mutation"
```

---

## Task 5: Utility — CDN constant

**Files:**
- Create: `src/utils/cdn.ts`
- Create: `src/utils/cdn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/cdn.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_CDN_BASE, resolveCDN } from './cdn.js';

describe('resolveCDN', () => {
  it('returns user-provided URL when set', () => {
    expect(resolveCDN('https://mirror.example.com')).toBe('https://mirror.example.com');
  });

  it('falls back to default when empty', () => {
    expect(resolveCDN(undefined)).toBe(DEFAULT_CDN_BASE);
    expect(resolveCDN('')).toBe(DEFAULT_CDN_BASE);
  });

  it('strips trailing slash', () => {
    expect(resolveCDN('https://x.test/')).toBe('https://x.test');
  });

  it('DEFAULT_CDN_BASE is https://dl.theopenbee.cn', () => {
    expect(DEFAULT_CDN_BASE).toBe('https://dl.theopenbee.cn');
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/utils/cdn.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/utils/cdn.ts
export const DEFAULT_CDN_BASE = 'https://dl.theopenbee.cn';

export function resolveCDN(input: string | undefined): string {
  const v = (input ?? '').trim();
  if (!v) return DEFAULT_CDN_BASE;
  return v.replace(/\/+$/, '');
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/utils/cdn.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/utils/cdn.ts src/utils/cdn.test.ts
git commit -m "feat(utils): add CDN constant and resolver"
```

---

## Task 6: Core — platform detection

**Files:**
- Create: `src/core/platform.ts`
- Create: `src/core/platform.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/platform.test.ts
import { describe, expect, it } from 'vitest';
import {
  type Platform,
  buildAssetName,
  isMuslWith,
  isSupportedPlatform,
  mapArch,
  platformString,
} from './platform.js';

describe('mapArch', () => {
  it.each([
    ['x64', 'x64'],
    ['arm64', 'arm64'],
    ['ia32', 'ia32'],
  ])('maps %s -> %s', (input, want) => {
    expect(mapArch(input)).toBe(want);
  });
});

describe('isMuslWith', () => {
  it('true when glob returns matches', () => {
    expect(isMuslWith(() => ['/lib/ld-musl-x86_64.so.1'])).toBe(true);
  });
  it('false when no match', () => {
    expect(isMuslWith(() => [])).toBe(false);
  });
  it('false when glob throws', () => {
    expect(
      isMuslWith(() => {
        throw new Error('eperm');
      }),
    ).toBe(false);
  });
});

describe('isSupportedPlatform', () => {
  const supported: Platform[] = [
    { os: 'darwin', arch: 'arm64', variant: '' },
    { os: 'darwin', arch: 'x64', variant: '' },
    { os: 'linux', arch: 'arm64', variant: '' },
    { os: 'linux', arch: 'x64', variant: '' },
    { os: 'linux', arch: 'arm64', variant: 'musl' },
    { os: 'linux', arch: 'x64', variant: 'musl' },
  ];
  const unsupported: Platform[] = [
    { os: 'win32', arch: 'x64', variant: '' },
    { os: 'darwin', arch: 'ia32', variant: '' },
    { os: 'linux', arch: 'ia32', variant: '' },
    { os: 'darwin', arch: 'arm64', variant: 'musl' },
  ];
  it.each(supported)('supports %o', (p) => {
    expect(isSupportedPlatform(p)).toBe(true);
  });
  it.each(unsupported)('rejects %o', (p) => {
    expect(isSupportedPlatform(p)).toBe(false);
  });
});

describe('platformString', () => {
  it('os-arch when no variant', () => {
    expect(platformString({ os: 'darwin', arch: 'arm64', variant: '' })).toBe('darwin-arm64');
  });
  it('os-arch-variant when variant', () => {
    expect(platformString({ os: 'linux', arch: 'x64', variant: 'musl' })).toBe('linux-x64-musl');
  });
});

describe('buildAssetName', () => {
  it('claude-<ver>-<plat>', () => {
    expect(buildAssetName({ os: 'linux', arch: 'arm64', variant: 'musl' }, 'v1.2.3')).toBe(
      'claude-1.2.3-linux-arm64-musl',
    );
  });
  it('strips v prefix from version', () => {
    expect(buildAssetName({ os: 'darwin', arch: 'x64', variant: '' }, '1.2.3')).toBe(
      'claude-1.2.3-darwin-x64',
    );
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/core/platform.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/platform.ts
import { readdirSync } from 'node:fs';

export type SupportedOS = 'darwin' | 'linux';
export type Arch = string;

export interface Platform {
  os: string;
  arch: string;
  variant: '' | 'musl';
}

export function mapArch(arch: string): string {
  // Node 'x64' already matches the asset naming; keep this as a hook for future translations.
  return arch;
}

// Glob abstraction kept simple: caller supplies a function that returns matches
// for a pattern. The default scans /lib for ld-musl-*.so* without pulling in
// a glob library. Node 22's fs.glob is intentionally avoided for ≥18 compatibility.
export function isMuslWith(globFn: (pattern: string) => string[]): boolean {
  try {
    return globFn('/lib/ld-musl-*.so*').length > 0;
  } catch {
    return false;
  }
}

function defaultGlob(pattern: string): string[] {
  // Only the specific pattern '/lib/ld-musl-*.so*' is needed.
  if (pattern !== '/lib/ld-musl-*.so*') return [];
  const names = readdirSync('/lib');
  const re = /^ld-musl-.*\.so/;
  return names.filter((n) => re.test(n)).map((n) => `/lib/${n}`);
}

export function isMusl(): boolean {
  return isMuslWith(defaultGlob);
}

export function detectPlatform(): Platform {
  const os = process.platform;
  const arch = mapArch(process.arch);
  const variant: '' | 'musl' = os === 'linux' && isMusl() ? 'musl' : '';
  return { os, arch, variant };
}

const SUPPORTED = new Set<string>([
  'darwin|arm64|',
  'darwin|x64|',
  'linux|arm64|',
  'linux|x64|',
  'linux|arm64|musl',
  'linux|x64|musl',
]);

export function isSupportedPlatform(p: Platform): boolean {
  return SUPPORTED.has(`${p.os}|${p.arch}|${p.variant}`);
}

export function platformString(p: Platform): string {
  return p.variant ? `${p.os}-${p.arch}-${p.variant}` : `${p.os}-${p.arch}`;
}

export function buildAssetName(p: Platform, version: string): string {
  const ver = version.replace(/^v/, '');
  return `claude-${ver}-${platformString(p)}`;
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/core/platform.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/platform.ts src/core/platform.test.ts
git commit -m "feat(core): add platform detection and asset name builder"
```

---

## Task 7: Core — checksum parsing

**Files:**
- Create: `src/core/checksum.ts`
- Create: `src/core/checksum.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/checksum.test.ts
import { describe, expect, it } from 'vitest';
import { parseChecksumFile } from './checksum.js';

const sample = `
abc123  claude-1.2.3-darwin-arm64
deadbeef  claude-1.2.3-linux-x64
cafebabe  other-thing
`;

describe('parseChecksumFile', () => {
  it('returns the hash for the requested asset', () => {
    expect(parseChecksumFile(sample, 'claude-1.2.3-darwin-arm64')).toBe('abc123');
    expect(parseChecksumFile(sample, 'claude-1.2.3-linux-x64')).toBe('deadbeef');
  });

  it('throws when asset is not listed', () => {
    expect(() => parseChecksumFile(sample, 'claude-9.9.9-darwin-arm64')).toThrow(
      /未找到资产/,
    );
  });

  it('ignores blank and malformed lines', () => {
    const messy = '\n\n   \nbadline_without_two_fields\nfeed  claude-x';
    expect(parseChecksumFile(messy, 'claude-x')).toBe('feed');
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/core/checksum.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/checksum.ts
export function parseChecksumFile(content: string, assetName: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [hash, name] = parts;
    if (name === assetName) return hash as string;
  }
  throw new Error(`未找到资产 ${assetName}`);
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/core/checksum.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/core/checksum.ts src/core/checksum.test.ts
git commit -m "feat(core): add checksums-sha256.txt parser"
```

---

## Task 8: Core — version fetcher

**Files:**
- Create: `src/core/version.ts`
- Create: `src/core/version.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/version.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLatestVersion, normalizeTag } from './version.js';

describe('normalizeTag', () => {
  it('adds v prefix', () => {
    expect(normalizeTag('1.2.3')).toBe('v1.2.3');
  });
  it('keeps existing v', () => {
    expect(normalizeTag('v1.2.3')).toBe('v1.2.3');
  });
  it('trims whitespace', () => {
    expect(normalizeTag('  1.2.3\n')).toBe('v1.2.3');
  });
  it('throws on empty', () => {
    expect(() => normalizeTag('')).toThrow(/版本号为空/);
    expect(() => normalizeTag('   ')).toThrow(/版本号为空/);
  });
});

describe('fetchLatestVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches <cdn>/claude-code-releases/latest.txt and normalizes', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '1.2.3\n',
    }));
    vi.stubGlobal('fetch', fetchMock);
    const v = await fetchLatestVersion('https://cdn.test');
    expect(v).toBe('v1.2.3');
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/claude-code-releases/latest.txt');
  });

  it('throws on non-200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })),
    );
    await expect(fetchLatestVersion('https://cdn.test')).rejects.toThrow(/404/);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/core/version.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/version.ts
export function normalizeTag(tag: string): string {
  const t = tag.trim();
  if (!t) throw new Error('版本号为空');
  return t.startsWith('v') ? t : `v${t}`;
}

export async function fetchLatestVersion(cdnBase: string): Promise<string> {
  const url = `${cdnBase}/claude-code-releases/latest.txt`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`获取最新版本失败: ${url} 返回 ${res.status}`);
  }
  return normalizeTag(await res.text());
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/core/version.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/version.ts src/core/version.test.ts
git commit -m "feat(core): add latest version fetcher (CDN latest.txt)"
```

---

## Task 9: Core — streaming download

**Files:**
- Create: `src/core/download.ts`
- Create: `src/core/download.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/download.test.ts
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
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
    await expect(downloadFile(`${baseURL}/missing`, dst, null, { showProgress: false })).rejects.toThrow(/404/);
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
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/core/download.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/download.ts
import type { Hash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { Presets, SingleBar } from 'cli-progress';

export interface DownloadOptions {
  showProgress?: boolean;
  label?: string;
}

export async function downloadFile(
  url: string,
  destPath: string,
  hash: Hash | null,
  opts: DownloadOptions = {},
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`下载失败: ${url} (HTTP ${res.status})`);
  }

  const total = Number(res.headers.get('content-length') ?? 0);
  const bar =
    opts.showProgress !== false && total > 0
      ? new SingleBar(
          { format: `${opts.label ?? '下载中'} [{bar}] {percentage}% | {value}/{total} bytes` },
          Presets.shades_classic,
        )
      : null;
  bar?.start(total, 0);

  const file = createWriteStream(destPath);
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  let received = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (hash) hash.update(value);
      received += value.length;
      bar?.update(received);
      if (!file.write(Buffer.from(value))) {
        await once(file, 'drain');
      }
    }
  } catch (err) {
    file.destroy();
    throw err;
  } finally {
    bar?.stop();
  }
  await new Promise<void>((resolve, reject) => {
    file.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/core/download.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/core/download.ts src/core/download.test.ts
git commit -m "feat(core): streaming HTTP download with optional SHA-256 hash and progress bar"
```

---

## Task 10: Core — installer orchestrator

**Files:**
- Create: `src/core/installer.ts`
- Create: `src/core/installer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/installer.test.ts
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
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
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/core/installer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/installer.ts
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import { UnsupportedPlatformError } from '../utils/errors.js';
import { parseChecksumFile } from './checksum.js';
import { downloadFile } from './download.js';
import {
  type Platform,
  buildAssetName,
  isSupportedPlatform,
  platformString,
} from './platform.js';
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
      pc.yellow(
        `warning: 无法下载 checksums-sha256.txt, 将跳过校验 (${(err as Error).message})\n`,
      ),
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
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/core/installer.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/core/installer.ts src/core/installer.test.ts
git commit -m "feat(core): install orchestrator (version → download → verify → rename)"
```

---

## Task 11: Providers — env keys

**Files:**
- Create: `src/providers/env-keys.ts`
- Create: `src/providers/env-keys.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/providers/env-keys.test.ts
import { describe, expect, it } from 'vitest';
import { PROVIDER_ENV_KEYS } from './env-keys.js';

describe('PROVIDER_ENV_KEYS', () => {
  it('contains the 12 anthropic-related keys', () => {
    expect(PROVIDER_ENV_KEYS).toEqual([
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_MODEL',
      'ANTHROPIC_SMALL_FAST_MODEL',
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      'CLAUDE_CODE_SUBAGENT_MODEL',
      'ENABLE_TOOL_SEARCH',
      'API_TIMEOUT_MS',
      'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    ]);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/providers/env-keys.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/providers/env-keys.ts
export const PROVIDER_ENV_KEYS = [
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'ENABLE_TOOL_SEARCH',
  'API_TIMEOUT_MS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
] as const;

export type ProviderEnv = Record<string, string>;
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/providers/env-keys.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/env-keys.ts src/providers/env-keys.test.ts
git commit -m "feat(providers): list managed Claude env keys"
```

---

## Task 12: Providers — env builders

**Files:**
- Create: `src/providers/builders.ts`
- Create: `src/providers/builders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/providers/builders.test.ts
import { describe, expect, it } from 'vitest';
import {
  aliyunEnv,
  customEnv,
  deepseekEnv,
  glmEnv,
  kimiCodeEnv,
  mimoEnv,
  minimaxEnv,
  moonshotEnv,
  tencentEnv,
  volcengineEnv,
} from './builders.js';

describe('provider env builders', () => {
  it('kimiCodeEnv', () => {
    expect(kimiCodeEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
      ANTHROPIC_API_KEY: 'K',
      ENABLE_TOOL_SEARCH: 'false',
    });
  });

  it('moonshotEnv', () => {
    expect(moonshotEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'kimi-k2.5',
      ANTHROPIC_SMALL_FAST_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ENABLE_TOOL_SEARCH: 'false',
      API_TIMEOUT_MS: '600000',
    });
  });

  it('deepseekEnv', () => {
    expect(deepseekEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'deepseek-chat',
      ANTHROPIC_SMALL_FAST_MODEL: 'deepseek-chat',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '600000',
    });
  });

  it('glmEnv', () => {
    expect(glmEnv('K')).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5-turbo',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });

  it('minimaxEnv', () => {
    expect(minimaxEnv('K')).toEqual({
      ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'K',
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ANTHROPIC_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.7',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.7',
    });
  });

  it('aliyunEnv with selected model', () => {
    expect(aliyunEnv('K', 'qwen3.5-plus')).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_BASE_URL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      ANTHROPIC_MODEL: 'qwen3.5-plus',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });
  });

  it('volcengineEnv with selected model', () => {
    expect(volcengineEnv('K', 'doubao-seed-2.0-code')).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://ark.cn-beijing.volces.com/api/coding',
      ANTHROPIC_MODEL: 'doubao-seed-2.0-code',
    });
  });

  it('tencentEnv with selected model', () => {
    expect(tencentEnv('K', 'tc-code-latest（auto）')).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://api.lkeap.cloud.tencent.com/coding/anthropic',
      ANTHROPIC_MODEL: 'tc-code-latest（auto）',
    });
  });

  it('mimoEnv with user-provided baseURL', () => {
    expect(mimoEnv('K', 'https://mimo.example')).toEqual({
      ANTHROPIC_BASE_URL: 'https://mimo.example',
      ANTHROPIC_AUTH_TOKEN: 'K',
      ANTHROPIC_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'mimo-v2.5-pro',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '3000000',
    });
  });

  it('customEnv just wires baseURL + token', () => {
    expect(customEnv('K', 'https://custom.example')).toEqual({
      ANTHROPIC_BASE_URL: 'https://custom.example',
      ANTHROPIC_AUTH_TOKEN: 'K',
    });
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/providers/builders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/providers/builders.ts
import type { ProviderEnv } from './env-keys.js';

export function kimiCodeEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
    ANTHROPIC_API_KEY: apiKey,
    ENABLE_TOOL_SEARCH: 'false',
  };
}

export function moonshotEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: 'kimi-k2.5',
    ANTHROPIC_SMALL_FAST_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'kimi-k2.5',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2.5',
    CLAUDE_CODE_SUBAGENT_MODEL: 'kimi-k2.5',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ENABLE_TOOL_SEARCH: 'false',
    API_TIMEOUT_MS: '600000',
  };
}

export function deepseekEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: 'deepseek-chat',
    ANTHROPIC_SMALL_FAST_MODEL: 'deepseek-chat',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    API_TIMEOUT_MS: '600000',
  };
}

export function glmEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5-turbo',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
    API_TIMEOUT_MS: '3000000',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function minimaxEnv(apiKey: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    API_TIMEOUT_MS: '3000000',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.7',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.7',
  };
}

function standardEnv(baseURL: string, apiKey: string, model: string): ProviderEnv {
  return {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_MODEL: model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

export function aliyunEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://coding.dashscope.aliyuncs.com/apps/anthropic', apiKey, model);
}

export function volcengineEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://ark.cn-beijing.volces.com/api/coding', apiKey, model);
}

export function tencentEnv(apiKey: string, model: string): ProviderEnv {
  return standardEnv('https://api.lkeap.cloud.tencent.com/coding/anthropic', apiKey, model);
}

export function mimoEnv(apiKey: string, baseURL: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: 'mimo-v2.5-pro',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'mimo-v2.5-pro',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'mimo-v2.5-pro',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'mimo-v2.5-pro',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    API_TIMEOUT_MS: '3000000',
  };
}

export function customEnv(apiKey: string, baseURL: string): ProviderEnv {
  return {
    ANTHROPIC_BASE_URL: baseURL,
    ANTHROPIC_AUTH_TOKEN: apiKey,
  };
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/providers/builders.test.ts`
Expected: PASS, 10/10.

- [ ] **Step 5: Commit**

```bash
git add src/providers/builders.ts src/providers/builders.test.ts
git commit -m "feat(providers): add 10 env builders (KimiCode, Moonshot, DeepSeek, GLM, MiniMax, Aliyun, Volcengine, Tencent, Mimo, Custom)"
```

---

## Task 13: Providers — spec table

**Files:**
- Create: `src/providers/specs.ts`
- Create: `src/providers/specs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/providers/specs.test.ts
import { describe, expect, it } from 'vitest';
import { PROVIDER_SPECS, type ProviderSpec } from './specs.js';

describe('PROVIDER_SPECS', () => {
  it('lists 10 providers in the documented order', () => {
    expect(PROVIDER_SPECS.map((s) => s.name)).toEqual([
      'KimiCode',
      'Moonshot (Kimi)',
      'DeepSeek',
      'Zhipu (GLM)',
      'MiniMax',
      'Alibaba Cloud (Qwen)',
      'Volcengine (Doubao)',
      'Tencent Cloud',
      'Xiaomi Mimo',
      'Custom provider',
    ]);
  });

  it('marks NeedClaudeJSON correctly', () => {
    const map: Record<string, boolean> = Object.fromEntries(
      PROVIDER_SPECS.map((s) => [s.name, s.needClaudeJSON]),
    );
    expect(map['Zhipu (GLM)']).toBe(true);
    expect(map.MiniMax).toBe(true);
    expect(map['Volcengine (Doubao)']).toBe(true);
    expect(map['Tencent Cloud']).toBe(true);
    expect(map['Xiaomi Mimo']).toBe(true);
    expect(map.KimiCode).toBe(false);
    expect(map['Custom provider']).toBe(false);
  });

  it('Aliyun has model options with qwen3.5-plus default', () => {
    const s = PROVIDER_SPECS.find((x) => x.name === 'Alibaba Cloud (Qwen)') as ProviderSpec;
    expect(s.modelOptions).toEqual(['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5']);
    expect(s.modelDefault).toBe('qwen3.5-plus');
  });

  it('Mimo and Custom prompt for baseURL', () => {
    const mimo = PROVIDER_SPECS.find((x) => x.name === 'Xiaomi Mimo') as ProviderSpec;
    const custom = PROVIDER_SPECS.find((x) => x.name === 'Custom provider') as ProviderSpec;
    expect(mimo.baseURLPrompt).toBeTruthy();
    expect(custom.baseURLPrompt).toBeTruthy();
  });

  it('builds env via buildEnv', () => {
    const km = PROVIDER_SPECS.find((x) => x.name === 'KimiCode') as ProviderSpec;
    expect(km.buildEnv('K', '')).toMatchObject({ ANTHROPIC_API_KEY: 'K' });
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/providers/specs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/providers/specs.ts
import {
  aliyunEnv,
  customEnv,
  deepseekEnv,
  glmEnv,
  kimiCodeEnv,
  mimoEnv,
  minimaxEnv,
  moonshotEnv,
  tencentEnv,
  volcengineEnv,
} from './builders.js';
import type { ProviderEnv } from './env-keys.js';

export interface ProviderSpec {
  name: string;
  keyPrompt: string;
  baseURLPrompt?: string;
  modelOptions?: string[];
  modelDefault?: string;
  needClaudeJSON: boolean;
  buildEnv: (apiKey: string, modelOrBaseURL: string) => ProviderEnv;
}

export const PROVIDER_SPECS: readonly ProviderSpec[] = [
  {
    name: 'KimiCode',
    keyPrompt: '请输入 KimiCode API Key',
    needClaudeJSON: false,
    buildEnv: (k) => kimiCodeEnv(k),
  },
  {
    name: 'Moonshot (Kimi)',
    keyPrompt: '请输入 Moonshot API Key',
    needClaudeJSON: false,
    buildEnv: (k) => moonshotEnv(k),
  },
  {
    name: 'DeepSeek',
    keyPrompt: '请输入 DeepSeek API Key',
    needClaudeJSON: false,
    buildEnv: (k) => deepseekEnv(k),
  },
  {
    name: 'Zhipu (GLM)',
    keyPrompt: '请输入 智谱 GLM API Key',
    needClaudeJSON: true,
    buildEnv: (k) => glmEnv(k),
  },
  {
    name: 'MiniMax',
    keyPrompt: '请输入 MiniMax API Key',
    needClaudeJSON: true,
    buildEnv: (k) => minimaxEnv(k),
  },
  {
    name: 'Alibaba Cloud (Qwen)',
    keyPrompt: '请输入 阿里云百炼 API Key',
    modelOptions: ['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5'],
    modelDefault: 'qwen3.5-plus',
    needClaudeJSON: false,
    buildEnv: aliyunEnv,
  },
  {
    name: 'Volcengine (Doubao)',
    keyPrompt: '请输入 火山引擎 API Key',
    modelOptions: [
      'doubao-seed-2.0-code',
      'doubao-seed-2.0-pro',
      'doubao-seed-2.0-lite',
      'doubao-seed-code',
      'minimax-m2.5',
      'glm-4.7',
      'deepseek-v3.2',
      'kimi-k2.5',
    ],
    modelDefault: 'doubao-seed-2.0-code',
    needClaudeJSON: true,
    buildEnv: volcengineEnv,
  },
  {
    name: 'Tencent Cloud',
    keyPrompt: '请输入 腾讯云 API Key',
    modelOptions: [
      'tc-code-latest（auto）',
      'hunyuan-2.0-instruct',
      'hunyuan-2.0-thinking',
      'minimax-m2.5',
      'kimi-k2.5',
      'glm-5',
      'hunyuan-t1',
      'hunyuan-turbos',
    ],
    modelDefault: 'tc-code-latest（auto）',
    needClaudeJSON: true,
    buildEnv: tencentEnv,
  },
  {
    name: 'Xiaomi Mimo',
    keyPrompt: '请输入 小米 Mimo Token',
    baseURLPrompt: '请输入 小米 Mimo Base URL',
    needClaudeJSON: true,
    buildEnv: (k, baseURL) => mimoEnv(k, baseURL),
  },
  {
    name: 'Custom provider',
    keyPrompt: '请输入 自定义 Provider Token',
    baseURLPrompt: '请输入 自定义 Provider Base URL',
    needClaudeJSON: false,
    buildEnv: (k, baseURL) => customEnv(k, baseURL),
  },
];
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/providers/specs.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/providers/specs.ts src/providers/specs.test.ts
git commit -m "feat(providers): add interactive spec table for 10 providers"
```

---

## Task 14: Providers — configure (interactive)

**Files:**
- Create: `src/providers/configure.ts`
- Create: `src/providers/configure.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/providers/configure.test.ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

import { confirm, input, select } from '@inquirer/prompts';
import { configureProvider } from './configure.js';

const mockedSelect = vi.mocked(select);
const mockedInput = vi.mocked(input);
const mockedConfirm = vi.mocked(confirm);

let dir: string;
let settingsPath: string;
let claudeJsonPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cfg-'));
  settingsPath = join(dir, 'settings.json');
  claudeJsonPath = join(dir, 'claude.json');
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('configureProvider', () => {
  it('writes settings.json with KimiCode env when chosen', async () => {
    mockedSelect.mockResolvedValueOnce('KimiCode'); // provider
    mockedInput.mockResolvedValueOnce('KIMI_KEY'); // api key

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
      ANTHROPIC_API_KEY: 'KIMI_KEY',
    });
  });

  it('prompts for baseURL before key for Custom and writes both', async () => {
    mockedSelect.mockResolvedValueOnce('Custom provider');
    mockedInput
      .mockResolvedValueOnce('https://x.example') // baseURL prompted first
      .mockResolvedValueOnce('TOKEN'); // then key

    await configureProvider({ settingsPath, claudeJsonPath });

    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://x.example');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('TOKEN');
  });

  it('prompts model for Aliyun and writes claude.json when needed (GLM)', async () => {
    mockedSelect.mockResolvedValueOnce('Zhipu (GLM)');
    mockedInput.mockResolvedValueOnce('GLM_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });

    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const cjson = JSON.parse(readFileSync(claudeJsonPath, 'utf8'));
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(cjson.hasCompletedOnboarding).toBe(true);
  });

  it('removes stale provider env keys before writing', async () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: 'old-url',
          ANTHROPIC_API_KEY: 'old-key',
          UNRELATED: 'keep-me',
        },
      }),
    );
    // existing file → confirm("skip?") — answer no
    mockedConfirm.mockResolvedValueOnce(false);
    mockedSelect.mockResolvedValueOnce('DeepSeek');
    mockedInput.mockResolvedValueOnce('DS_KEY');

    await configureProvider({ settingsPath, claudeJsonPath });
    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.UNRELATED).toBe('keep-me');
    expect(out.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
    expect(out.env.ANTHROPIC_AUTH_TOKEN).toBe('DS_KEY');
    expect(out.env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('skips when user confirms skip', async () => {
    writeFileSync(settingsPath, JSON.stringify({ env: { ANTHROPIC_API_KEY: 'keep' } }));
    mockedConfirm.mockResolvedValueOnce(true);

    await configureProvider({ settingsPath, claudeJsonPath });
    const out = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(out.env.ANTHROPIC_API_KEY).toBe('keep');
    expect(mockedSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm test src/providers/configure.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/providers/configure.ts
import { existsSync } from 'node:fs';
import { confirm, input, select } from '@inquirer/prompts';
import { InterruptedError } from '../utils/errors.js';
import { mergeJSONFile } from '../utils/json-merge.js';
import { PROVIDER_ENV_KEYS, type ProviderEnv } from './env-keys.js';
import { PROVIDER_SPECS, type ProviderSpec } from './specs.js';

export interface ConfigureOptions {
  settingsPath: string;
  claudeJsonPath: string;
}

function isInterrupt(err: unknown): boolean {
  // @inquirer/prompts throws ExitPromptError on Ctrl+C
  return (err as { name?: string } | null)?.name === 'ExitPromptError';
}

async function ask<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isInterrupt(err)) throw new InterruptedError();
    throw err;
  }
}

export async function configureProvider(opts: ConfigureOptions): Promise<void> {
  if (existsSync(opts.settingsPath)) {
    const skip = await ask(() =>
      confirm({ message: '已检测到现有 ~/.claude/settings.json，是否跳过？', default: true }),
    );
    if (skip) return;
  }

  const providerName = await ask(() =>
    select({
      message: '请选择 Provider',
      choices: PROVIDER_SPECS.map((s) => ({ name: s.name, value: s.name })),
    }),
  );
  const spec = PROVIDER_SPECS.find((s) => s.name === providerName) as ProviderSpec;

  let baseURL = '';
  if (spec.baseURLPrompt) {
    baseURL = await ask(() => input({ message: spec.baseURLPrompt as string }));
  }

  const apiKey = await ask(() => input({ message: spec.keyPrompt }));

  let secondArg = '';
  if (spec.modelOptions && spec.modelOptions.length > 0) {
    secondArg = await ask(() =>
      select({
        message: '请选择模型',
        choices: (spec.modelOptions as string[]).map((m) => ({ name: m, value: m })),
        default: spec.modelDefault,
      }),
    );
  } else if (baseURL) {
    secondArg = baseURL;
  }

  const env: ProviderEnv = spec.buildEnv(apiKey, secondArg);

  await mergeJSONFile(opts.settingsPath, (m) => {
    const current = (m.env as Record<string, unknown> | undefined) ?? {};
    for (const k of PROVIDER_ENV_KEYS) delete current[k];
    for (const [k, v] of Object.entries(env)) current[k] = v;
    m.env = current;
  });

  if (spec.needClaudeJSON) {
    await mergeJSONFile(opts.claudeJsonPath, (m) => {
      m.hasCompletedOnboarding = true;
    });
  }
}
```

- [ ] **Step 4: Run — verify passes**

Run: `pnpm test src/providers/configure.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/providers/configure.ts src/providers/configure.test.ts
git commit -m "feat(providers): interactive provider configure with stale-key cleanup"
```

---

## Task 15: Command — download

**Files:**
- Create: `src/commands/download.ts`

- [ ] **Step 1: Implement**

```ts
// src/commands/download.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/download.ts
git commit -m "feat(commands): wire download flow with PATH hint"
```

---

## Task 16: Command — env

**Files:**
- Create: `src/commands/env.ts`

- [ ] **Step 1: Implement**

```ts
// src/commands/env.ts
import pc from 'picocolors';
import { configureProvider } from '../providers/configure.js';
import { InterruptedError } from '../utils/errors.js';
import { claudeJsonPath, claudeSettingsPath } from '../utils/paths.js';

export async function runEnv(): Promise<void> {
  try {
    await configureProvider({
      settingsPath: claudeSettingsPath(),
      claudeJsonPath: claudeJsonPath(),
    });
    process.stdout.write(pc.green(`已写入 ${claudeSettingsPath()}\n`));
  } catch (err) {
    if (err instanceof InterruptedError) {
      process.stdout.write(pc.dim('已取消\n'));
      return;
    }
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/env.ts
git commit -m "feat(commands): wire env flow with Ctrl+C handling"
```

---

## Task 17: CLI entry

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement**

```ts
// src/cli.ts
import { Command } from 'commander';
import pc from 'picocolors';
import { runDownload } from './commands/download.js';
import { runEnv } from './commands/env.js';

const program = new Command();
program
  .name('ccc')
  .description('Claude Code 中国大陆下载与配置工具')
  .version('0.0.0');

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
```

- [ ] **Step 2: Build and smoke-test**

Run: `pnpm build && node dist/cli.js --help`
Expected: prints help with `download` and `env` subcommands.

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): commander entry with download/env subcommands"
```

---

## Task 18: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace contents**

```markdown
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
ccc download        # 下载到 ~/.claude-code-cn/bin/claude
ccc download --force                # 已存在也重新下载
ccc download --cdn-url <url>        # 覆盖 CDN

ccc env             # 交互式选择 Provider 并写入 ~/.claude/settings.json
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with usage and platform support"
```

---

## Task 19: GitHub Actions — CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ['18', '20', '22']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI matrix (Node 18/20/22) for lint, test, build"
```

---

## Task 20: GitHub Actions — Release

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - run: pnpm publish --provenance --no-git-checks --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add tag-triggered npm publish workflow with provenance"
```

---

## Task 21: End-to-end smoke test on host

**Files:** none (manual verification)

- [ ] **Step 1: Build & link**

```bash
pnpm build
pnpm link --global
```

- [ ] **Step 2: Verify `ccc --help` shows both subcommands**

Run: `ccc --help`
Expected: text mentions `download` and `env`.

- [ ] **Step 3: Run `ccc download --cdn-url https://dl.theopenbee.cn` (or a test mirror)**

Expected:
- prints version
- progress bar shows
- SHA-256 verified
- binary lands at `~/.claude-code-cn/bin/claude`
- PATH hint printed

If the CDN happens to be unreachable from the test environment, run a local httptest mirror serving the three fixtures from Task 10's test and pass `--cdn-url` to it.

- [ ] **Step 4: Run `ccc env`, pick KimiCode, type a dummy key, verify settings**

Run: `ccc env`
Expected: prompts run, `~/.claude/settings.json` contains the KimiCode env block.

(Backup your real `~/.claude/settings.json` first if you use Claude Code daily.)

- [ ] **Step 5: Unlink**

```bash
pnpm unlink --global @theopenbee/claude-code-cn
```

- [ ] **Step 6: No commit needed (manual verification only). Record results in PR description.**

---

## Task 22: First release

**Files:** none (operational)

- [ ] **Step 1: Configure repository secret**

In GitHub repository settings → Secrets → Actions, add `NPM_TOKEN` (Granular Token with publish access for `@theopenbee` scope).

- [ ] **Step 2: Set initial version**

```bash
pnpm version 0.1.0 --no-git-tag-version
git add package.json
git commit -m "chore(release): 0.1.0"
git tag v0.1.0
```

- [ ] **Step 3: Push**

```bash
git push origin main
git push origin v0.1.0
```

Expected: GH Actions `Release` workflow runs and publishes `@theopenbee/claude-code-cn@0.1.0`.

- [ ] **Step 4: Verify on npm**

```bash
npm view @theopenbee/claude-code-cn version
```

Expected: `0.1.0`.

---

## Self-Review Notes (for the executor)

Final pass before declaring done:

- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and ensure all green.
- Run `node dist/cli.js download --help` and `node dist/cli.js env --help` and confirm flags/descriptions match this plan.
- Confirm `dist/cli.js` starts with `#!/usr/bin/env node`.
- Confirm `package.json` `files` excludes `src` and includes `dist`.
- Confirm coverage thresholds in `vitest.config.ts` are met by `pnpm test --coverage`.
