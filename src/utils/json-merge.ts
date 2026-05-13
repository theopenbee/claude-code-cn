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
